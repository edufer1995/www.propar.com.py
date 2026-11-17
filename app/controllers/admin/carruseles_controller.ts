import type { HttpContext } from '@adonisjs/core/http'

import Carrusel from '#models/carrusel'
import { urlDeLink } from '#services/public_layout_service'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'
import { carruselValidator } from '#validators/admin/recursos'

/**
 * Carruseles de la portada. El home muestra los de estado 'A' (más nuevos
 * primero) con su imagen spec "carrusel" (1920×800 apaisada). El botón del
 * slide va a `url` si está cargada; si no, a la fracción (si hay).
 */
export default class CarruselesController extends RecursoController<Carrusel> {
  protected config: ConfigRecurso = {
    modelo: Carrusel,
    pagina: 'admin/recursos/carruseles',
    recurso: 'carruseles',
    nombre: 'Carrusel',
    genero: 'm',
    busquedaEn: ['titulo', 'subtitulo', 'descripcion'],
    ordenables: { id: 'id', titulo: 'titulo', estado: 'estado' },
    ordenDefault: { sort: 'id', order: 'desc' },
    camposImagen: [{ campo: 'imagenUploadId', columna: 'imagenUploadId', spec: 'carrusel' }],
    precargar: ['imagen'],
  }

  protected serializar(fila: Carrusel) {
    return {
      id: fila.id,
      titulo: fila.titulo,
      subtitulo: fila.subtitulo,
      descripcion: fila.descripcion,
      fraccionCodigo: fila.fraccionCodigo,
      url: fila.url,
      activo: fila.estado === 'A',
      imagenUploadId: fila.imagenUploadId,
      imagenUrl: urlDeLink(fila.imagen?.link),
    }
  }

  protected async validar({ request }: HttpContext) {
    const datos = await request.validateUsing(carruselValidator)
    return {
      titulo: datos.titulo,
      subtitulo: datos.subtitulo ?? null,
      descripcion: datos.descripcion ?? null,
      fraccionCodigo: datos.fraccionCodigo ?? null,
      url: datos.url ?? null,
      estado: datos.activo ? 'A' : 'E',
    }
  }

  protected csv() {
    return {
      encabezados: ['ID', 'Título', 'Subtítulo', 'Descripción', 'Fracción', 'Enlace', 'Activo'],
      fila: (fila: Carrusel) => [
        fila.id,
        fila.titulo,
        fila.subtitulo,
        fila.descripcion,
        fila.fraccionCodigo,
        fila.url,
        fila.estado === 'A' ? 'Sí' : 'No',
      ],
    }
  }
}
