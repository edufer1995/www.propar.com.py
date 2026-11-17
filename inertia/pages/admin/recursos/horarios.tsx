import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { ResourcePage } from '~/components/crud/resource_page'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig, SpecCliente } from '~/components/crud/tipos'
import styles from '~/components/crud/crud.module.css'

interface Fila {
  id: number
  descripcion: string | null
  obs: string | null
  esObservacion: boolean
}

const config: RecursoConfig<Fila> = {
  titulo: 'Horarios',
  tituloCrear: 'Nueva línea',
  tituloEditar: 'Editar línea',
  descripcion:
    'Líneas de "Nuestros horarios" de /parking. Una observación se muestra con su texto de observación en lugar de la descripción.',
  baseUrl: '/app/horarios',
  busquedaPlaceholder: 'Buscar por texto',
  columnas: [
    { clave: 'descripcion', titulo: 'Descripción', sortable: true, esTituloCard: true },
    { clave: 'obs', titulo: 'Observación' },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      render: (f) => (
        <span
          className={[styles.badge, f.esObservacion ? styles.badgeWarn : styles.badgeOk].join(' ')}
        >
          {f.esObservacion ? 'Observación' : 'Horario'}
        </span>
      ),
    },
  ],
  campos: [
    {
      tipo: 'text',
      nombre: 'descripcion',
      etiqueta: 'Descripción',
      maxLength: 255,
      hint: 'Ej.: Lunes a viernes de 6:00 a 21:00',
    },
    {
      tipo: 'text',
      nombre: 'obs',
      etiqueta: 'Observación',
      maxLength: 255,
      hint: 'Ej.: * Los feriados se atiende medio turno',
    },
    {
      tipo: 'toggle',
      nombre: 'obsCheck',
      etiqueta: 'Es una observación (usa el texto de observación)',
    },
  ],
  etiquetaFila: (f) => f.descripcion ?? f.obs ?? `línea #${f.id}`,
  valoresDe: (f) => ({
    descripcion: f.descripcion ?? '',
    obs: f.obs ?? '',
    obsCheck: f.esObservacion,
  }),
  valoresNuevo: {
    descripcion: '',
    obs: '',
    obsCheck: false,
  },
  validar: (valores) => {
    const errores: Record<string, string> = {}
    if (valores.obsCheck && !String(valores.obs ?? '').trim()) {
      errores.obs = 'Una observación necesita su texto'
    }
    if (!valores.obsCheck && !String(valores.descripcion ?? '').trim()) {
      errores.descripcion = 'Un horario necesita su descripción'
    }
    return errores
  },
}

export default function Horarios(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  specs: Record<string, SpecCliente>
}) {
  return <ResourcePage config={config} registros={props.registros} specs={props.specs} />
}

Horarios.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
