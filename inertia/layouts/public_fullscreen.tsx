import { useEffect, type ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import { SiteHeader } from '~/layouts/site_header'
import { toast } from '~/lib/swal'
import styles from './public_fullscreen.module.css'

/**
 * Layout público fullscreen (mapa de loteamientos): 100dvh sin scroll,
 * header del sitio superpuesto al contenido, sin footer.
 */
export default function PublicFullscreenLayout({ children }: { children: ReactNode }) {
  const { url, flash } = usePage()

  /** Flash del server → toasts SweetAlert (regla ui-standards). */
  useEffect(() => {
    if (flash.success) toast(flash.success, 'success')
    if (flash.error) toast(flash.error, 'error')
  }, [flash.success, flash.error, url])

  return (
    <div className={styles.pantalla}>
      <div className={styles.contenido}>{children}</div>

      <SiteHeader className={styles.navbar} />
    </div>
  )
}
