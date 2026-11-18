import { useEffect, useState, type ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Menu, X } from 'lucide-react'
import { NAV } from '~/layouts/public'
import { toast } from '~/lib/swal'
import styles from './public_fullscreen.module.css'
import publicStyles from './public.module.css'

/**
 * Layout público fullscreen (mapa de loteamientos): 100dvh sin scroll,
 * navbar compacta translúcida superpuesta al contenido, sin footer.
 * Los mismos links del PublicLayout, con drawer en mobile.
 */
export default function PublicFullscreenLayout({ children }: { children: ReactNode }) {
  const { url, flash } = usePage()
  const pathname = url.split('?')[0]

  const [drawerOpen, setDrawerOpen] = useState(false)

  /** Cierra el drawer al navegar (ajuste de estado durante el render). */
  const [prevPath, setPrevPath] = useState(pathname)
  if (pathname !== prevPath) {
    setPrevPath(pathname)
    setDrawerOpen(false)
  }

  /** Flash del server → toasts SweetAlert (regla ui-standards). */
  useEffect(() => {
    if (flash.success) toast(flash.success, 'success')
    if (flash.error) toast(flash.error, 'error')
  }, [flash.success, flash.error, url])

  /** Cerrar drawer con Esc. */
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const esActiva = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path))

  return (
    <div className={styles.pantalla}>
      <div className={styles.contenido}>{children}</div>

      {/* Navbar idéntica a la del sitio (mismas clases del layout público):
          solo cambia el contenedor .navbar, que acá flota sobre el mapa. */}
      <header className={styles.navbar}>
        <div className={`${publicStyles.container} ${publicStyles.navbarInner}`}>
          <Link
            route="home"
            className={publicStyles.brand}
            aria-label="Propar Inmobiliaria — Inicio"
          >
            <img src="/img/logo.png" alt="Propar Inmobiliaria" className={publicStyles.brandLogo} />
          </Link>

          <nav className={publicStyles.navLinks} aria-label="Navegación principal">
            {NAV.map((item) => (
              <Link
                key={item.route}
                route={item.route}
                className={[
                  publicStyles.navLink,
                  esActiva(item.path) ? publicStyles.navLinkActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={esActiva(item.path) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            <Link route="public.contacto.show" className={publicStyles.navCta}>
              Contacto
            </Link>
          </nav>

          <div className={publicStyles.navActions}>
            <button
              className={publicStyles.hamburger}
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={drawerOpen}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <>
          <div
            className={publicStyles.drawerOverlay}
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <nav className={publicStyles.drawer} aria-label="Menú">
            <div className={publicStyles.drawerHeader}>
              <img
                src="/img/logo.png"
                alt="Propar Inmobiliaria"
                className={publicStyles.brandLogo}
                style={{ height: 32 }}
              />
              <button
                className={publicStyles.hamburger}
                style={{ display: 'inline-flex' }}
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar menú"
                autoFocus
              >
                <X size={24} />
              </button>
            </div>
            {NAV.map((item) => (
              <Link
                key={item.route}
                route={item.route}
                className={[
                  publicStyles.drawerLink,
                  esActiva(item.path) ? publicStyles.drawerLinkActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={esActiva(item.path) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            <Link
              route="public.contacto.show"
              className={publicStyles.navCta}
              style={{ justifyContent: 'center' }}
            >
              Contacto
            </Link>
          </nav>
        </>
      )}
    </div>
  )
}
