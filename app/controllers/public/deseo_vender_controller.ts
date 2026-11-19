import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import limiter from '@adonisjs/limiter/services/main'
import type { HttpContext } from '@adonisjs/core/http'

import Lead from '#models/lead'
import VenderNotification from '#mails/vender_notification'
import PublicLayoutService from '#services/public_layout_service'
import { venderValidator } from '#validators/vender'

/** Mismo límite que el contacto: 5 envíos por minuto por IP. */
const venderLimiter = limiter.use({ requests: 5, duration: '1 min' })

@inject()
export default class DeseoVenderController {
  constructor(private layout: PublicLayoutService) {}

  async show({ inertia }: HttpContext) {
    return inertia.render('public/deseo_vender', { piePagina: await this.layout.piePagina() })
  }

  async store({ request, response, session }: HttpContext) {
    try {
      await venderLimiter.consume(`vender_${request.ip()}`)
    } catch {
      session.flash('error', 'Demasiados envíos seguidos. Espera un minuto y vuelve a intentarlo.')
      return response.redirect().back()
    }

    const datos = await request.validateUsing(venderValidator)

    /** El lead se guarda siempre, aunque el SMTP falle: es el registro comercial. */
    const comentario = [
      `Ubicación: ${datos.ubicacion}`,
      `Tamaño: ${datos.tamano}`,
      datos.precio ? `Precio pretendido: ${datos.precio}` : null,
      datos.comentarios ? `Comentarios: ${datos.comentarios}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const lead = await Lead.create({
      tipo: 'vender',
      nombre: datos.nombre,
      telefono: datos.telefono,
      email: datos.correo ?? null,
      comentario,
      asunto: 'Ofrece un terreno (Deseo vender)',
    })

    try {
      await mail.sendLater(new VenderNotification(datos))
      lead.mailEnviadoAt = DateTime.now()
      await lead.save()
    } catch (error) {
      logger.error({ err: error, leadId: lead.id }, 'No se pudo encolar el mail de Deseo vender')
    }

    session.flash(
      'success',
      'Recibimos los datos del terreno. Un asesor de Propar te contactará a la brevedad.'
    )
    return response.redirect().back()
  }
}
