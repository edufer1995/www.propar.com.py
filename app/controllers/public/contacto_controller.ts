import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import limiter from '@adonisjs/limiter/services/main'
import type { HttpContext } from '@adonisjs/core/http'

import Lead from '#models/lead'
import ContactNotification from '#mails/contact_notification'
import PublicLayoutService from '#services/public_layout_service'
import { ASUNTO_ETIQUETAS, ASUNTOS_CONTACTO, contactoValidator } from '#validators/contacto'

/**
 * Límite de envíos del formulario: 5 por minuto por IP.
 */
const contactoLimiter = limiter.use({
  requests: 5,
  duration: '1 min',
})

@inject()
export default class ContactoController {
  constructor(private layout: PublicLayoutService) {}

  async show({ inertia }: HttpContext) {
    return inertia.render('public/contacto', {
      asuntos: ASUNTOS_CONTACTO.map((valor) => ({
        valor,
        etiqueta: ASUNTO_ETIQUETAS[valor],
      })),
      piePagina: await this.layout.piePagina(),
    })
  }

  async store({ request, response, session }: HttpContext) {
    /**
     * Rate limit antes de cualquier trabajo: al exceder, mensaje claro
     * vía flash (el layout público lo muestra como toast de error).
     */
    const clave = `contacto_${request.ip()}`
    try {
      await contactoLimiter.consume(clave)
    } catch {
      session.flash(
        'error',
        'Demasiadas consultas seguidas. Espera un minuto y vuelve a intentarlo.'
      )
      return response.redirect().back()
    }

    const datos = await request.validateUsing(contactoValidator)

    /** Fracción opcional (deep-links ?fraccion= hacia el contacto). */
    const fraccionRaw = request.input('fraccion')
    const fraccionCodigo =
      Number.isInteger(Number(fraccionRaw)) && Number(fraccionRaw) > 0 ? Number(fraccionRaw) : null

    /**
     * El lead se persiste SIEMPRE, aunque el SMTP esté caído: es el
     * registro comercial de la consulta.
     */
    const lead = await Lead.create({
      tipo: datos.asunto === 'vender-propiedad' ? 'vender' : 'contacto',
      nombre: `${datos.nombre} ${datos.apellido}`,
      telefono: datos.telefono,
      email: datos.correo,
      comentario: datos.consulta,
      asunto: ASUNTO_ETIQUETAS[datos.asunto],
      fraccionCodigo,
    })

    try {
      await mail.sendLater(new ContactNotification({ ...datos, fraccionCodigo }))
      lead.mailEnviadoAt = DateTime.now()
      await lead.save()
    } catch (error) {
      // El mail es secundario: se loguea y el visitante recibe éxito igual.
      logger.error({ err: error, leadId: lead.id }, 'No se pudo encolar el mail de contacto')
    }

    session.flash(
      'success',
      'Recibimos tu consulta. Nuestro equipo se pondrá en contacto a la brevedad.'
    )
    return response.redirect().back()
  }
}
