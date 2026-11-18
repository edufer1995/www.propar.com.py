import { Head, usePage } from '@inertiajs/react'

/**
 * Meta tags SEO de las páginas públicas (Etapa 6): title único, meta
 * description y Open Graph. El title pasa por el mismo sufijo
 * " - Propar Inmobiliaria" que aplica el cliente (app.tsx), para que el
 * HTML SSR y el cliente coincidan.
 */
export function Seo({ title, description }: { title: string; description: string }) {
  const { url, props } = usePage()
  const appName = import.meta.env.VITE_APP_NAME || 'Propar Inmobiliaria'
  const origen = String((props as { appUrl?: string }).appUrl ?? '').replace(/\/$/, '')
  const ruta = url.split('?')[0]
  const urlCanonica = origen ? `${origen}${ruta === '/' ? '/' : ruta}` : undefined

  return (
    <Head title={title}>
      <meta name="description" content={description} />
      {urlCanonica && <link rel="canonical" href={urlCanonica} />}
      <meta property="og:title" content={`${title} - ${appName}`} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      {urlCanonica && <meta property="og:url" content={urlCanonica} />}
      <meta property="og:site_name" content={appName} />
      <meta property="og:locale" content="es_PY" />
    </Head>
  )
}
