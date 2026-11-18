import User from '#models/user'
import Lead from '#models/lead'
import Lote from '#models/lote'
import Carrusel from '#models/carrusel'
import Fraccion from '#models/fraccion'
import type { HttpContext } from '@adonisjs/core/http'

export default class DashboardController {
  async index({ inertia }: HttpContext) {
    const [carruseles, fracciones, lotes, leads, usuarios] = await Promise.all([
      Carrusel.query().count('* as total').firstOrFail(),
      Fraccion.query().count('* as total').firstOrFail(),
      Lote.query().count('* as total').firstOrFail(),
      Lead.query().count('* as total').firstOrFail(),
      User.query().count('* as total').firstOrFail(),
    ])

    return inertia.render('admin/dashboard', {
      counts: {
        carruseles: Number(carruseles.$extras.total),
        fracciones: Number(fracciones.$extras.total),
        lotes: Number(lotes.$extras.total),
        leads: Number(leads.$extras.total),
        usuarios: Number(usuarios.$extras.total),
      },
    })
  }
}
