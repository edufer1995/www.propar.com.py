import { createHash, randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import User from '#models/user'
import PasswordResetToken from '#models/password_reset_token'
import PasswordResetNotification from '#mails/password_reset_notification'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/auth'
import mail from '@adonisjs/mail/services/main'
import limiter from '@adonisjs/limiter/services/main'
import { errors as limiterErrors } from '@adonisjs/limiter'
import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Límite del "olvidé mi contraseña": 3 pedidos cada 15 minutos por IP.
 */
const forgotLimiter = limiter.use({
  requests: 3,
  duration: '15 mins',
})

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Respuesta única del forgot: idéntica exista o no el email, para no
 * revelar qué direcciones están registradas.
 */
const FORGOT_OK =
  'Si el email está registrado, en unos minutos vas a recibir un enlace para restablecer tu contraseña.'

export default class PasswordResetController {
  async forgot({ inertia }: HttpContext) {
    return inertia.render('auth/forgot_password', {})
  }

  async send({ request, response, session }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)

    /**
     * Todo pedido consume cupo, exista o no el email (la respuesta también
     * es idéntica en ambos casos).
     */
    try {
      await forgotLimiter.consume(`forgot_${request.ip()}`)
    } catch (error) {
      if (error instanceof limiterErrors.E_TOO_MANY_REQUESTS) {
        session.flash(
          'error',
          'Hiciste demasiados pedidos seguidos. Esperá unos minutos y volvé a intentar.'
        )
        return response.redirect().back()
      }
      throw error
    }

    const user = await User.query()
      .whereRaw('lower(email) = ?', [email.toLowerCase()])
      .where('activo', true)
      .first()

    if (user && user.email) {
      const token = randomBytes(32).toString('hex')

      await PasswordResetToken.create({
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: DateTime.utc().plus({ hours: 1 }),
      })

      await mail.send(new PasswordResetNotification(user, token))
    }

    session.flash('success', FORGOT_OK)
    return response.redirect().back()
  }

  /**
   * Busca un token vigente (hash coincide, no usado, no vencido).
   */
  async #findValidToken(token: string) {
    return PasswordResetToken.query()
      .where('token_hash', sha256(token))
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.utc().toSQL())
      .first()
  }

  async show({ params, inertia }: HttpContext) {
    const resetToken = await this.#findValidToken(params.token)
    return inertia.render('auth/reset_password', {
      token: params.token as string,
      tokenValido: Boolean(resetToken),
    })
  }

  async update({ params, request, response, session }: HttpContext) {
    const resetToken = await this.#findValidToken(params.token)

    if (!resetToken) {
      session.flash('error', 'El enlace no es válido o ya venció. Pedí uno nuevo.')
      return response.redirect().toRoute('auth.forgot.show')
    }

    const { password } = await request.validateUsing(resetPasswordValidator)

    await db.transaction(async (trx) => {
      const user = await User.findOrFail(resetToken.userId, { client: trx })
      user.password = password
      await user.save()

      resetToken.useTransaction(trx)
      resetToken.usedAt = DateTime.utc()
      await resetToken.save()

      /**
       * Invalida cualquier otro token pendiente del mismo usuario.
       */
      await PasswordResetToken.query({ client: trx })
        .where('user_id', resetToken.userId)
        .whereNull('used_at')
        .update({ used_at: DateTime.utc().toSQL() })
    })

    session.flash('success', 'Contraseña actualizada. Ya podés iniciar sesión.')
    return response.redirect().toRoute('auth.login.show')
  }
}
