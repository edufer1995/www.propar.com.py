import { defineConfig } from '@adonisjs/inertia'

const inertiaConfig = defineConfig({
  /**
   * SSR selectivo (Etapa 6): solo las páginas públicas se renderizan en el
   * servidor (SEO). Admin, auth, errores y styleguide quedan client-only.
   *
   * Nota: /loteamientos SSRea los paneles y contadores; el mapa de Google
   * se monta recién en el cliente (guard de montaje en la página).
   */
  ssr: {
    /**
     * Toggle SSR mode for Inertia pages.
     */
    enabled: true,

    /**
     * Entry file used by the SSR server build.
     */
    entrypoint: 'inertia/ssr.tsx',

    /**
     * Cherry-pick: pages/public/** únicamente.
     */
    pages: (_ctx, page) => page.startsWith('public/'),
  },
})

export default inertiaConfig
