import { useEffect, useState } from 'react'
import { usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Menu, X } from 'lucide-react'
import styles from './public.module.css'

export type RutaPublica =
  | 'home'
  | 'public.loteamientos'
  | 'public.quienesSomos'
  | 'public.preguntas'
  | 'public.contacto.show'

/** Menú principal de la maqueta: Inicio, Loteamientos, Nosotros, Preguntas, Contacto. */
export const NAV: { label: string; route: RutaPublica; path: string }[] = [
  { label: 'Inicio', route: 'home', path: '/' },
  { label: 'Loteamientos', route: 'public.loteamientos', path: '/loteamientos' },
  { label: 'Nosotros', route: 'public.quienesSomos', path: '/quienes-somos' },
  { label: 'Preguntas', route: 'public.preguntas', path: '/preguntas-frecuentes' },
  { label: 'Contacto', route: 'public.contacto.show', path: '/contacto' },
]

/**
 * Header del sitio (logo, menú centrado, botón "Deseo vender" y drawer en
 * mobile). Lo comparten el layout público y el de pantalla completa (mapa);
 * cada uno pone el contenedor (sticky o flotante) con `className`.
 */
export function SiteHeader({ className }: { className: string }) {
  const { url } = usePage()
  const pathname = url.split('?')[0]
  const [drawerOpen, setDrawerOpen] = useState(false)

  /** Cierra el drawer al navegar (ajuste de estado durante el render). */
  const [prevPath, setPrevPath] = useState(pathname)
  if (pathname !== prevPath) {
    setPrevPath(pathname)
    setDrawerOpen(false)
  }

  /** Cerrar drawer con Esc. */
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const esActiva = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path))
  const clase = (base: string, activa: string, path: string) =>
    esActiva(path) ? `${base} ${activa}` : base

  return (
    <>
      <header className={className}>
        <div className={`${styles.container} ${styles.navbarInner}`}>
          <Link route="home" className={styles.brand} aria-label="Propar Inmobiliaria — Inicio">
            <img src="/img/logo.png" alt="Propar Inmobiliaria" className={styles.brandLogo} />
          </Link>

          <nav className={styles.navLinks} aria-label="Navegación principal">
            {NAV.map((item) => (
              <Link
                key={item.route}
                route={item.route}
                className={clase(styles.navLink, styles.navLinkActive, item.path)}
                aria-current={esActiva(item.path) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link route="public.vender.show" className={styles.navCta}>
            Deseo vender
          </Link>

          <button
            className={styles.hamburger}
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={drawerOpen}
          >
            <Menu size={26} />
          </button>
        </div>
      </header>

      {drawerOpen && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)} aria-hidden />
          <nav className={styles.drawer} aria-label="Menú">
            <div className={styles.drawerHeader}>
              <img
                src="/img/logo.png"
                alt="Propar Inmobiliaria"
                className={styles.brandLogo}
                style={{ height: 32 }}
              />
              <button
                className={styles.hamburger}
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
                className={clase(styles.drawerLink, styles.drawerLinkActive, item.path)}
                aria-current={esActiva(item.path) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            <Link
              route="public.vender.show"
              className={styles.navCta}
              style={{ display: 'inline-flex', justifyContent: 'center' }}
            >
              Deseo vender
            </Link>
          </nav>
        </>
      )}
    </>
  )
}
