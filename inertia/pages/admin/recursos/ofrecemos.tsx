import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { Miniatura, ResourcePage } from '~/components/crud/resource_page'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig, SpecCliente } from '~/components/crud/tipos'
import styles from '~/components/crud/crud.module.css'

interface Fila {
  id: number
  descripcion: string | null
  esImagen: boolean
  imagenUploadId: number | null
  imagenUrl: string | null
}

const config: RecursoConfig<Fila> = {
  titulo: 'Ofrecemos',
  tituloCrear: 'Nuevo ítem',
  tituloEditar: 'Editar ítem',
  descripcion:
    'Ítems de la sección "Ofrecemos" de /parking: bullets de texto o fotos de la galería (según el toggle).',
  baseUrl: '/app/ofrecemos',
  busquedaPlaceholder: 'Buscar por descripción',
  columnas: [
    {
      clave: 'imagen',
      titulo: 'Foto',
      render: (f) => <Miniatura url={f.imagenUrl} />,
    },
    { clave: 'descripcion', titulo: 'Descripción', sortable: true, esTituloCard: true },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      render: (f) => (
        <span className={[styles.badge, f.esImagen ? styles.badgeInfo : styles.badgeOk].join(' ')}>
          {f.esImagen ? 'Foto' : 'Texto'}
        </span>
      ),
    },
  ],
  campos: [
    {
      tipo: 'textarea',
      nombre: 'descripcion',
      etiqueta: 'Descripción',
      filas: 2,
      maxLength: 600,
      hint: 'Obligatoria para los ítems de texto',
    },
    {
      tipo: 'toggle',
      nombre: 'imagenCheck',
      etiqueta: 'Es una foto de la galería (no un bullet de texto)',
    },
    { tipo: 'image', nombre: 'imagen', etiqueta: 'Foto', spec: 'fotoInstitucional' },
  ],
  etiquetaFila: (f) => f.descripcion ?? `ítem #${f.id}`,
  valoresDe: (f) => ({
    descripcion: f.descripcion ?? '',
    imagenCheck: f.esImagen,
    imagen: f.imagenUrl ? { id: f.imagenUploadId, url: f.imagenUrl } : null,
  }),
  valoresNuevo: {
    descripcion: '',
    imagenCheck: false,
    imagen: null,
  },
  validar: (valores) => {
    const errores: Record<string, string> = {}
    if (!valores.imagenCheck && !String(valores.descripcion ?? '').trim()) {
      errores.descripcion = 'Un ítem de texto necesita su descripción'
    }
    if (valores.imagenCheck && !valores.imagen) {
      errores.imagen = 'Un ítem de foto necesita su imagen'
    }
    return errores
  },
}

export default function Ofrecemos(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  specs: Record<string, SpecCliente>
}) {
  return <ResourcePage config={config} registros={props.registros} specs={props.specs} />
}

Ofrecemos.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
