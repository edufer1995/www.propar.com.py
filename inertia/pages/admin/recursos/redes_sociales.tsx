import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { BadgeActivo, Miniatura, ResourcePage } from '~/components/crud/resource_page'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig, SpecCliente } from '~/components/crud/tipos'

interface Fila {
  id: number
  nombre: string
  url: string
  orden: number
  activo: boolean
  iconoUploadId: number | null
  iconoUrl: string | null
  imagenUploadId: number | null
  imagenUrl: string | null
}

const config: RecursoConfig<Fila> = {
  titulo: 'Redes sociales',
  tituloCrear: 'Nueva red social',
  tituloEditar: 'Editar red social',
  descripcion:
    'Iconos del pie de página del sitio (solo las activas, por orden). La imagen es opcional: si la cargás, la card del home la muestra y suma el botón para verla en grande.',
  baseUrl: '/app/redes-sociales',
  busquedaPlaceholder: 'Buscar por nombre o URL',
  columnas: [
    {
      clave: 'icono',
      titulo: 'Icono',
      render: (f) => <Miniatura url={f.iconoUrl} cuadrada />,
    },
    {
      clave: 'imagen',
      titulo: 'Imagen',
      soloDesktop: true,
      render: (f) => <Miniatura url={f.imagenUrl} />,
    },
    { clave: 'nombre', titulo: 'Nombre', sortable: true, esTituloCard: true },
    { clave: 'url', titulo: 'URL' },
    { clave: 'orden', titulo: 'Orden', sortable: true },
    {
      clave: 'activo',
      titulo: 'Estado',
      sortable: true,
      render: (f) => <BadgeActivo activo={f.activo} genero="f" />,
    },
  ],
  campos: [
    { tipo: 'text', nombre: 'nombre', etiqueta: 'Nombre', requerido: true, maxLength: 80 },
    {
      tipo: 'text',
      nombre: 'url',
      etiqueta: 'URL',
      requerido: true,
      hint: 'Ej.: https://www.facebook.com/AbasInmobiliaria/',
      maxLength: 300,
    },
    { tipo: 'number', nombre: 'orden', etiqueta: 'Orden', requerido: true, min: 0 },
    { tipo: 'toggle', nombre: 'activo', etiqueta: 'Visible en el sitio' },
    { tipo: 'image', nombre: 'icono', etiqueta: 'Icono', spec: 'iconoRed' },
    {
      tipo: 'image',
      nombre: 'imagen',
      etiqueta: 'Imagen ampliable (opcional)',
      spec: 'imagenRed',
      hint: 'Se muestra en la card del home y se abre a pantalla completa desde el botón de ampliar.',
    },
  ],
  etiquetaFila: (f) => f.nombre,
  valoresDe: (f) => ({
    nombre: f.nombre,
    url: f.url,
    orden: f.orden,
    activo: f.activo,
    icono: f.iconoUrl ? { id: f.iconoUploadId, url: f.iconoUrl } : null,
    imagen: f.imagenUrl ? { id: f.imagenUploadId, url: f.imagenUrl } : null,
  }),
  valoresNuevo: { nombre: '', url: '', orden: 0, activo: true, icono: null, imagen: null },
  validar: (valores) => {
    const errores: Record<string, string> = {}
    const url = String(valores.url ?? '')
    if (url && !/^https?:\/\/.+/.test(url)) {
      errores.url = 'La URL debe empezar con http:// o https://'
    }
    return errores
  },
}

export default function RedesSociales(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  specs: Record<string, SpecCliente>
}) {
  return <ResourcePage config={config} registros={props.registros} specs={props.specs} />
}

RedesSociales.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
