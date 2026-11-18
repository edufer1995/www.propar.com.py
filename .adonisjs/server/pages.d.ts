import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'admin/colores': ExtractProps<(typeof import('../../inertia/pages/admin/colores.tsx'))['default']>
    'admin/cuenta': ExtractProps<(typeof import('../../inertia/pages/admin/cuenta.tsx'))['default']>
    'admin/dashboard': ExtractProps<(typeof import('../../inertia/pages/admin/dashboard.tsx'))['default']>
    'admin/lotes_distritos': ExtractProps<(typeof import('../../inertia/pages/admin/lotes_distritos.tsx'))['default']>
    'admin/planos': ExtractProps<(typeof import('../../inertia/pages/admin/planos.tsx'))['default']>
    'admin/recursos/carruseles': ExtractProps<(typeof import('../../inertia/pages/admin/recursos/carruseles.tsx'))['default']>
    'admin/recursos/fracciones': ExtractProps<(typeof import('../../inertia/pages/admin/recursos/fracciones.tsx'))['default']>
    'admin/recursos/leads': ExtractProps<(typeof import('../../inertia/pages/admin/recursos/leads.tsx'))['default']>
    'admin/recursos/preguntas_frecuentes': ExtractProps<(typeof import('../../inertia/pages/admin/recursos/preguntas_frecuentes.tsx'))['default']>
    'admin/recursos/promociones': ExtractProps<(typeof import('../../inertia/pages/admin/recursos/promociones.tsx'))['default']>
    'admin/recursos/redes_sociales': ExtractProps<(typeof import('../../inertia/pages/admin/recursos/redes_sociales.tsx'))['default']>
    'admin/recursos/sucursales': ExtractProps<(typeof import('../../inertia/pages/admin/recursos/sucursales.tsx'))['default']>
    'admin/recursos/usuarios_app': ExtractProps<(typeof import('../../inertia/pages/admin/recursos/usuarios_app.tsx'))['default']>
    'admin/recursos/usuarios': ExtractProps<(typeof import('../../inertia/pages/admin/recursos/usuarios.tsx'))['default']>
    'admin/singletons/mision': ExtractProps<(typeof import('../../inertia/pages/admin/singletons/mision.tsx'))['default']>
    'admin/singletons/producto': ExtractProps<(typeof import('../../inertia/pages/admin/singletons/producto.tsx'))['default']>
    'admin/singletons/quienes_somos': ExtractProps<(typeof import('../../inertia/pages/admin/singletons/quienes_somos.tsx'))['default']>
    'admin/singletons/trayectoria': ExtractProps<(typeof import('../../inertia/pages/admin/singletons/trayectoria.tsx'))['default']>
    'admin/singletons/vision': ExtractProps<(typeof import('../../inertia/pages/admin/singletons/vision.tsx'))['default']>
    'auth/forgot_password': ExtractProps<(typeof import('../../inertia/pages/auth/forgot_password.tsx'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/reset_password': ExtractProps<(typeof import('../../inertia/pages/auth/reset_password.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'public/contacto': ExtractProps<(typeof import('../../inertia/pages/public/contacto.tsx'))['default']>
    'public/deseo_vender': ExtractProps<(typeof import('../../inertia/pages/public/deseo_vender.tsx'))['default']>
    'public/home': ExtractProps<(typeof import('../../inertia/pages/public/home.tsx'))['default']>
    'public/loteamientos': ExtractProps<(typeof import('../../inertia/pages/public/loteamientos.tsx'))['default']>
    'public/preguntas_frecuentes': ExtractProps<(typeof import('../../inertia/pages/public/preguntas_frecuentes.tsx'))['default']>
    'public/quienes_somos': ExtractProps<(typeof import('../../inertia/pages/public/quienes_somos.tsx'))['default']>
    'styleguide': ExtractProps<(typeof import('../../inertia/pages/styleguide.tsx'))['default']>
  }
}
