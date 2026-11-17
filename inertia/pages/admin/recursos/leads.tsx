import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { ResourcePage } from '~/components/crud/resource_page'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig } from '~/components/crud/tipos'
import { formatDateTime } from '~/lib/format'
import crud from '~/components/crud/crud.module.css'

interface Fila {
  id: number
  tipo: string
  tipoEtiqueta: string
  nombre: string
  telefono: string
  email: string | null
  asunto: string | null
  comentario: string | null
  loteFml: string | null
  precioResumen: string | null
  fecha: string | null
}

const CLASE_TIPO: Record<string, string> = {
  compra: crud.badgeAccent,
  contacto: crud.badgeInfo,
  vender: crud.badgeWarn,
}

function baseConfig(tiposLead: { valor: string; etiqueta: string }[]): RecursoConfig<Fila> {
  return {
    titulo: 'Leads',
    tituloCrear: '',
    tituloEditar: '',
    descripcion:
      'Consultas comerciales que generan los formularios públicos (contacto y compra de lote). Solo lectura.',
    baseUrl: '/app/leads',
    soloLectura: true,
    vacioTitulo: 'Todavía no llegaron consultas',
    busquedaPlaceholder: 'Buscar por nombre, teléfono o email',
    filtros: [{ parametro: 'tipo', etiqueta: 'Tipo', opciones: tiposLead }],
    columnas: [
      {
        clave: 'tipo',
        titulo: 'Tipo',
        sortable: true,
        render: (f) => (
          <span className={[crud.badge, CLASE_TIPO[f.tipo] ?? crud.badgeOff].join(' ')}>
            {f.tipoEtiqueta}
          </span>
        ),
      },
      { clave: 'nombre', titulo: 'Nombre', sortable: true, esTituloCard: true },
      { clave: 'telefono', titulo: 'Teléfono' },
      { clave: 'email', titulo: 'Email' },
      { clave: 'loteFml', titulo: 'Lote' },
      { clave: 'precioResumen', titulo: 'Precio (snapshot)', soloDesktop: true },
      {
        clave: 'createdAt',
        titulo: 'Fecha',
        sortable: true,
        render: (f) => formatDateTime(f.fecha),
      },
    ],
    campos: [],
    etiquetaFila: (f) => `el lead de ${f.nombre}`,
    valoresDe: () => ({}),
    valoresNuevo: {},
  }
}

export default function Leads(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  tiposLead: { valor: string; etiqueta: string }[]
}) {
  return <ResourcePage config={baseConfig(props.tiposLead)} registros={props.registros} />
}

Leads.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
