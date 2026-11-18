/*
|--------------------------------------------------------------------------
| Motor de singletons institucionales del admin
|--------------------------------------------------------------------------
|
| Páginas de una sola fila (quiénes somos, misión, visión, producto,
| trayectoria): GET show renderiza el formulario con los datos
| actuales y POST update valida y persiste sobre la (única) fila,
| creándola si aún no existe.
|
| Cada singleton aporta: config (modelo, página, campos imagen),
| validar(ctx) mapeado a columnas y serializar(fila) para el form. Los
| campos imagen usan la misma convención y helpers que el motor CRUD.
|
*/

import type { HttpContext } from '@adonisjs/core/http'
import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model'

import Upload from '#models/upload'
import UploadService from '#services/upload_service'
import {
  eliminarUploads,
  resolverImagenes,
  type CampoImagen,
} from '#controllers/admin/concerns/imagenes_recurso'
import { IMAGEN_SPECS, describirSpec } from '#validators/rules/imagen_specs'

export interface ConfigSingleton {
  modelo: LucidModel
  /** Componente Inertia (ej. 'admin/singletons/quienes_somos') */
  pagina: string
  /** Nombre legible para el flash ("Quiénes somos") */
  nombre: string
  camposImagen?: CampoImagen[]
}

export default abstract class SingletonController<Fila extends LucidRow = LucidRow> {
  protected uploadService = new UploadService()

  protected abstract config: ConfigSingleton

  /** Fila → valores del formulario (los campos imagen van como upload id) */
  protected abstract serializar(fila: Fila): Record<string, unknown>

  /** Valida el request y devuelve los valores mapeados a columnas */
  protected abstract validar(ctx: HttpContext): Promise<Record<string, unknown>>

  async show(ctx: HttpContext) {
    const fila = (await this.config.modelo.query().orderBy('id', 'asc').first()) as Fila | null

    return ctx.inertia.render(
      // Página y props dinámicos por config: fuera del tipado del codegen
      this.config.pagina as never,
      {
        datos: fila ? this.serializar(fila) : null,
        imagenes: fila ? await this.#urlsImagenes(fila) : {},
        specs: this.#specsCliente(),
      } as never
    )
  }

  async update(ctx: HttpContext) {
    const datos = await this.validar(ctx)

    const existente = (await this.config.modelo.query().orderBy('id', 'asc').first()) as Fila | null
    const fila = existente ?? (new this.config.modelo() as Fila)

    const imagenes = await resolverImagenes(ctx, this.config.camposImagen ?? [], existente)

    // Columnas dinámicas por config: fuera del tipado estático del modelo
    fila.merge({ ...datos, ...imagenes.columnas } as never)
    await fila.save()

    await eliminarUploads(this.uploadService, imagenes.eliminar)

    ctx.session.flash('success', `${this.config.nombre} actualizado correctamente`)
    return ctx.response.redirect().back()
  }

  /** URL pública por campo imagen (ej. { imagenUnoUploadId: '/api/file/...' }) */
  async #urlsImagenes(fila: Fila): Promise<Record<string, string | null>> {
    const registro = fila as unknown as Record<string, unknown>
    const campos = this.config.camposImagen ?? []
    const ids = campos
      .map((c) => registro[c.columna])
      .filter((v): v is number => typeof v === 'number')

    const uploads = ids.length ? await Upload.findMany([...new Set(ids)]) : []
    const urls = new Map(uploads.map((u) => [u.id, `/api/file/public/${u.link}`]))

    const resultado: Record<string, string | null> = {}
    for (const campo of campos) {
      const valor = registro[campo.columna]
      resultado[campo.campo] = typeof valor === 'number' ? (urls.get(valor) ?? null) : null
    }
    return resultado
  }

  #specsCliente() {
    const specs: Record<string, unknown> = {}
    for (const campo of this.config.camposImagen ?? []) {
      // Los singletons solo usan specs de imagen (sin PDFs ni videos)
      if (!(campo.spec in IMAGEN_SPECS)) continue
      const spec = IMAGEN_SPECS[campo.spec as keyof typeof IMAGEN_SPECS]
      specs[campo.spec] = { ...spec, texto: describirSpec(spec) }
    }
    return specs
  }
}
