import { useEffect, useState, type ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { House, KeyRound, LogOut, Menu, PanelLeftClose, X } from 'lucide-react'
import { Spinner } from '~/components/ui'
import { toast } from '~/lib/swal'
import { useIsMobile } from '~/hooks/use_media_query'
import styles from './admin.module.css'

/** Ítem del menú: todas las secciones navegan a su ruta real (sin placeholders). */
type RutaNav =
  | 'app.dashboard'
  | 'app.perfil'
  | 'app.carruseles.index'
  | 'app.promociones.index'
  | 'app.redesSociales.index'
  | 'app.sucursales.index'
  | 'app.preguntas.index'
  | 'app.leads.index'
  | 'app.usuariosApp.index'
  | 'app.planos.index'
  | 'app.fracciones.index'
  | 'app.colores.index'
  | 'app.lotesDistritos.index'
  | 'app.usuarios.index'
  | 'app.quienesSomos.show'
  | 'app.trayectoria.show'
  | 'app.mision.show'
  | 'app.vision.show'
  | 'app.producto.show'

/**
 * minNivel replica la política de roles de start/routes.ts (la autoridad es
 * el middleware.role del server; acá solo se oculta lo inaccesible):
 * 1 = solo Administrador · 2 = Administrador y Vendedor · sin minNivel =
 * todo usuario autenticado (niveles 3 y 4 incluidos).
 */
type NavItem = { label: string; route: RutaNav; minNivel?: number }

type NavGroup = { title: string | null; items: NavItem[] }

const NAV: NavGroup[] = [
  { title: null, items: [{ label: 'Inicio', route: 'app.dashboard' }] },
  {
    title: 'Sitio',
    items: [
      { label: 'Carruseles', route: 'app.carruseles.index', minNivel: 2 },
      { label: 'Promociones', route: 'app.promociones.index', minNivel: 2 },
      { label: 'Redes sociales', route: 'app.redesSociales.index', minNivel: 2 },
    ],
  },
  {
    title: 'Loteamientos',
    items: [
      { label: 'Planos', route: 'app.planos.index', minNivel: 2 },
      { label: 'Fracciones (medios)', route: 'app.fracciones.index', minNivel: 2 },
      { label: 'Colores', route: 'app.colores.index', minNivel: 2 },
      { label: 'Lotes por distrito', route: 'app.lotesDistritos.index', minNivel: 2 },
    ],
  },
  {
    title: 'Institucional',
    items: [
      { label: 'Quiénes somos', route: 'app.quienesSomos.show', minNivel: 2 },
      { label: 'Trayectoria', route: 'app.trayectoria.show', minNivel: 2 },
      { label: 'Misión', route: 'app.mision.show', minNivel: 2 },
      { label: 'Visión', route: 'app.vision.show', minNivel: 2 },
      { label: 'Producto', route: 'app.producto.show', minNivel: 2 },
      { label: 'Preguntas frecuentes', route: 'app.preguntas.index', minNivel: 2 },
    ],
  },
  {
    title: 'Contacto',
    items: [
      { label: 'Sucursales', route: 'app.sucursales.index', minNivel: 2 },
      { label: 'Leads', route: 'app.leads.index', minNivel: 1 },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Usuarios', route: 'app.usuarios.index', minNivel: 1 },
      { label: 'Usuarios App', route: 'app.usuariosApp.index', minNivel: 1 },
      { label: 'Mi cuenta', route: 'app.perfil' },
    ],
  },
]

const RUTA_URL: Record<RutaNav, string> = {
  'app.dashboard': '/app',
  'app.perfil': '/app/perfil',
  'app.carruseles.index': '/app/carruseles',
  'app.promociones.index': '/app/promociones',
  'app.redesSociales.index': '/app/redes-sociales',
  'app.sucursales.index': '/app/sucursales',
  'app.preguntas.index': '/app/preguntas',
  'app.leads.index': '/app/leads',
  'app.usuariosApp.index': '/app/usuarios-app',
  'app.planos.index': '/app/planos',
  'app.fracciones.index': '/app/fracciones',
  'app.colores.index': '/app/colores',
  'app.lotesDistritos.index': '/app/lotes-por-distrito',
  'app.usuarios.index': '/app/usuarios',
  'app.quienesSomos.show': '/app/quienes-somos',
  'app.trayectoria.show': '/app/trayectoria',
  'app.mision.show': '/app/mision',
  'app.vision.show': '/app/vision',
  'app.producto.show': '/app/producto',
}

function NavLinkItem({ item, currentUrl }: { item: NavItem; currentUrl: string }) {
  const esInicio = item.route === 'app.dashboard'
  const esPerfil = item.route === 'app.perfil'
  const icon = esInicio ? <House size={17} /> : esPerfil ? <KeyRound size={17} /> : null

  const active = currentUrl.split('?')[0] === RUTA_URL[item.route]
  return (
    <Link
      route={item.route}
      className={[styles.navLink, active ? styles.navLinkActive : ''].filter(Boolean).join(' ')}
      aria-current={active ? 'page' : undefined}
    >
      {icon}
      {item.label}
    </Link>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { url, props, flash } = usePage()
  const isMobile = useIsMobile()
  /** Mobile: drawer cerrado por defecto. Desktop: sidebar visible, colapsable. */
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const user = props.user
  /** Sin nivel conocido se asume el mínimo privilegio (solo dashboard/perfil). */
  const nivel = user?.rolNivel ?? Number.MAX_SAFE_INTEGER
  const navVisible = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.minNivel === undefined || nivel <= item.minNivel),
  })).filter((group) => group.items.length > 0)

  /** Cierra el drawer al navegar (ajuste de estado durante el render). */
  const [prevUrl, setPrevUrl] = useState(url)
  if (url !== prevUrl) {
    setPrevUrl(url)
    if (drawerOpen) setDrawerOpen(false)
  }

  /** Flash del server → toasts SweetAlert (vía ~/lib/swal, único punto). */
  useEffect(() => {
    if (flash.success) toast(flash.success, 'success')
    if (flash.error) toast(flash.error, 'error')
  }, [flash.success, flash.error])

  const sidebarVisible = isMobile ? drawerOpen : !collapsed

  return (
    <div className={styles.shell}>
      <aside
        className={[
          styles.sidebar,
          isMobile && drawerOpen ? styles.sidebarOpen : '',
          !isMobile && collapsed ? styles.sidebarClosed : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Menú principal"
        aria-hidden={!sidebarVisible}
      >
        <div className={styles.sidebarHeader}>
          <Link route="app.dashboard" style={{ textDecoration: 'none' }}>
            <img src="/img/logo.png" alt="Propar Inmobiliaria" className={styles.logoImg} />
          </Link>
          <button
            className={styles.iconBtn}
            onClick={() => (isMobile ? setDrawerOpen(false) : setCollapsed(true))}
            aria-label="Cerrar menú"
          >
            {isMobile ? <X size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <nav className={styles.nav}>
          {navVisible.map((group, i) => (
            <div className={styles.group} key={group.title ?? `single-${i}`}>
              {group.title && <div className={styles.groupTitle}>{group.title}</div>}
              {group.items.map((item) => (
                <NavLinkItem key={item.label} item={item} currentUrl={url} />
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {isMobile && drawerOpen && (
        <button
          className={styles.overlay}
          onClick={() => setDrawerOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <div
        className={[styles.main, !isMobile && collapsed ? styles.mainWide : '']
          .filter(Boolean)
          .join(' ')}
      >
        <header className={styles.topbar}>
          {(isMobile || collapsed) && (
            <button
              className={styles.iconBtn}
              onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(false))}
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
          )}
          <span className={styles.saludo}>Hola, {user?.nombre ?? user?.username}</span>
          <div className={styles.topbarSpacer} />
          <span className={styles.avatar} aria-hidden>
            {user?.initials}
          </span>
          <Form route="auth.logout">
            {({ processing }) => (
              <button
                type="submit"
                className={styles.iconBtn}
                disabled={processing}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                {processing ? <Spinner /> : <LogOut size={20} />}
              </button>
            )}
          </Form>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
