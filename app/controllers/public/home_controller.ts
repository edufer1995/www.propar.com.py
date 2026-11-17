import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import Carrusel from '#models/carrusel'
import Promocion from '#models/promocion'
import LoteDistrito from '#models/lote_distrito'
import LotesErpRepository from '#repositories/erp/lotes_erp_repository'
import PublicLayoutService, { urlDeLink } from '#services/public_layout_service'
import { RANGOS_CUOTA_OPCIONES } from '#services/rangos_precios'

@inject()
export default class HomeController {
  constructor(
    private erp: LotesErpRepository,
    private layout: PublicLayoutService
  ) {}

  async index({ inertia }: HttpContext) {
    const [carrusel, promociones, distritos, piePagina] = await Promise.all([
      this.#carrusel(),
      this.#promociones(),
      this.#distritos(),
      this.layout.piePagina(),
    ])

    return inertia.render('public/home', {
      carrusel,
      promociones,
      distritos,
      rangosCuota: [...RANGOS_CUOTA_OPCIONES],
      piePagina,
    })
  }

  /** Slides activos del carrusel de portada (como el sitio viejo: estado A, más nuevos primero). */
  async #carrusel() {
    const filas = await Carrusel.query()
      .where('estado', 'A')
      .orderBy('id', 'desc')
      .preload('imagen')

    return filas.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      subtitulo: c.subtitulo,
      descripcion: c.descripcion,
      fraccionCodigo: c.fraccionCodigo,
      url: c.url,
      imagenUrl: urlDeLink(c.imagen?.link),
    }))
  }

  /**
   * Promociones activas con vigencia que incluye hoy (America/Asuncion).
   * `modal` viaja al front: las marcadas se abren solas al entrar.
   */
  async #promociones() {
    const hoy = DateTime.now().setZone('America/Asuncion').toISODate()!

    const filas = await Promocion.query()
      .where('activo', true)
      .where((q) => q.whereNull('vigente_desde').orWhere('vigente_desde', '<=', hoy))
      .where((q) => q.whereNull('vigente_hasta').orWhere('vigente_hasta', '>=', hoy))
      .orderBy('id', 'desc')

    const archivos = await this.layout.urlsDeUploads(
      filas.flatMap((p) => [p.imagenUploadId, p.pdfUploadId])
    )

    return filas.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      descripcion: p.descripcion,
      url: p.url,
      modal: p.modal,
      imagenUrl: p.imagenUploadId ? (archivos.get(p.imagenUploadId) ?? null) : null,
      /** Bases y condiciones (PDF) adjuntas desde el ABM */
      pdfUrl: p.pdfUploadId ? (archivos.get(p.pdfUploadId) ?? null) : null,
    }))
  }

  /**
   * Lotes por distrito: SOLO los distritos elegidos en el admin
   * (lotes_distritos, tantos como haya), en su orden, con los números
   * del ERP. Un tile cuyo distrito no exista en el ERP se omite.
   */
  async #distritos() {
    const [resumen, tiles] = await Promise.all([
      this.erp.distritos(),
      LoteDistrito.query().orderBy('id'),
    ])

    const imagenes = await this.layout.urlsDeUploads(tiles.map((t) => t.imagenUploadId))
    const porCodigo = new Map(resumen.map((d) => [d.codigo, d]))

    return tiles.flatMap((t) => {
      const d = porCodigo.get(t.distritoCodigo)
      if (!d) return []
      return [
        {
          codigo: d.codigo,
          nombre: d.nombre,
          fracciones: d.fracciones,
          lotesLibres: d.lotesLibres,
          cuotaMinima: d.cuotaMinima,
          imagenUrl: t.imagenUploadId ? (imagenes.get(t.imagenUploadId) ?? null) : null,
        },
      ]
    })
  }
}
