import type { HttpContext } from '@adonisjs/core/http'

import PreguntaFrecuente from '#models/pregunta_frecuente'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'
import { preguntaFrecuenteValidator } from '#validators/admin/recursos'
import { CATEGORIA_ETIQUETAS, type CategoriaPregunta } from '#validators/preguntas'

/**
 * Preguntas frecuentes. El sitio público muestra las activas en
 * /preguntas-frecuentes, ordenadas por `orden`.
 */
export default class PreguntasFrecuentesController extends RecursoController<PreguntaFrecuente> {
  protected config: ConfigRecurso = {
    modelo: PreguntaFrecuente,
    pagina: 'admin/recursos/preguntas_frecuentes',
    recurso: 'preguntas',
    nombre: 'Pregunta',
    genero: 'f',
    busquedaEn: ['pregunta', 'respuesta'],
    ordenables: { id: 'id', orden: 'orden', pregunta: 'pregunta', categoria: 'categoria' },
    ordenDefault: { sort: 'orden', order: 'asc' },
  }

  protected serializar(fila: PreguntaFrecuente) {
    return {
      id: fila.id,
      categoria: fila.categoria,
      pregunta: fila.pregunta,
      respuesta: fila.respuesta,
      orden: fila.orden,
      activo: fila.activo,
    }
  }

  protected async validar({ request }: HttpContext) {
    return request.validateUsing(preguntaFrecuenteValidator)
  }

  protected csv() {
    return {
      encabezados: ['ID', 'Orden', 'Categoría', 'Pregunta', 'Respuesta', 'Activa'],
      fila: (fila: PreguntaFrecuente) => [
        fila.id,
        fila.orden,
        CATEGORIA_ETIQUETAS[fila.categoria as CategoriaPregunta] ?? fila.categoria,
        fila.pregunta,
        fila.respuesta,
        fila.activo ? 'Sí' : 'No',
      ],
    }
  }
}
