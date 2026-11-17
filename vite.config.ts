import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig({
  plugins: [
    react(),
    adonisjs({
      entryPoints: ['inertia/app.tsx'],
      /** Bundle SSR (Etapa 6): páginas públicas renderizadas en el server. */
      serverEntryPoints: ['inertia/ssr.tsx'],
      reload: ['resources/views/**/*.edge'],
    }),
  ],

  /**
   * Define aliases for importing modules from
   * your frontend code
   */
  resolve: {
    alias: {
      '~/': `${import.meta.dirname}/inertia/`,
      '@generated': `${import.meta.dirname}/.adonisjs/client/`,
    },
  },

  server: {
    watch: {
      ignored: ['**/storage/**', '**/tmp/**'],
    },
  },

  ssr: {
    /**
     * Paquete CJS sin named exports detectables por Node: Vite debe
     * transformarlo (no externalizarlo) para que el SSR pueda resolver
     * `import { MarkerClusterer }`.
     */
    noExternal: ['@googlemaps/markerclusterer'],
  },
})
