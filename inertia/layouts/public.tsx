import { useEffect, type ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Mail, Phone } from 'lucide-react'
import { IconoRed, IconoWhatsApp } from '~/components/public/icons'
import { toast } from '~/lib/swal'
import { SiteHeader } from '~/layouts/site_header'
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
    direccion: string | null
    horarios: string | null
    telefonos: string | null
  }[]
}

export { NAV, type RutaPublica } from '~/layouts/site_header'

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
  const sucursalPrincipal = piePagina?.sucursales[0]
  const whatsappVentas = String(props.whatsappVentas ?? '+595976522694')
  const telVentas = String(props.telVentas ?? '+595976522694')
  const contactoEmail = String(props.contactoEmail ?? '')

  /** Flash del server → toasts SweetAlert (regla ui-standards). */
  useEffect(() => {
    if (flash.success) toast(flash.success, 'success')
    if (flash.error) toast(flash.error, 'error')
  }, [flash.success, flash.error, url])

  const linkWhatsApp = `https://wa.me/${whatsappVentas.replace(/\D/g, '')}?text=${encodeURIComponent(
    mensajeWhatsApp(pathname)
  )}`

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={`${styles.container} ${styles.topbarInner}`}>
          <span>Lotes en cuotas en todo el Paraguay desde 1986</span>
          {/* Horario de la primera sucursal activa (la casa central), editable
              desde el admin en Sucursales. */}
          {sucursalPrincipal?.horarios && (
            <span className={styles.topbarExtra}>
              {sucursalPrincipal.titulo} · {sucursalPrincipal.horarios}
            </span>
          )}
        </div>
      </div>
      <SiteHeader className={styles.navbar} />

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerCols}`}>
          <div>
            <img
              src="/img/propar-logo-blanco.svg"
              alt="Propar Inmobiliaria"
              className={styles.footerLogo}
            />
            <p className={styles.footerText}>
              <strong className={styles.footerLema}>El camino a la casa propia.</strong>
              Desarrollo y venta de loteamientos en el Paraguay desde 1986.
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
            <div className={styles.footerTitle}>Propar</div>
            <ul className={styles.footerList}>
              <li>
                <Link route="public.loteamientos">Loteamientos</Link>
              </li>
              <li>
                <Link route="public.vender.show">Deseo vender</Link>
              </li>
              <li>
                <Link route="public.quienesSomos">Nosotros</Link>
              </li>
            </ul>
          </div>

          <div>
            <div className={styles.footerTitle}>Ayuda</div>
            <ul className={styles.footerList}>
              <li>
                <Link route="public.preguntas">Preguntas frecuentes</Link>
              </li>
              <li>
                <Link route="public.contacto.show">Contacto</Link>
              </li>
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

          <div>
            <div className={styles.footerTitle}>Sucursales</div>
            <ul className={styles.footerList}>
              {(piePagina?.sucursales ?? []).map((s) => (
                <li key={s.id} className={styles.footerSucursal}>
                  <strong>{s.titulo}</strong>
                  {s.direccion && <span>{s.direccion}</span>}
                  {s.telefonos && <span>{s.telefonos}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div className={styles.container}>
            © {new Date().getFullYear()} Inmobiliaria Propar S.R.L. · Todos los derechos reservados
          </div>
        </div>
      </footer>

      <a
        href={linkWhatsApp}
        target="_blank"
        rel="noreferrer"
        className={styles.whatsappFab}
        aria-label="Escríbenos por WhatsApp"
        title="Escríbenos por WhatsApp"
      >
        <IconoWhatsApp size={30} />
      </a>
    </div>
  )
}
