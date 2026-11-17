import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import Parking from '#models/parking'
import Ofrecemos from '#models/ofrecemos'
import NuestroHorario from '#models/nuestro_horario'
import DireccionContacto from '#models/direccion_contacto'
import PublicLayoutService from '#services/public_layout_service'

/**
 * Ubicación del estacionamiento (misma que el iframe del sitio viejo).
 * En Fase 1 no se gasta mapa acá: solo link a Google Maps.
 */
const PARKING_MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=-25.514436,-54.613367'

@inject()
export default class ParkingController {
  constructor(private layout: PublicLayoutService) {}

  async index({ inertia }: HttpContext) {
    const [parking, ofrecemos, horarios, direcciones, piePagina] = await Promise.all([
      Parking.query().first(),
      Ofrecemos.query().orderBy('id', 'asc'),
      NuestroHorario.query().orderBy('id', 'asc'),
      DireccionContacto.query().orderBy('id', 'asc'),
      this.layout.piePagina(),
    ])

    const imagenes = await this.layout.urlsDeUploads([
      parking?.imagenUnoUploadId,
      parking?.imagenDosUploadId,
      ...ofrecemos.map((o) => o.imagenUploadId),
    ])

    const url = (id: number | null | undefined) => (id ? (imagenes.get(id) ?? null) : null)

    return inertia.render('public/parking', {
      parking: parking
        ? {
            titulo: parking.titulo,
            parrafoUno: parking.parrafoUno,
            parrafoDos: parking.parrafoDos,
            parrafoTres: parking.parrafoTres,
            imagenUno: url(parking.imagenUnoUploadId),
            imagenDos: url(parking.imagenDosUploadId),
          }
        : null,
      /** Igual que el viejo: imagenCheck separa bullets de fotos. */
      ofrecemos: {
        items: ofrecemos.filter((o) => !o.imagenCheck && o.descripcion).map((o) => o.descripcion!),
        imagenes: ofrecemos
          .filter((o) => o.imagenCheck)
          .map((o) => url(o.imagenUploadId))
          .filter((u): u is string => u !== null),
      },
      horarios: horarios
        .map((h) => (h.obsCheck ? h.obs : h.descripcion))
        .filter((t): t is string => Boolean(t)),
      direcciones: direcciones.map((d) => d.descripcion).filter((t): t is string => Boolean(t)),
      mapsUrl: PARKING_MAPS_URL,
      piePagina,
    })
  }
}
