import { useState, type ReactElement } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Copy, KeyRound } from 'lucide-react'

import AdminLayout from '~/layouts/admin'
import { BadgeActivo, ResourcePage } from '~/components/crud/resource_page'
import { Button, Modal } from '~/components/ui'
import { confirmAccion, toast } from '~/lib/swal'
import { formatDate } from '~/lib/format'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig, SpecCliente } from '~/components/crud/tipos'
import tabla from '~/components/datatable/data_table.module.css'
import styles from '~/components/crud/crud.module.css'

interface Fila {
  id: number
  username: string
  nombre: string | null
  email: string | null
  rolId: number
  rol: string | null
  activo: boolean
  creado: string
}

interface PasswordTemporal {
  username: string
  password: string
}

/**
 * Modal que muestra la contraseña temporal UNA única vez (flash del
 * server al crear o resetear). Al cerrarlo no hay forma de recuperarla:
 * solo generar otra con "Resetear contraseña".
 */
function PasswordTemporalModal({
  datos,
  onClose,
}: {
  datos: PasswordTemporal
  onClose: () => void
}) {
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(datos.password)
      void toast('Contraseña copiada al portapapeles')
    } catch {
      void toast('No se pudo copiar: seleccionala a mano', 'warning')
    }
  }

  return (
    <Modal open onClose={onClose} title={`Contraseña temporal de ${datos.username}`} size="md">
      <div className={styles.form}>
        <p className={styles.avisoForm}>
          Se muestra <strong>una única vez</strong>: copiala y entregásela al usuario. Cuando
          ingrese, puede cambiarla desde “Mi cuenta”.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <code
            style={{
              flex: 1,
              fontSize: 18,
              letterSpacing: 1,
              padding: 'var(--space-3)',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              userSelect: 'all',
            }}
          >
            {datos.password}
          </code>
          <Button type="button" variant="secondary" onClick={() => void copiar()}>
            <Copy size={16} /> Copiar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Usuarios(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  specs: Record<string, SpecCliente>
  roles: { id: number; descripcion: string }[]
}) {
  const { props: pageProps, flash } = usePage()
  const usuarioActualId = (pageProps.user as { id?: number } | undefined)?.id ?? null

  /**
   * Contraseña temporal del flash → modal (visible una única vez).
   * Ajuste de estado durante el render (patrón del proyecto, sin efecto).
   */
  const [passwordTemporal, setPasswordTemporal] = useState<PasswordTemporal | null>(null)
  const flashPassword = (flash as { passwordTemporal?: PasswordTemporal }).passwordTemporal
  const [flashPrevio, setFlashPrevio] = useState<PasswordTemporal | undefined>(undefined)
  if (flashPassword !== flashPrevio) {
    setFlashPrevio(flashPassword)
    if (flashPassword?.password) setPasswordTemporal(flashPassword)
  }

  const resetear = async (fila: Fila) => {
    const confirmado = await confirmAccion(
      `¿Resetear la contraseña de ${fila.username}?`,
      'Se genera una nueva contraseña temporal y la actual deja de servir.',
      'Sí, resetear'
    )
    if (!confirmado) return
    router.post(
      `/app/usuarios/${fila.id}/reset-password`,
      {},
      { preserveScroll: true, preserveState: true }
    )
  }

  const config: RecursoConfig<Fila> = {
    titulo: 'Usuarios',
    tituloCrear: 'Nuevo usuario',
    tituloEditar: 'Editar usuario',
    descripcion:
      'Usuarios del admin. Cargales el email para que funcione “Olvidé mi contraseña”. Al crear se genera una contraseña temporal visible una sola vez.',
    baseUrl: '/app/usuarios',
    busquedaPlaceholder: 'Buscar por usuario, nombre o email',
    columnas: [
      { clave: 'username', titulo: 'Usuario', sortable: true, esTituloCard: true },
      { clave: 'nombre', titulo: 'Nombre', sortable: true },
      { clave: 'email', titulo: 'Email', sortable: true },
      { clave: 'rol', titulo: 'Rol' },
      {
        clave: 'activo',
        titulo: 'Estado',
        sortable: true,
        render: (f) => <BadgeActivo activo={f.activo} />,
      },
      {
        clave: 'creado',
        titulo: 'Creado',
        soloDesktop: true,
        render: (f) => formatDate(f.creado),
      },
    ],
    campos: [
      {
        tipo: 'text',
        nombre: 'username',
        etiqueta: 'Usuario',
        requerido: true,
        soloCrear: true,
        maxLength: 60,
        hint: 'Solo letras, números, punto, guion y guion bajo. No se puede cambiar después.',
      },
      {
        tipo: 'text',
        nombre: 'nombre',
        etiqueta: 'Nombre completo',
        requerido: true,
        maxLength: 120,
      },
      {
        tipo: 'text',
        nombre: 'email',
        etiqueta: 'Email',
        hint: 'Necesario para “Olvidé mi contraseña”',
        maxLength: 254,
      },
      {
        tipo: 'select',
        nombre: 'rolId',
        etiqueta: 'Rol',
        requerido: true,
        opciones: props.roles.map((r) => ({ valor: String(r.id), etiqueta: r.descripcion })),
      },
      { tipo: 'toggle', nombre: 'activo', etiqueta: 'Puede iniciar sesión' },
    ],
    etiquetaFila: (f) => f.username,
    valoresDe: (f) => ({
      username: f.username,
      nombre: f.nombre ?? '',
      email: f.email ?? '',
      rolId: String(f.rolId),
      activo: f.activo,
    }),
    valoresNuevo: {
      username: '',
      nombre: '',
      email: '',
      rolId: String(props.roles[0]?.id ?? 1),
      activo: true,
    },
    validar: (valores) => {
      const errores: Record<string, string> = {}
      const username = String(valores.username ?? '')
      if (username && !/^[a-zA-Z0-9._-]+$/.test(username)) {
        errores.username = 'Solo letras, números, punto, guion y guion bajo'
      }
      const email = String(valores.email ?? '')
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errores.email = 'Ingresá un email válido'
      }
      return errores
    },
    avisoEditar:
      'La contraseña no se edita acá: usá “Resetear contraseña” en la fila para generar una temporal.',
    puedeEliminar: (f) => f.id !== usuarioActualId,
    accionesExtra: (f) => (
      <button
        type="button"
        className={tabla.btnIcono}
        onClick={() => void resetear(f)}
        aria-label={`Resetear contraseña de ${f.username}`}
        title="Resetear contraseña"
      >
        <KeyRound size={16} />
      </button>
    ),
  }

  return (
    <>
      <ResourcePage config={config} registros={props.registros} specs={props.specs} />
      {passwordTemporal && (
        <PasswordTemporalModal datos={passwordTemporal} onClose={() => setPasswordTemporal(null)} />
      )}
    </>
  )
}

Usuarios.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
