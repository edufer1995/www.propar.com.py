import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { ResourcePage } from '~/components/crud/resource_page'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig, SpecCliente } from '~/components/crud/tipos'

interface Fila {
  id: number
  descripcion: string | null
}

const config: RecursoConfig<Fila> = {
  titulo: 'Dirección',
  tituloCrear: 'Nueva línea',
  tituloEditar: 'Editar línea',
  descripcion: 'Líneas de dirección/contacto que muestra la página /parking.',
  baseUrl: '/app/direccion-contacto',
  busquedaPlaceholder: 'Buscar por texto',
  columnas: [{ clave: 'descripcion', titulo: 'Descripción', sortable: true, esTituloCard: true }],
  campos: [
    {
      tipo: 'text',
      nombre: 'descripcion',
      etiqueta: 'Descripción',
      requerido: true,
      maxLength: 255,
      hint: 'Ej.: Azara 279 c/ Chile — Asunción',
    },
  ],
  etiquetaFila: (f) => f.descripcion ?? `línea #${f.id}`,
  valoresDe: (f) => ({ descripcion: f.descripcion ?? '' }),
  valoresNuevo: { descripcion: '' },
}

export default function DireccionContacto(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  specs: Record<string, SpecCliente>
}) {
  return <ResourcePage config={config} registros={props.registros} specs={props.specs} />
}

DireccionContacto.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
