import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { BadgeActivo, ResourcePage } from '~/components/crud/resource_page'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig, SpecCliente } from '~/components/crud/tipos'

interface Fila {
  id: number
  titulo: string | null
  lat: number | null
  lng: number | null
  horarios: string | null
  telefonos: string | null
  activo: boolean
}

const config: RecursoConfig<Fila> = {
  titulo: 'Sucursales',
  tituloCrear: 'Nueva sucursal',
  tituloEditar: 'Editar sucursal',
  descripcion: 'Se muestran en /contacto y en el pie de página del sitio (solo las activas).',
  baseUrl: '/app/sucursales',
  busquedaPlaceholder: 'Buscar por título, teléfono u horario',
  columnas: [
    { clave: 'titulo', titulo: 'Título', sortable: true, esTituloCard: true },
    { clave: 'telefonos', titulo: 'Teléfonos' },
    { clave: 'horarios', titulo: 'Horarios' },
    {
      clave: 'coordenadas',
      titulo: 'Coordenadas',
      soloDesktop: true,
      render: (f) =>
        f.lat !== null && f.lng !== null ? `${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}` : '—',
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      sortable: true,
      render: (f) => <BadgeActivo activo={f.activo} genero="f" />,
    },
  ],
  campos: [
    { tipo: 'text', nombre: 'titulo', etiqueta: 'Título', requerido: true, maxLength: 120 },
    { tipo: 'latlng', nombre: 'coordenadas', etiqueta: 'Coordenadas', requerido: true },
    {
      tipo: 'text',
      nombre: 'horarios',
      etiqueta: 'Horarios',
      hint: 'Ej.: De lunes a viernes de 8:30 Hs. a 18:00 Hs.',
      maxLength: 255,
    },
    {
      tipo: 'text',
      nombre: 'telefonos',
      etiqueta: 'Teléfonos',
      hint: 'Ej.: +595 21 444 061',
      maxLength: 255,
    },
    { tipo: 'toggle', nombre: 'activo', etiqueta: 'Visible en el sitio' },
  ],
  etiquetaFila: (f) => f.titulo ?? `sucursal #${f.id}`,
  valoresDe: (f) => ({
    titulo: f.titulo ?? '',
    coordenadas: { lat: f.lat ?? '', lng: f.lng ?? '' },
    horarios: f.horarios ?? '',
    telefonos: f.telefonos ?? '',
    activo: f.activo,
  }),
  valoresNuevo: {
    titulo: '',
    coordenadas: { lat: '', lng: '' },
    horarios: '',
    telefonos: '',
    activo: true,
  },
  validar: (valores) => {
    const errores: Record<string, string> = {}
    const c = valores.coordenadas as { lat: unknown; lng: unknown }
    const lat = Number(c.lat)
    const lng = Number(c.lng)
    if (c.lat !== '' && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
      errores.coordenadas = 'La latitud debe estar entre -90 y 90'
    }
    if (c.lng !== '' && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
      errores.coordenadas = 'La longitud debe estar entre -180 y 180'
    }
    return errores
  },
}

export default function Sucursales(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  specs: Record<string, SpecCliente>
}) {
  return <ResourcePage config={config} registros={props.registros} specs={props.specs} />
}

Sucursales.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
