import type { HttpContext } from '@adonisjs/core/http'

import Fraccion from '#models/fraccion'
import Upload from '#models/upload'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'

/**
 * Medios de las fracciones del mapa: galería de fotos + videos MP4 que
 * alimentan la portada de las cards y el lightbox de /loteamientos.
 *
 * Las fracciones NACEN del ETL / importación de planos: acá no se crean
 * ni se eliminan (sin rutas store/destroy y sinCrear/sinEliminar en el
 * front); solo se les cargan medios.
 */
export default class FraccionesController extends RecursoController<Fraccion> {
  protected config: ConfigRecurso = {
    modelo: Fraccion,
    pagina: 'admin/recursos/fracciones',
    recurso: 'fracciones',
    nombre: 'Fracción',
    genero: 'f',
    busquedaEn: ['codigo', 'descripcion'],
    ordenables: {
      id: 'id',
      codigo: 'codigo',
      descripcion: 'descripcion',
      estado: 'estado',
    },
    ordenDefault: { sort: 'codigo', order: 'asc' },
    camposGaleria: [
      { campo: 'imagenesUploadIds', columna: 'imagenes', spec: 'fotoFraccion', maximo: 12 },
      { campo: 'videosUploadIds', columna: 'videos', spec: 'videoFraccion', maximo: 3 },
    ],
  }

  /** URLs de los medios de las filas a serializar, resueltas en UN lote */
  #urls = new Map<number, string>()

  protected async antesDeSerializar(filas: Fraccion[]) {
    const ids = filas.flatMap((f) => [
      ...(Array.isArray(f.imagenes) ? (f.imagenes as number[]) : []),
      ...(Array.isArray(f.videos) ? (f.videos as number[]) : []),
    ])
    const unicos = [...new Set(ids)]
    const uploads = unicos.length ? await Upload.findMany(unicos) : []
    this.#urls = new Map(uploads.map((u) => [u.id, `/api/file/public/${u.link}`]))
  }

  protected serializar(fila: Fraccion) {
    const aMedios = (valor: unknown) =>
      (Array.isArray(valor) ? (valor as number[]) : []).map((id) => ({
        id,
        url: this.#urls.get(id) ?? null,
      }))

    return {
      id: fila.id,
      codigo: fila.codigo,
      descripcion: fila.descripcion,
      activo: fila.estado === 'A',
      imagenes: aMedios(fila.imagenes),
      videos: aMedios(fila.videos),
    }
  }

  /** Solo se editan medios: no hay otros campos en el payload. */
  protected async validar(_ctx: HttpContext) {
    return {}
  }

  protected csv() {
    return {
      encabezados: ['Código', 'Descripción', 'Estado', 'Fotos', 'Videos'],
      fila: (fila: Fraccion) => [
        fila.codigo,
        fila.descripcion ?? '',
        fila.estado ?? '',
        Array.isArray(fila.imagenes) ? fila.imagenes.length : 0,
        Array.isArray(fila.videos) ? fila.videos.length : 0,
      ],
    }
  }
}
