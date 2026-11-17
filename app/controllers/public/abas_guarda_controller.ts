import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import PublicLayoutService from '#services/public_layout_service'

/**
 * Página /abas-guarda: lanzamiento del self storage de ABAS en Ciudad del
 * Este (pedido de ABAS, 11/2026). Contenido fijo en la página: es una
 * landing de "próximamente" con logo, afiche y QR en /img/abas-guarda.
 */
@inject()
export default class AbasGuardaController {
  constructor(private layout: PublicLayoutService) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('public/abas_guarda', {
      piePagina: await this.layout.piePagina(),
    })
  }
}
