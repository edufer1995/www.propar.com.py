import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { BadgeActivo, Miniatura, ResourcePage } from '~/components/crud/resource_page'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig, SpecCliente } from '~/components/crud/tipos'

interface Medio {
  id: number
  url: string | null
}

interface Fila {
  id: number
  codigo: number
  descripcion: string | null
  activo: boolean
  imagenes: Medio[]
  videos: Medio[]
}

const config: RecursoConfig<Fila> = {
  titulo: 'Fracciones',
  tituloCrear: '—',
  tituloEditar: 'Medios de la fracción',
  descripcion:
    'Fotos y videos que muestra el mapa de loteamientos (portada de la card y galería). Las fracciones en sí vienen de la importación: acá solo se cargan sus medios.',
  baseUrl: '/app/fracciones',
  busquedaPlaceholder: 'Buscar por código o nombre',
  /* Nacen del ETL / importación de planos: acá no se crean ni se borran. */
  sinCrear: true,
  sinEliminar: true,
  columnas: [
    {
      clave: 'portada',
      titulo: 'Portada',
      render: (f) => <Miniatura url={f.imagenes[0]?.url ?? null} />,
    },
    { clave: 'codigo', titulo: 'Código', sortable: true },
    { clave: 'descripcion', titulo: 'Nombre', sortable: true, esTituloCard: true },
    {
      clave: 'fotos',
      titulo: 'Fotos',
      soloDesktop: true,
      render: (f) => String(f.imagenes.length),
    },
    {
      clave: 'videos',
      titulo: 'Videos',
      soloDesktop: true,
      render: (f) => String(f.videos.length),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      sortable: true,
      render: (f) => <BadgeActivo activo={f.activo} />,
    },
  ],
  campos: [
    {
      tipo: 'images',
      nombre: 'imagenes',
      etiqueta: 'Galería de fotos',
      spec: 'fotoFraccion',
      maximo: 12,
      hint: 'La primera foto es la portada de la card en el mapa',
    },
    {
      tipo: 'images',
      nombre: 'videos',
      etiqueta: 'Videos',
      spec: 'videoFraccion',
      modo: 'video',
      maximo: 3,
      hint: 'MP4 (H.264), ideal 1080p y 30-90 segundos',
    },
  ],
  etiquetaFila: (f) => f.descripcion ?? `fracción ${f.codigo}`,
  valoresDe: (f) => ({
    imagenes: f.imagenes.map((m) => ({ id: m.id, url: m.url })),
    videos: f.videos.map((m) => ({ id: m.id, url: m.url })),
  }),
  valoresNuevo: {
    imagenes: [],
    videos: [],
  },
}

export default function Fracciones(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  specs: Record<string, SpecCliente>
}) {
  return <ResourcePage config={config} registros={props.registros} specs={props.specs} />
}

Fracciones.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
