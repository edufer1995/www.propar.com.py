import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { BadgeActivo, Miniatura, ResourcePage } from '~/components/crud/resource_page'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig, SpecCliente } from '~/components/crud/tipos'
import { formatGs } from '~/lib/format'

interface Fila {
  id: number
  direccion: string | null
  ubicacion: string | null
  contacto: string | null
  precioMensual: number | null
  precioGarantia: number | null
  habitaciones: number | null
  banos: number | null
  cocinas: number | null
  observaciones: string | null
  expensas: boolean
  balcon: boolean
  lat: number | null
  lng: number | null
  activo: boolean
  imagenes: { id: number; url: string | null }[]
}

const config: RecursoConfig<Fila> = {
  titulo: 'Alquileres',
  tituloCrear: 'Nuevo alquiler',
  tituloEditar: 'Editar alquiler',
  descripcion: 'Propiedades de /alquileres (el sitio muestra las activas, más nuevas primero).',
  baseUrl: '/app/alquileres',
  busquedaPlaceholder: 'Buscar por dirección, ubicación o contacto',
  columnas: [
    {
      clave: 'foto',
      titulo: 'Foto',
      render: (f) => <Miniatura url={f.imagenes[0]?.url ?? null} />,
    },
    { clave: 'direccion', titulo: 'Dirección', sortable: true, esTituloCard: true },
    { clave: 'ubicacion', titulo: 'Ubicación', sortable: true },
    {
      clave: 'precioMensual',
      titulo: 'Precio mensual',
      sortable: true,
      render: (f) => (f.precioMensual !== null ? formatGs(f.precioMensual) : '—'),
    },
    {
      clave: 'ambientes',
      titulo: 'Ambientes',
      soloDesktop: true,
      render: (f) =>
        [
          f.habitaciones !== null ? `${f.habitaciones} hab.` : null,
          f.banos !== null ? `${f.banos} baños` : null,
          f.cocinas !== null ? `${f.cocinas} coc.` : null,
        ]
          .filter(Boolean)
          .join(' · ') || '—',
    },
    {
      clave: 'fotos',
      titulo: 'Fotos',
      soloDesktop: true,
      render: (f) => String(f.imagenes.length),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      sortable: true,
      render: (f) => <BadgeActivo activo={f.activo} />,
    },
  ],
  campos: [
    { tipo: 'text', nombre: 'direccion', etiqueta: 'Dirección', requerido: true, maxLength: 255 },
    {
      tipo: 'text',
      nombre: 'ubicacion',
      etiqueta: 'Ubicación (barrio/ciudad)',
      hint: 'Alimenta el filtro de ubicación del sitio; usá siempre el mismo texto',
      maxLength: 120,
    },
    { tipo: 'text', nombre: 'contacto', etiqueta: 'Contacto', maxLength: 255 },
    {
      tipo: 'number',
      nombre: 'precioMensual',
      etiqueta: 'Precio mensual (Gs.)',
      min: 0,
      step: 1000,
    },
    {
      tipo: 'number',
      nombre: 'precioGarantia',
      etiqueta: 'Garantía (Gs.)',
      min: 0,
      step: 1000,
    },
    { tipo: 'number', nombre: 'habitaciones', etiqueta: 'Habitaciones', min: 0, max: 50 },
    { tipo: 'number', nombre: 'banos', etiqueta: 'Baños', min: 0, max: 50 },
    { tipo: 'number', nombre: 'cocinas', etiqueta: 'Cocinas', min: 0, max: 50 },
    { tipo: 'toggle', nombre: 'expensas', etiqueta: 'Paga expensas' },
    { tipo: 'toggle', nombre: 'balcon', etiqueta: 'Tiene balcón' },
    {
      tipo: 'textarea',
      nombre: 'observaciones',
      etiqueta: 'Observaciones',
      filas: 4,
      maxLength: 2000,
    },
    {
      tipo: 'latlng',
      nombre: 'coordenadas',
      etiqueta: 'Ubicación en el mapa',
      mapa: true,
      hint: 'Opcional: click en el mapa para marcarla',
    },
    { tipo: 'images', nombre: 'imagenes', etiqueta: 'Galería de fotos', spec: 'fotoAlquiler' },
    { tipo: 'toggle', nombre: 'activo', etiqueta: 'Visible en el sitio' },
  ],
  etiquetaFila: (f) => f.direccion ?? `alquiler #${f.id}`,
  valoresDe: (f) => ({
    direccion: f.direccion ?? '',
    ubicacion: f.ubicacion ?? '',
    contacto: f.contacto ?? '',
    precioMensual: f.precioMensual,
    precioGarantia: f.precioGarantia,
    habitaciones: f.habitaciones,
    banos: f.banos,
    cocinas: f.cocinas,
    expensas: f.expensas,
    balcon: f.balcon,
    observaciones: f.observaciones ?? '',
    coordenadas: { lat: f.lat ?? '', lng: f.lng ?? '' },
    imagenes: f.imagenes.map((i) => ({ id: i.id, url: i.url })),
    activo: f.activo,
  }),
  valoresNuevo: {
    direccion: '',
    ubicacion: '',
    contacto: '',
    precioMensual: null,
    precioGarantia: null,
    habitaciones: null,
    banos: null,
    cocinas: null,
    expensas: false,
    balcon: false,
    observaciones: '',
    coordenadas: { lat: '', lng: '' },
    imagenes: [],
    activo: true,
  },
  validar: (valores) => {
    const errores: Record<string, string> = {}
    const c = valores.coordenadas as { lat: unknown; lng: unknown }
    const tieneLat = c.lat !== '' && c.lat !== null
    const tieneLng = c.lng !== '' && c.lng !== null
    if (tieneLat !== tieneLng) {
      errores.coordenadas = 'La ubicación necesita latitud y longitud (o ninguna)'
    }
    if (tieneLat && (Number.isNaN(Number(c.lat)) || Math.abs(Number(c.lat)) > 90)) {
      errores.coordenadas = 'La latitud debe estar entre -90 y 90'
    }
    if (tieneLng && (Number.isNaN(Number(c.lng)) || Math.abs(Number(c.lng)) > 180)) {
      errores.coordenadas = 'La longitud debe estar entre -180 y 180'
    }
    return errores
  },
}

export default function Alquileres(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  specs: Record<string, SpecCliente>
}) {
  return <ResourcePage config={config} registros={props.registros} specs={props.specs} />
}

Alquileres.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
