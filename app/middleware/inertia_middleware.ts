import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import UserTransformer from '#transformers/user_transformer'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'

/** Defaults del sitio viejo si no hay env (número de ventas / central). */
const WHATSAPP_VENTAS_DEFAULT = '+59521444061'
const TEL_VENTAS_DEFAULT = '+59521444061'

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  share(ctx: HttpContext) {
    /**
     * The share method is called everytime an Inertia page is rendered. In
     * certain cases, a page may get rendered before the session middleware
     * or the auth middleware are executed. For example: During a 404 request.
     *
     * In that case, we must always assume that HttpContext is not fully hydrated
     * with all the properties
     */
    const { auth } = ctx as Partial<HttpContext>

    /**
     * Data shared with all Inertia pages. Make sure you are using
     * transformers for rich data-types like Models.
     */
    return {
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      user: ctx.inertia.always(auth?.user ? UserTransformer.transform(auth.user) : undefined),
      /**
       * Contacto comercial global (botón flotante de WhatsApp y teléfono
       * visible en el layout público).
       */
      whatsappVentas: ctx.inertia.always(env.get('WHATSAPP_VENTAS', WHATSAPP_VENTAS_DEFAULT)),
      telVentas: ctx.inertia.always(env.get('TEL_VENTAS', TEL_VENTAS_DEFAULT)),
      /** Origen canónico del sitio (og:url y canonical de las páginas públicas). */
      appUrl: ctx.inertia.always(env.get('APP_URL')),
      /** Config pública para el frontend (mapa de loteamientos). */
      config: ctx.inertia.always({
        mapsApiKey: env.get('GOOGLE_MAPS_API_KEY'),
      }),
    }
  }

  /**
   * The flash bag is sent to every Inertia page as a top-level "flash" field
   * (a sibling of "props") and is read on the client using "usePage().flash".
   *
   * Just like the share method, the flash method may run before the session
   * middleware, so HttpContext must be treated as partially hydrated.
   */
  flash(ctx: HttpContext) {
    const { session } = ctx as Partial<HttpContext>

    /**
     * Fetching the first error from the flash messages
     */
    return {
      error: session?.flashMessages.get('error') as string | undefined,
      success: session?.flashMessages.get('success') as string | undefined,
      /**
       * Contraseña temporal recién generada (crear/resetear usuario del
       * admin): se muestra UNA única vez en un modal con botón copiar.
       */
      passwordTemporal: session?.flashMessages.get('passwordTemporal') as
        { username: string; password: string } | undefined,
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }
}

declare module '@adonisjs/inertia/types' {
  type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>
  export interface SharedProps extends MiddlewareSharedProps {}
}
