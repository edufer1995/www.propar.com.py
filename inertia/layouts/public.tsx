import { useEffect, useState, type ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Mail, Menu, Phone, X } from 'lucide-react'
import { IconoRed, IconoWhatsApp } from '~/components/public/icons'
import { toast } from '~/lib/swal'
import styles from './public.module.css'

/** Datos del pie que envían todos los controllers públicos. */
export type PiePagina = {
  redes: {
    id: number
    nombre: string
    url: string
    iconoUrl: string | null
    /** Imagen ampliable de la card del home (el pie sigue usando el icono) */
    imagenUrl: string | null
  }[]
  sucursales: {
    id: number
    titulo: string
    coordenadas: { lat: number; lng: number } | null
    horarios: string | null
    telefonos: string | null
  }[]
}

export type RutaPublica =
  'home' | 'public.loteamientos' | 'public.quienesSomos' | 'public.contacto.show'

export const NAV: { label: string; route: RutaPublica; path: string }[] = [
  { label: 'Inicio', route: 'home', path: '/' },
  { label: 'Loteamientos', route: 'public.loteamientos', path: '/loteamientos' },
  { label: 'Quiénes somos', route: 'public.quienesSomos', path: '/quienes-somos' },
]

/** Mensaje precargado del WhatsApp flotante según la página actual. */
function mensajeWhatsApp(pathname: string): string {
  if (pathname.startsWith('/loteamientos')) {
    return 'Hola Propar, estoy interesado/a en un lote y quisiera más información.'
  }
  return 'Hola Propar, vengo del sitio web y quisiera más información.'
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { url, props, flash } = usePage()
  const pathname = url.split('?')[0]

  const piePagina = (props as { piePagina?: PiePagina }).piePagina
  const whatsappVentas = String(props.whatsappVentas ?? '+595976522694')
  const telVentas = String(props.telVentas ?? '+595976522694')
  const contactoEmail = String(props.contactoEmail ?? '')

  const [drawerOpen, setDrawerOpen] = useState(false)

  /** Cierra el drawer al navegar (ajuste de estado durante el render). */
  const [prevUrl, setPrevUrl] = useState(url)
  if (url !== prevUrl) {
    setPrevUrl(url)
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

  const linkWhatsApp = `https://wa.me/${whatsappVentas.replace(/\D/g, '')}?text=${encodeURIComponent(
    mensajeWhatsApp(pathname)
  )}`

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={`${styles.container} ${styles.navbarInner}`}>
          <Link route="home" className={styles.brand} aria-label="Propar Inmobiliaria — Inicio">
            <img src="/img/logo.png" alt="Propar Inmobiliaria" className={styles.brandLogo} />
          </Link>

          <nav className={styles.navLinks} aria-label="Navegación principal">
            {NAV.map((item) => (
              <Link
                key={item.route}
                route={item.route}
                className={[styles.navLink, esActiva(item.path) ? styles.navLinkActive : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-current={esActiva(item.path) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            <Link route="public.contacto.show" className={styles.navCta}>
              Contacto
            </Link>
          </nav>

          <div className={styles.navActions}>
            <button
              className={styles.hamburger}
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
                className={[styles.drawerLink, esActiva(item.path) ? styles.drawerLinkActive : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-current={esActiva(item.path) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            <Link
              route="public.contacto.show"
              className={styles.navCta}
              style={{ justifyContent: 'center' }}
            >
              Contacto
            </Link>
          </nav>
        </>
      )}

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerCta}>
          <div className={`${styles.container} ${styles.footerCtaInner}`}>
            <h2>¿Querés vender una propiedad?</h2>
            <Link
              route="public.contacto.show"
              qs={{ asunto: 'vender-propiedad' }}
              className={styles.footerCtaBtn}
            >
              Contactanos
            </Link>
          </div>
        </div>

        <div className={`${styles.container} ${styles.footerCols}`}>
          <div>
            <img src="/img/logo.png" alt="Propar Inmobiliaria" className={styles.footerLogo} />
            <p className={styles.footerText}>
              Inmobiliaria Propar S.R.L. — lotes en cuotas en Asunción, Ciudad del Este, Encarnación
              y todo el Paraguay.
            </p>
            {piePagina && piePagina.redes.length > 0 && (
              <div className={styles.footerSocial}>
                {piePagina.redes.map((red) => (
                  <a
                    key={red.id}
                    href={red.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={red.nombre}
                    title={red.nombre}
                  >
                    {red.iconoUrl ? (
                      <img className={styles.footerSocialIcono} src={red.iconoUrl} alt="" />
                    ) : (
                      <IconoRed nombre={red.nombre} />
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className={styles.footerTitle}>Sucursales</div>
            <ul className={styles.footerList}>
              {(piePagina?.sucursales ?? []).map((s) => (
                <li key={s.id} className={styles.footerSucursal}>
                  <strong>{s.titulo}</strong>
                  {s.telefonos && <span>{s.telefonos}</span>}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className={styles.footerTitle}>Contacto</div>
            <ul className={styles.footerList}>
              {contactoEmail && (
                <li>
                  <a href={`mailto:${contactoEmail}`}>
                    <Mail size={16} /> {contactoEmail}
                  </a>
                </li>
              )}
              <li>
                <a href={`tel:${telVentas}`}>
                  <Phone size={16} /> {telVentas}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div className={styles.container}>
            © {new Date().getFullYear()} Inmobiliaria Propar S.R.L. — Todos los derechos reservados
          </div>
        </div>
      </footer>

      <a
        href={linkWhatsApp}
        target="_blank"
        rel="noreferrer"
        className={styles.whatsappFab}
        aria-label="Escribinos por WhatsApp"
        title="Escribinos por WhatsApp"
      >
        <IconoWhatsApp size={30} />
      </a>
    </div>
  )
}
