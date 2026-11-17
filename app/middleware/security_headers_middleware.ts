import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Headers de seguridad que Shield no cubre (Etapa 6).
 *
 * - Referrer-Policy: no filtrar la URL completa a orígenes externos
 *   (Google Maps, links salientes a redes sociales).
 * - Permissions-Policy: el sitio no usa cámara, micrófono ni geolocation
 *   del navegador; se declaran deshabilitados.
 *
 * X-Frame-Options, HSTS, nosniff y CSP viven en config/shield.ts.
 */
export default class SecurityHeadersMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    ctx.response.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    ctx.response.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    return next()
  }
}
