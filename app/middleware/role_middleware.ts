import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Niveles de los 4 roles migrados del sitio viejo (tabla `roles`):
 * 1 = Administrador · 2 = Vendedor · 3 = Cargar contactos ·
 * 4 = Cargar/Transferir contactos.
 *
 * Los niveles 3 y 4 son roles operativos de la app móvil: en el admin web
 * solo acceden al dashboard y a su perfil.
 */
export const NIVEL_ADMINISTRADOR = 1
export const NIVEL_VENDEDOR = 2

/**
 * Autorización por rol. Los roles tienen "nivel" ascendente en privilegio
 * inverso: 1 = Administrador (máximo privilegio), 4 = mínimo.
 *
 * Uso: middleware.role({ nivelMinimo: 2 }) → solo pasan usuarios cuyo
 * rol.nivel sea <= 2 (Administrador y Vendedor).
 *
 * Debe encadenarse DESPUÉS de middleware.auth().
 */
export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { nivelMinimo?: number } = {}) {
    const user = ctx.auth.getUserOrFail()

    if (options.nivelMinimo !== undefined) {
      if (!user.rol?.nivel) {
        await user.load('rol')
      }

      if (user.rol.nivel > options.nivelMinimo) {
        ctx.session.flash('error', 'No tenés permisos para acceder a esa sección.')
        return ctx.response.redirect().toRoute('app.dashboard')
      }
    }

    return next()
  }
}
