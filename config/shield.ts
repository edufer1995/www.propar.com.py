import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/shield'

const shieldConfig = defineConfig({
  /**
   * CSP (Etapa 6). Cubre los dos consumidores externos reales del sitio:
   * Google Maps JS API (script + tiles + fuentes Roboto) y Vite (que en
   * dev corre en modo middleware sobre el mismo origen, HMR incluido).
   *
   * Los scripts inline propios (tema anti-flash del layout y react-refresh
   * de Vite en dev) usan el nonce por request de Shield ('@nonce' +
   * cspNonce en la vista raíz).
   */
  csp: {
    /**
     * Enable the Content-Security-Policy header.
     */
    enabled: true,

    /**
     * Per-resource CSP directives.
     */
    directives: {
      defaultSrc: [`'self'`],
      baseUri: [`'self'`],
      objectSrc: [`'none'`],
      formAction: [`'self'`],
      frameAncestors: [`'none'`],
      scriptSrc: [`'self'`, '@nonce', 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
      /** Vite dev y Google Maps inyectan <style>/style="" en runtime. */
      styleSrc: [`'self'`, `'unsafe-inline'`, 'https://fonts.googleapis.com'],
      imgSrc: [
        `'self'`,
        'data:',
        'blob:',
        'https://*.googleapis.com',
        'https://*.gstatic.com',
        'https://*.ggpht.com',
      ],
      /** Fuentes propias (woff2 locales) + Roboto que carga Google Maps. */
      fontSrc: [`'self'`, 'data:', 'https://fonts.gstatic.com'],
      /** Iframe embebido del mapa de sucursales (home). */
      frameSrc: ['https://maps.google.com', 'https://www.google.com'],
      connectSrc: [
        `'self'`,
        'https://maps.googleapis.com',
        'https://maps.gstatic.com',
        /** Websocket del HMR de Vite (solo dev). */
        ...(app.inProduction ? [] : ['ws:', 'wss:']),
      ],
      workerSrc: [`'self'`, 'blob:'],
    },

    /**
     * Report violations without blocking resources.
     */
    reportOnly: false,
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more.
   */
  csrf: {
    /**
     * Enable CSRF token verification for state-changing requests.
     */
    enabled: true,

    /**
     * Route patterns to exclude from CSRF checks.
     * Useful for external webhooks or API endpoints.
     */
    exceptRoutes: [],

    /**
     * Expose an encrypted XSRF-TOKEN cookie for frontend HTTP clients.
     */
    enableXsrfCookie: true,

    /**
     * HTTP methods protected by CSRF validation.
     */
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Control how your website should be embedded inside
   * iframes.
   */
  xFrame: {
    /**
     * Enable the X-Frame-Options header.
     */
    enabled: true,

    /**
     * Block all framing attempts. Default value is DENY.
     */
    action: 'DENY',
  },

  /**
   * Force browser to always use HTTPS.
   */
  hsts: {
    /**
     * Enable the Strict-Transport-Security header.
     */
    enabled: true,

    /**
     * HSTS policy duration remembered by browsers.
     */
    maxAge: '180 days',
  },

  /**
   * Disable browsers from sniffing content types and rely only
   * on the response content-type header.
   */
  contentTypeSniffing: {
    /**
     * Enable X-Content-Type-Options: nosniff.
     */
    enabled: true,
  },
})

export default shieldConfig
