import env from '#start/env'
import type User from '#models/user'
import { BaseMail } from '@adonisjs/mail'

/**
 * Mail de restablecimiento de contraseña. Lleva el link con el token
 * en claro (en la base solo se guarda el sha256).
 */
export default class PasswordResetNotification extends BaseMail {
  subject = 'Restablecé tu contraseña — ABAS Inmobiliaria'

  constructor(
    private user: User,
    private token: string
  ) {
    super()
  }

  prepare() {
    const resetUrl = `${env.get('APP_URL')}/auth/reset-password/${this.token}`

    this.message.to(this.user.email!).htmlView('emails/password_reset', {
      nombre: this.user.nombre ?? this.user.username,
      resetUrl,
      vigenciaHoras: 1,
    })
  }
}
