import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import Mision from '#models/mision'
import Vision from '#models/vision'
import Producto from '#models/producto'
import Trayectoria from '#models/trayectoria'
import QuienesSomos from '#models/quienes_somos'
import PublicLayoutService from '#services/public_layout_service'

@inject()
export default class QuienesSomosController {
  constructor(private layout: PublicLayoutService) {}

  async index({ inertia }: HttpContext) {
    const [quienesSomos, trayectoria, mision, vision, producto, piePagina] = await Promise.all([
      QuienesSomos.query().first(),
      Trayectoria.query().first(),
      Mision.query().first(),
      Vision.query().first(),
      Producto.query().first(),
      this.layout.piePagina(),
    ])

    const imagenes = await this.layout.urlsDeUploads([
      quienesSomos?.imagenUnoUploadId,
      quienesSomos?.imagenDosUploadId,
      quienesSomos?.imagenTresUploadId,
      trayectoria?.imagenUnoUploadId,
      mision?.imagenUnoUploadId,
      vision?.imagenUnoUploadId,
      producto?.imagenUnoUploadId,
    ])

    const url = (id: number | null | undefined) => (id ? (imagenes.get(id) ?? null) : null)

    return inertia.render('public/quienes_somos', {
      quienesSomos: quienesSomos
        ? {
            titulo: quienesSomos.titulo,
            parrafos: [
              quienesSomos.parrafoUno,
              quienesSomos.parrafoDos,
              quienesSomos.parrafoTres,
              quienesSomos.parrafoCuatro,
            ],
            imagenUno: url(quienesSomos.imagenUnoUploadId),
            imagenDos: url(quienesSomos.imagenDosUploadId),
            imagenTres: url(quienesSomos.imagenTresUploadId),
          }
        : null,
      trayectoria: trayectoria
        ? {
            titulo: trayectoria.titulo,
            parrafos: [
              trayectoria.parrafoUno,
              trayectoria.parrafoDos,
              trayectoria.parrafoTres,
              trayectoria.parrafoCuatro,
              trayectoria.parrafoCinco,
              trayectoria.parrafoSeis,
            ],
            imagen: url(trayectoria.imagenUnoUploadId),
          }
        : null,
      mision: mision
        ? {
            titulo: mision.titulo,
            parrafo: mision.parrafoUno,
            imagen: url(mision.imagenUnoUploadId),
          }
        : null,
      vision: vision
        ? {
            titulo: vision.titulo,
            parrafo: vision.parrafoUno,
            imagen: url(vision.imagenUnoUploadId),
          }
        : null,
      producto: producto
        ? {
            titulo: producto.titulo,
            parrafo: producto.parrafoUno,
            imagen: url(producto.imagenUnoUploadId),
          }
        : null,
      piePagina,
    })
  }
}
