import User from '#models/user'
import { loginValidator } from '#validators/auth'
import { errors as authErrors } from '@adonisjs/auth'
import limiter from '@adonisjs/limiter/services/main'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Límite de intentos de login: 5 por minuto por IP+usuario. Al exceder,
 * la clave queda bloqueada 15 minutos (backoff). Los intentos exitosos
 * resetean el contador (semántica de limiter.penalize).
 */
const loginLimiter = limiter.use({
  requests: 5,
  duration: '1 min',
  blockDuration: '15 mins',
})

function formatEspera(segundos: number): string {
  if (segundos >= 60) {
    const minutos = Math.ceil(segundos / 60)
    return `${minutos} minuto${minutos === 1 ? '' : 's'}`
  }
  return `${segundos} segundo${segundos === 1 ? '' : 's'}`
}

export default class SessionController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/login', {})
  }

  async store({ request, auth, response, session }: HttpContext) {
    const { username, password, remember } = await request.validateUsing(loginValidator)

    const throttleKey = `login_${request.ip()}_${username.toLowerCase()}`

    /**
     * penalize: los intentos fallidos (callback que lanza) consumen cupo y,
     * al agotarlo, bloquean la clave; un login correcto resetea el contador.
     */
    let user: User
    try {
      const [throttleError, verified] = await loginLimiter.penalize(throttleKey, () => {
        return User.verifyCredentials(username, password)
      })

      /**
       * Bloqueado por exceso de intentos: mensaje claro de espera.
       */
      if (throttleError) {
        session.flash(
          'error',
          `Demasiados intentos fallidos. Esperá ${formatEspera(throttleError.response.availableIn)} y volvé a intentar.`
        )
        return response.redirect().back()
      }

      user = verified
    } catch (error) {
      /**
       * Credenciales inválidas: mensaje genérico, sin revelar cuál falló.
       */
      if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
        session.flash('error', 'Usuario o contraseña incorrectos')
        return response.redirect().back()
      }
      throw error
    }

    /**
     * Usuario dado de baja: no puede ingresar aunque la contraseña sea válida.
     */
    if (!user.activo) {
      session.flash('error', 'Tu usuario está inactivo. Contactá a un administrador.')
      return response.redirect().back()
    }

    await auth.use('web').login(user, remember === true)
    return response.redirect().toRoute('app.dashboard')
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect().toRoute('auth.login.show')
  }
}
