import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { BadgeActivo, Miniatura, ResourcePage } from '~/components/crud/resource_page'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig, SpecCliente } from '~/components/crud/tipos'

interface Fila {
  id: number
  titulo: string | null
  subtitulo: string | null
  descripcion: string | null
  fraccionCodigo: number | null
  url: string | null
  activo: boolean
  imagenUploadId: number | null
  imagenUrl: string | null
}

const config: RecursoConfig<Fila> = {
  titulo: 'Carruseles',
  tituloCrear: 'Nuevo carrusel',
  tituloEditar: 'Editar carrusel',
  descripcion: 'Slides de la portada del sitio. El home muestra los activos, más nuevos primero.',
  baseUrl: '/app/carruseles',
  busquedaPlaceholder: 'Buscar por título o descripción',
  columnas: [
    {
      clave: 'imagen',
      titulo: 'Imagen',
      render: (f) => <Miniatura url={f.imagenUrl} />,
    },
    { clave: 'titulo', titulo: 'Título', sortable: true, esTituloCard: true },
    { clave: 'subtitulo', titulo: 'Subtítulo' },
    { clave: 'fraccionCodigo', titulo: 'Fracción', soloDesktop: true },
    {
      clave: 'estado',
      titulo: 'Estado',
      sortable: true,
      render: (f) => <BadgeActivo activo={f.activo} />,
    },
  ],
  campos: [
    { tipo: 'text', nombre: 'titulo', etiqueta: 'Título', requerido: true, maxLength: 150 },
    { tipo: 'text', nombre: 'subtitulo', etiqueta: 'Subtítulo', maxLength: 150 },
    {
      tipo: 'textarea',
      nombre: 'descripcion',
      etiqueta: 'Descripción',
      maxLength: 600,
      hint: 'En la portada se muestran hasta ~6 líneas (4 en celulares); el resto se corta con "…"',
    },
    {
      tipo: 'number',
      nombre: 'fraccionCodigo',
      etiqueta: 'Nº de fracción',
      min: 1,
      hint: 'El slide linkea a esa fracción en /loteamientos (opcional)',
    },
    {
      tipo: 'text',
      nombre: 'url',
      etiqueta: 'Enlace del botón (opcional)',
      hint: 'Ej.: /abas-guarda. Si se carga, el slide muestra "Conocé más" con este enlace en lugar de "Ver lotes"',
      maxLength: 300,
    },
    { tipo: 'toggle', nombre: 'activo', etiqueta: 'Visible en el home' },
    { tipo: 'image', nombre: 'imagen', etiqueta: 'Imagen del slide', spec: 'carrusel' },
  ],
  etiquetaFila: (f) => f.titulo ?? `carrusel #${f.id}`,
  valoresDe: (f) => ({
    titulo: f.titulo ?? '',
    subtitulo: f.subtitulo ?? '',
    descripcion: f.descripcion ?? '',
    fraccionCodigo: f.fraccionCodigo,
    url: f.url ?? '',
    activo: f.activo,
    imagen: f.imagenUrl ? { id: f.imagenUploadId, url: f.imagenUrl } : null,
  }),
  valoresNuevo: {
    titulo: '',
    subtitulo: '',
    descripcion: '',
    fraccionCodigo: null,
    url: '',
    activo: true,
    imagen: null,
  },
  validar: (valores) => {
    const errores: Record<string, string> = {}
    // Misma regla que urlSegura en el server: ruta interna o http(s) absoluta
    const url = String(valores.url ?? '').trim()
    if (url && !/^(\/(?![/\\])|https?:\/\/)/i.test(url)) {
      errores.url =
        'El enlace debe ser una ruta interna (empezar con "/") o una dirección http:// o https://'
    }
    return errores
  },
}

export default function Carruseles(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  specs: Record<string, SpecCliente>
}) {
  return <ResourcePage config={config} registros={props.registros} specs={props.specs} />
}

Carruseles.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
