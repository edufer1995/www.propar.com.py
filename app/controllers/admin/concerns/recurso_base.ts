/*
|--------------------------------------------------------------------------
| Motor CRUD genérico del admin
|--------------------------------------------------------------------------
|
| Base común de todos los recursos del admin: index con paginación, orden
| y búsqueda server-side, store/update con validación VineJS por recurso,
| destroy individual y masivo, y export CSV respetando los filtros.
|
| Cada recurso extiende esta clase y aporta:
|  - config: modelo, página Inertia, columnas de búsqueda/orden, imágenes
|  - validar(ctx): payload validado y MAPEADO a columnas del modelo
|  - serializar(fila): DTO para la tabla del frontend
|  - csv(): encabezados + fila para la exportación
|
| Campos imagen: el cliente sube ANTES por POST /api/uploads (que valida
| formato/peso/dimensiones según la spec) y acá solo llega el id del
| upload. La base verifica que exista y que su spec coincida, y se ocupa
| de borrar el archivo viejo al reemplazar y todos al eliminar la fila.
| Convención del payload: campo NO enviado = sin cambios; null = quitar.
|
*/

import { DateTime } from 'luxon'
import { errors as vineErrors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import type { LucidModel, LucidRow, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

import UploadService from '#services/upload_service'
import { construirCsv, type CeldaCsv } from '#controllers/admin/concerns/csv'
import {
  eliminarUploads,
  idsImagenesDeFila,
  resolverGalerias,
  resolverImagenes,
  type CampoGaleria,
  type CampoImagen,
} from '#controllers/admin/concerns/imagenes_recurso'
import {
  DOCUMENTO_SPECS,
  IMAGEN_SPECS,
  VIDEO_SPECS,
  describirDocumentoSpec,
  describirSpec,
  describirVideoSpec,
  type NombreDocumentoSpec,
  type NombreVideoSpec,
} from '#validators/rules/imagen_specs'

export type { CampoGaleria, CampoImagen }

/** Tamaños de página permitidos (el primero es el default) */
const TAMANOS_PAGINA = [10, 25, 50] as const

export interface ConfigRecurso {
  modelo: LucidModel
  /** Componente Inertia del index (ej. 'admin/recursos/sucursales') */
  pagina: string
  /** Slug para el nombre del archivo CSV (ej. 'sucursales') */
  recurso: string
  /** Nombre legible singular + género para los mensajes flash */
  nombre: string
  genero: 'f' | 'm'
  /** Columnas (snake_case) sobre las que busca ?q= */
  busquedaEn: string[]
  /** Claves de orden expuestas → columna real (snake_case) */
  ordenables: Record<string, string>
  ordenDefault: { sort: string; order: 'asc' | 'desc' }
  camposImagen?: CampoImagen[]
  /** Galerías múltiples (columna jsonb con array ordenado de upload ids) */
  camposGaleria?: CampoGaleria[]
  /** Relaciones a precargar en index/export (ej. 'imagen') */
  precargar?: string[]
}

export default abstract class RecursoController<Fila extends LucidRow = LucidRow> {
  /** Sin dependencias propias: se instancia directo (mismo patrón que los tests) */
  protected uploadService = new UploadService()

  protected abstract config: ConfigRecurso

  /** DTO de una fila para la tabla del admin */
  protected abstract serializar(fila: Fila): Record<string, unknown>

  /**
   * Valida el request (VineJS) y devuelve los valores YA mapeados a
   * columnas del modelo (sin los campos imagen, que maneja la base).
   */
  protected abstract validar(ctx: HttpContext): Promise<Record<string, unknown>>

  /** Definición de la exportación CSV */
  protected abstract csv(): {
    encabezados: string[]
    fila: (fila: Fila) => CeldaCsv[]
  }

  /** Filtros extra del recurso (ej. leads por tipo) */
  protected filtrar(
    _query: ModelQueryBuilderContract<LucidModel, LucidRow>,
    _ctx: HttpContext
  ): void {}

  /** Props adicionales del index (ej. opciones de un filtro) */
  protected async propsExtra(_ctx: HttpContext): Promise<Record<string, unknown>> {
    return {}
  }

  /**
   * Hook async previo a serializar la página actual (y el export):
   * permite resolver datos en lote (ej. URLs de una galería) que
   * serializar() usa de forma síncrona.
   */
  protected async antesDeSerializar(_filas: Fila[]): Promise<void> {}

  /* ------------------------------------------------------------------ */
  /* Index                                                              */
  /* ------------------------------------------------------------------ */

  async index(ctx: HttpContext) {
    const { request, inertia } = ctx
    const pagina = Math.max(1, this.#entero(request.input('page'), 1))
    const porPagina = TAMANOS_PAGINA.includes(this.#entero(request.input('perPage'), 0) as never)
      ? this.#entero(request.input('perPage'), TAMANOS_PAGINA[0])
      : TAMANOS_PAGINA[0]

    const paginado = await this.#consulta(ctx).paginate(pagina, porPagina)
    await this.antesDeSerializar(paginado.all() as Fila[])

    /**
     * El motor es genérico: el nombre de página llega por config y los
     * props los define cada recurso, así que acá no aplica el tipado
     * estático página→props del codegen (se castea a propósito).
     */
    return inertia.render(
      this.config.pagina as never,
      {
        registros: {
          data: paginado.all().map((fila) => this.serializar(fila as Fila)),
          meta: {
            total: paginado.total,
            porPagina: paginado.perPage,
            pagina: paginado.currentPage,
            ultimaPagina: paginado.lastPage,
          },
        },
        specs: this.#specsCliente(),
        ...(await this.propsExtra(ctx)),
      } as never
    )
  }

  /* ------------------------------------------------------------------ */
  /* Export CSV (mismos filtros que el index, sin paginar)              */
  /* ------------------------------------------------------------------ */

  async export(ctx: HttpContext) {
    const { response } = ctx
    const filas = await this.#consulta(ctx)
    await this.antesDeSerializar(filas as unknown as Fila[])
    const definicion = this.csv()

    const contenido = construirCsv(
      definicion.encabezados,
      filas.map((fila) => definicion.fila(fila as Fila))
    )

    const fecha = DateTime.now().setZone('America/Asuncion').toISODate()
    response.header('content-type', 'text/csv; charset=utf-8')
    response.header(
      'content-disposition',
      `attachment; filename="${this.config.recurso}_${fecha}.csv"`
    )
    return response.send(contenido)
  }

  /* ------------------------------------------------------------------ */
  /* Store / Update                                                     */
  /* ------------------------------------------------------------------ */

  async store(ctx: HttpContext) {
    const datos = await this.validar(ctx)
    const imagenes = await this.#resolverCamposImagen(ctx, null)

    const fila = new this.config.modelo()
    fila.merge({ ...datos, ...imagenes.columnas })
    await fila.save()

    ctx.session.flash('success', this.#mensaje('creado'))
    return ctx.response.redirect().back()
  }

  async update(ctx: HttpContext) {
    const fila = await this.config.modelo.findOrFail(ctx.params.id)
    const datos = await this.validar(ctx)
    const imagenes = await this.#resolverCamposImagen(ctx, fila)

    fila.merge({ ...datos, ...imagenes.columnas })
    await fila.save()

    // Recién tras guardar se borran los archivos reemplazados/quitados
    await eliminarUploads(this.uploadService, imagenes.eliminar)

    ctx.session.flash('success', this.#mensaje('actualizado'))
    return ctx.response.redirect().back()
  }

  /* ------------------------------------------------------------------ */
  /* Destroy individual y masivo                                        */
  /* ------------------------------------------------------------------ */

  async destroy(ctx: HttpContext) {
    const fila = await this.config.modelo.findOrFail(ctx.params.id)
    await this.#eliminarFila(fila)

    ctx.session.flash('success', this.#mensaje('eliminado'))
    return ctx.response.redirect().back()
  }

  async destroyMasivo(ctx: HttpContext) {
    const ids = this.#idsDelRequest(ctx)
    const filas = await this.config.modelo.query().whereIn('id', ids)

    for (const fila of filas) {
      await this.#eliminarFila(fila)
    }

    ctx.session.flash(
      'success',
      filas.length === 1
        ? this.#mensaje('eliminado')
        : `${filas.length} registros eliminados correctamente`
    )
    return ctx.response.redirect().back()
  }

  /* ------------------------------------------------------------------ */
  /* Internos                                                           */
  /* ------------------------------------------------------------------ */

  /** Query con búsqueda + filtros + orden (compartida por index y export) */
  #consulta(ctx: HttpContext) {
    const { request } = ctx
    const q = String(request.input('q') ?? '').trim()
    const sortPedido = String(request.input('sort') ?? '')
    const sort = this.config.ordenables[sortPedido] ? sortPedido : this.config.ordenDefault.sort
    const order =
      request.input('order') === 'asc' || request.input('order') === 'desc'
        ? (request.input('order') as 'asc' | 'desc')
        : this.config.ordenDefault.order

    const query = this.config.modelo.query()
    for (const relacion of this.config.precargar ?? []) {
      query.preload(relacion as never)
    }
    this.filtrar(query, ctx)

    if (q) {
      query.where((sub) => {
        for (const columna of this.config.busquedaEn) {
          // CAST a texto: permite buscar también en columnas numéricas
          sub.orWhereRaw('CAST(?? AS TEXT) ILIKE ?', [columna, `%${q}%`])
        }
      })
    }

    // Desempate por id para que la paginación sea estable
    return query.orderBy(this.config.ordenables[sort], order).orderBy('id', 'asc')
  }

  /** Specs de imagen que la página necesita (requisitos para el uploader) */
  #specsCliente() {
    const specs: Record<string, unknown> = {}
    for (const campo of [
      ...(this.config.camposImagen ?? []),
      ...(this.config.camposGaleria ?? []),
    ]) {
      if (campo.spec in VIDEO_SPECS) {
        const spec = VIDEO_SPECS[campo.spec as NombreVideoSpec]
        specs[campo.spec] = { ...spec, texto: describirVideoSpec(spec) }
        continue
      }
      if (campo.spec in DOCUMENTO_SPECS) {
        const spec = DOCUMENTO_SPECS[campo.spec as NombreDocumentoSpec]
        specs[campo.spec] = { ...spec, texto: describirDocumentoSpec(spec) }
        continue
      }
      const spec = IMAGEN_SPECS[campo.spec as keyof typeof IMAGEN_SPECS]
      specs[campo.spec] = { ...spec, texto: describirSpec(spec) }
    }
    return specs
  }

  /**
   * Resuelve los campos imagen + galería del payload (helpers de
   * imagenes_recurso). Devuelve las columnas a asignar y los uploads que
   * hay que borrar DESPUÉS de guardar.
   */
  async #resolverCamposImagen(ctx: HttpContext, filaExistente: LucidRow | null) {
    const simples = await resolverImagenes(ctx, this.config.camposImagen ?? [], filaExistente)
    const galerias = await resolverGalerias(ctx, this.config.camposGaleria ?? [], filaExistente)
    return {
      columnas: { ...simples.columnas, ...galerias.columnas },
      eliminar: [...simples.eliminar, ...galerias.eliminar],
    }
  }

  /** Borra la fila y luego sus imágenes asociadas (archivo + fila uploads) */
  async #eliminarFila(fila: LucidRow) {
    const idsImagenes = await idsImagenesDeFila(
      fila,
      this.config.camposImagen ?? [],
      this.config.camposGaleria ?? []
    )

    await fila.delete()
    await eliminarUploads(this.uploadService, idsImagenes)
  }

  /** ids[] del destroy masivo (400 si no viene una lista válida) */
  #idsDelRequest(ctx: HttpContext): number[] {
    const crudos = ctx.request.input('ids')
    const ids = Array.isArray(crudos)
      ? crudos.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0)
      : []

    if (ids.length === 0) {
      throw this.#errorDeCampo('ids', 'Seleccioná al menos un registro para eliminar')
    }
    return ids
  }

  #errorDeCampo(campo: string, mensaje: string) {
    return new vineErrors.E_VALIDATION_ERROR([{ field: campo, rule: 'recurso', message: mensaje }])
  }

  #mensaje(accion: 'creado' | 'actualizado' | 'eliminado'): string {
    const sufijo = this.config.genero === 'f' ? accion.replace(/o$/, 'a') : accion
    return `${this.config.nombre} ${sufijo} correctamente`
  }

  #entero(valor: unknown, porDefecto: number): number {
    const n = Number(valor)
    return Number.isInteger(n) && n > 0 ? n : porDefecto
  }
}
