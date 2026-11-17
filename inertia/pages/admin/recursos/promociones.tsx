import { type ReactElement } from 'react'
import { FileText } from 'lucide-react'
import AdminLayout from '~/layouts/admin'
import { BadgeActivo, Miniatura, ResourcePage } from '~/components/crud/resource_page'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig, SpecCliente } from '~/components/crud/tipos'
import { formatDate } from '~/lib/format'

interface Fila {
  id: number
  titulo: string
  descripcion: string | null
  url: string | null
  vigenteDesde: string | null
  vigenteHasta: string | null
  activo: boolean
  modal: boolean
  imagenUploadId: number | null
  imagenUrl: string | null
  pdfUploadId: number | null
  pdfUrl: string | null
  pdfNombre: string | null
}

const config: RecursoConfig<Fila> = {
  titulo: 'Promociones',
  tituloCrear: 'Nueva promoción',
  tituloEditar: 'Editar promoción',
  descripcion:
    'El home muestra las activas cuya vigencia incluye la fecha de hoy. Las marcadas como modal, además, se abren solas al entrar al sitio.',
  baseUrl: '/app/promociones',
  busquedaPlaceholder: 'Buscar por título o descripción',
  columnas: [
    {
      clave: 'imagen',
      titulo: 'Imagen',
      render: (f) => <Miniatura url={f.imagenUrl} />,
    },
    { clave: 'titulo', titulo: 'Título', sortable: true, esTituloCard: true },
    {
      clave: 'vigenteDesde',
      titulo: 'Desde',
      sortable: true,
      render: (f) => formatDate(f.vigenteDesde),
    },
    {
      clave: 'vigenteHasta',
      titulo: 'Hasta',
      sortable: true,
      render: (f) => formatDate(f.vigenteHasta),
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      sortable: true,
      render: (f) => <BadgeActivo activo={f.activo} genero="f" />,
    },
    {
      clave: 'modal',
      titulo: 'Modal',
      sortable: true,
      render: (f) => (f.modal ? 'Sí' : 'No'),
    },
    {
      clave: 'pdf',
      titulo: 'Bases',
      render: (f) =>
        f.pdfUrl ? (
          <a
            href={f.pdfUrl}
            target="_blank"
            rel="noreferrer"
            title={f.pdfNombre ?? 'Bases y condiciones (PDF)'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <FileText size={15} /> PDF
          </a>
        ) : (
          '—'
        ),
    },
  ],
  campos: [
    { tipo: 'text', nombre: 'titulo', etiqueta: 'Título', requerido: true, maxLength: 150 },
    { tipo: 'textarea', nombre: 'descripcion', etiqueta: 'Descripción', maxLength: 600 },
    {
      tipo: 'text',
      nombre: 'url',
      etiqueta: 'URL (opcional)',
      hint: 'Adónde lleva la promoción, ej.: /loteamientos',
      maxLength: 300,
    },
    { tipo: 'date', nombre: 'vigenteDesde', etiqueta: 'Vigente desde' },
    { tipo: 'date', nombre: 'vigenteHasta', etiqueta: 'Vigente hasta' },
    { tipo: 'toggle', nombre: 'activo', etiqueta: 'Activa' },
    {
      tipo: 'toggle',
      nombre: 'modal',
      etiqueta: 'Mostrar como modal al entrar',
      hint: 'La promoción se abre sola en un modal la primera vez que el visitante entra al sitio (además de su card en el home)',
    },
    { tipo: 'image', nombre: 'imagen', etiqueta: 'Imagen', spec: 'cardLanzamiento' },
    {
      tipo: 'pdf',
      nombre: 'pdf',
      etiqueta: 'Bases y condiciones (opcional)',
      spec: 'basesPromocion',
      hint: 'PDF con las bases y condiciones: se ofrece como enlace en la card de la promoción (y en su modal)',
    },
  ],
  etiquetaFila: (f) => f.titulo,
  valoresDe: (f) => ({
    titulo: f.titulo,
    descripcion: f.descripcion ?? '',
    url: f.url ?? '',
    vigenteDesde: f.vigenteDesde ?? '',
    vigenteHasta: f.vigenteHasta ?? '',
    activo: f.activo,
    modal: f.modal,
    imagen: f.imagenUrl ? { id: f.imagenUploadId, url: f.imagenUrl } : null,
    pdf: f.pdfUrl ? { id: f.pdfUploadId, url: f.pdfUrl, nombre: f.pdfNombre } : null,
  }),
  valoresNuevo: {
    titulo: '',
    descripcion: '',
    url: '',
    vigenteDesde: '',
    vigenteHasta: '',
    activo: true,
    modal: false,
    imagen: null,
    pdf: null,
  },
  validar: (valores) => {
    const errores: Record<string, string> = {}
    const desde = String(valores.vigenteDesde ?? '')
    const hasta = String(valores.vigenteHasta ?? '')
    if (desde && hasta && hasta < desde) {
      errores.vigenteHasta = 'La fecha "hasta" debe ser igual o posterior a la fecha "desde"'
    }
    // Misma regla que urlSegura en el server: ruta interna o http(s) absoluta
    const url = String(valores.url ?? '').trim()
    if (url && !/^(\/(?![/\\])|https?:\/\/)/i.test(url)) {
      errores.url =
        'La URL debe ser una ruta interna (empezar con "/") o una dirección http:// o https://'
    }
    return errores
  },
}

export default function Promociones(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  specs: Record<string, SpecCliente>
}) {
  return <ResourcePage config={config} registros={props.registros} specs={props.specs} />
}

Promociones.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
