import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import PreguntaFrecuente from '#models/pregunta_frecuente'
import PublicLayoutService from '#services/public_layout_service'
import {
  CATEGORIA_ETIQUETAS,
  CATEGORIAS_PREGUNTA,
  type CategoriaPregunta,
} from '#validators/preguntas'

@inject()
export default class PreguntasFrecuentesController {
  constructor(private layout: PublicLayoutService) {}

  async index({ inertia }: HttpContext) {
    const [filas, piePagina] = await Promise.all([
      PreguntaFrecuente.query().where('activo', true).orderBy('orden').orderBy('id'),
      this.layout.piePagina(),
    ])

    const usadas = new Set(filas.map((f) => f.categoria))

    return inertia.render('public/preguntas_frecuentes', {
      preguntas: filas.map((f) => ({
        id: f.id,
        categoria: f.categoria,
        pregunta: f.pregunta,
        respuesta: f.respuesta,
      })),
      /** Solo las categorías que tienen alguna pregunta activa. */
      categorias: CATEGORIAS_PREGUNTA.filter((c) => usadas.has(c)).map((valor) => ({
        valor,
        etiqueta: CATEGORIA_ETIQUETAS[valor as CategoriaPregunta],
      })),
      piePagina,
    })
  }
}
