import { readFile } from 'node:fs/promises'
import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import type { LucidModel, LucidRow, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

import Fraccion from '#models/fraccion'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'
import PlanosImportService, { errorDePlano } from '#services/planos_import_service'

export const planoEditarValidator = vine.create({
  descripcion: vine.string().trim().minLength(2).maxLength(255),
  activo: vine.boolean(),
})

/** Los 3 archivos .geojson que componen un plano */
const ARCHIVOS_PLANO = [
  { campo: 'archivoFraccion', nombre: 'fracción' },
  { campo: 'archivoManzanas', nombre: 'manzanas' },
  { campo: 'archivoLotes', nombre: 'lotes' },
] as const

/**
 * Planos de fracciones cartográficas. La lista/edición/eliminación usa
 * el motor CRUD; el alta es una importación GeoJSON propia (3 archivos
 * en una transacción, vía PlanosImportService). Re-dibujar un plano =
 * eliminar la fracción (cascada) y volver a crearla.
 */
export default class PlanosController extends RecursoController<Fraccion> {
  protected config: ConfigRecurso = {
    modelo: Fraccion,
    pagina: 'admin/planos',
    recurso: 'planos',
    nombre: 'Plano',
    genero: 'm',
    busquedaEn: ['codigo', 'descripcion'],
    ordenables: {
      id: 'id',
      codigo: 'codigo',
      descripcion: 'descripcion',
      estado: 'estado',
      createdAt: 'created_at',
    },
    ordenDefault: { sort: 'codigo', order: 'asc' },
  }

  private importService = new PlanosImportService()

  /** Counts de manzanas/lotes en la misma query (para lista y export) */
  protected filtrar(query: ModelQueryBuilderContract<LucidModel, LucidRow>) {
    ;(query as ModelQueryBuilderContract<typeof Fraccion, Fraccion>)
      .withCount('manzanas')
      .withCount('lotes')
  }

  protected serializar(fila: Fraccion) {
    return {
      id: fila.id,
      codigo: fila.codigo,
      descripcion: fila.descripcion,
      manzanas: Number(fila.$extras.manzanas_count ?? 0),
      lotes: Number(fila.$extras.lotes_count ?? 0),
      activo: fila.estado === 'A',
      creado: fila.createdAt.toISO(),
    }
  }

  /** Solo lo usa update (store está sobrescrito): descripcion + estado. */
  protected async validar(ctx: HttpContext) {
    const datos = await ctx.request.validateUsing(planoEditarValidator)
    return {
      descripcion: datos.descripcion,
      estado: datos.activo ? 'A' : 'E',
    }
  }

  /**
   * Alta = importación del plano: multipart con descripcion, codigo y los
   * 3 .geojson. El service re-valida la estructura completa (el cliente
   * ya validó, pero acá es donde cuenta) e importa en una transacción.
   */
  async store(ctx: HttpContext) {
    const { request, response, session } = ctx

    const descripcion = String(request.input('descripcion') ?? '').trim()
    if (descripcion.length < 2 || descripcion.length > 255) {
      throw errorDePlano(
        'descripcion',
        'Ingresá la descripción de la fracción (2 a 255 caracteres)'
      )
    }

    const codigo = Number(request.input('codigo'))
    if (!Number.isInteger(codigo) || codigo < 1 || codigo > 999) {
      throw errorDePlano('codigo', 'El código debe ser un entero entre 1 y 999')
    }

    const contenidos: Record<string, string> = {}
    for (const { campo, nombre } of ARCHIVOS_PLANO) {
      const archivo = request.file(campo, { size: '2mb', extnames: ['geojson', 'json'] })
      if (!archivo) {
        throw errorDePlano(campo, `Subí el archivo .geojson de ${nombre}`)
      }
      if (!archivo.isValid) {
        throw errorDePlano(campo, `El archivo de ${nombre} debe ser un .geojson de hasta 2 MB`)
      }
      contenidos[campo] = await readFile(archivo.tmpPath!, 'utf8')
    }

    const resultado = await this.importService.importar({
      codigo,
      descripcion,
      fraccionGeoJson: contenidos.archivoFraccion,
      manzanasGeoJson: contenidos.archivoManzanas,
      lotesGeoJson: contenidos.archivoLotes,
    })

    session.flash(
      'success',
      `Plano ${codigo} importado: ${resultado.manzanas} manzanas y ${resultado.lotes} lotes`
    )
    return response.redirect().back()
  }

  protected csv() {
    return {
      encabezados: ['ID', 'Código', 'Descripción', 'Manzanas', 'Lotes', 'Activo', 'Creado'],
      fila: (fila: Fraccion) => [
        fila.id,
        fila.codigo,
        fila.descripcion,
        Number(fila.$extras.manzanas_count ?? 0),
        Number(fila.$extras.lotes_count ?? 0),
        fila.estado === 'A' ? 'Sí' : 'No',
        fila.createdAt.setZone('America/Asuncion').toFormat('dd/MM/yyyy'),
      ],
    }
  }
}
