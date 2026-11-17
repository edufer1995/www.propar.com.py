import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import { ASUNTO_ETIQUETAS, type AsuntoContacto } from '#validators/contacto'

export interface DatosContacto {
  nombre: string
  apellido: string
  telefono: string
  correo: string
  asunto: AsuntoContacto
  consulta: string
  /** Fracción del query string (?fraccion=N), si vino de un CTA. */
  fraccionCodigo: number | null
}

/**
 * Notificación interna de una consulta del formulario de contacto.
 * Va a CONTACTO_EMAIL con replyTo del visitante; el template Edge escapa
 * todo el contenido (entrada pública).
 */
export default class ContactNotification extends BaseMail {
  constructor(private datos: DatosContacto) {
    super()
  }

  prepare() {
    const asuntoEtiqueta = ASUNTO_ETIQUETAS[this.datos.asunto]

    this.message
      .subject(`Nueva consulta del sitio — ${asuntoEtiqueta}`)
      .from(env.get('MAIL_FROM'), env.get('MAIL_FROM_NAME'))
      .to(env.get('CONTACTO_EMAIL'))
      .replyTo(this.datos.correo, `${this.datos.nombre} ${this.datos.apellido}`)
      .htmlView('emails/contact_notification', {
        ...this.datos,
        asuntoEtiqueta,
      })
  }
}
