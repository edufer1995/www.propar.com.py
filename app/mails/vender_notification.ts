import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import type { DatosVender } from '#validators/vender'

/**
 * Aviso interno de un terreno ofrecido desde /deseo-vender. Va a
 * CONTACTO_EMAIL; si el visitante dejó correo, queda como replyTo.
 */
export default class VenderNotification extends BaseMail {
  constructor(private datos: DatosVender) {
    super()
  }

  prepare() {
    this.message
      .subject('Nuevo terreno ofrecido desde el sitio')
      .from(env.get('MAIL_FROM'), env.get('MAIL_FROM_NAME'))
      .to(env.get('CONTACTO_EMAIL'))
      .htmlView('emails/vender_notification', { ...this.datos })
    if (this.datos.correo) this.message.replyTo(this.datos.correo, this.datos.nombre)
  }
}
