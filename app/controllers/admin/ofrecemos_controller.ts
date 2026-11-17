import type { HttpContext } from '@adonisjs/core/http'

import Ofrecemos from '#models/ofrecemos'
import Upload from '#models/upload'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'
import { ofrecemosValidator } from '#validators/admin/recursos'
import { errorDeCampo } from '#controllers/admin/concerns/imagenes_recurso'

/**
 * Ítems "Ofrecemos" de la página /parking. Igual que el sitio viejo:
 * imagenCheck separa bullets de texto (false) de fotos de la galería
 * (true, con imagen spec fotoInstitucional).
 */
export default class OfrecemosController extends RecursoController<Ofrecemos> {
  protected config: ConfigRecurso = {
    modelo: Ofrecemos,
    pagina: 'admin/recursos/ofrecemos',
    recurso: 'ofrecemos',
    nombre: 'Ítem de ofrecemos',
    genero: 'm',
    busquedaEn: ['descripcion'],
    ordenables: { id: 'id', descripcion: 'descripcion' },
    ordenDefault: { sort: 'id', order: 'asc' },
    camposImagen: [
      { campo: 'imagenUploadId', columna: 'imagenUploadId', spec: 'fotoInstitucional' },
    ],
  }

  /** URLs de las imágenes de la página actual (lote único) */
  #urls = new Map<number, string>()

  protected async antesDeSerializar(filas: Ofrecemos[]) {
    const ids = filas
      .map((f) => f.imagenUploadId)
      .filter((id): id is number => typeof id === 'number')
    const uploads = ids.length ? await Upload.findMany([...new Set(ids)]) : []
    this.#urls = new Map(uploads.map((u) => [u.id, `/api/file/public/${u.link}`]))
  }

  protected serializar(fila: Ofrecemos) {
    return {
      id: fila.id,
      descripcion: fila.descripcion,
      esImagen: Boolean(fila.imagenCheck),
      imagenUploadId: fila.imagenUploadId,
      imagenUrl: fila.imagenUploadId ? (this.#urls.get(fila.imagenUploadId) ?? null) : null,
    }
  }

  protected async validar(ctx: HttpContext) {
    const datos = await ctx.request.validateUsing(ofrecemosValidator)

    if (!datos.imagenCheck && !datos.descripcion) {
      throw errorDeCampo('descripcion', 'Un ítem de texto necesita su descripción')
    }

    return {
      descripcion: datos.descripcion ?? null,
      imagenCheck: datos.imagenCheck,
    }
  }

  protected csv() {
    return {
      encabezados: ['ID', 'Descripción', 'Es foto'],
      fila: (fila: Ofrecemos) => [fila.id, fila.descripcion, fila.imagenCheck ? 'Sí' : 'No'],
    }
  }
}
