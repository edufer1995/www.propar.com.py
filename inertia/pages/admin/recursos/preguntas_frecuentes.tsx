import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { BadgeActivo, ResourcePage } from '~/components/crud/resource_page'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig, SpecCliente } from '~/components/crud/tipos'

interface Fila {
  id: number
  categoria: string
  pregunta: string
  respuesta: string
  orden: number
  activo: boolean
}

/** Mismas categorías que app/validators/preguntas.ts */
const CATEGORIAS = [
  { valor: 'tramites', etiqueta: 'Trámites' },
  { valor: 'cuotas', etiqueta: 'Cuotas y pagos' },
  { valor: 'titulos', etiqueta: 'Títulos' },
  { valor: 'general', etiqueta: 'General' },
]

const etiquetaCategoria = (valor: string) =>
  CATEGORIAS.find((c) => c.valor === valor)?.etiqueta ?? valor

const config: RecursoConfig<Fila> = {
  titulo: 'Preguntas frecuentes',
  tituloCrear: 'Nueva pregunta',
  tituloEditar: 'Editar pregunta',
  descripcion:
    'Se muestran en /preguntas-frecuentes (solo las activas), ordenadas por el campo Orden.',
  baseUrl: '/app/preguntas',
  busquedaPlaceholder: 'Buscar en la pregunta o la respuesta',
  columnas: [
    { clave: 'orden', titulo: 'Orden', sortable: true, soloDesktop: true },
    { clave: 'pregunta', titulo: 'Pregunta', sortable: true, esTituloCard: true },
    {
      clave: 'categoria',
      titulo: 'Categoría',
      sortable: true,
      render: (f) => etiquetaCategoria(f.categoria),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (f) => <BadgeActivo activo={f.activo} genero="f" />,
    },
  ],
  campos: [
    { tipo: 'text', nombre: 'pregunta', etiqueta: 'Pregunta', requerido: true, maxLength: 255 },
    {
      tipo: 'textarea',
      nombre: 'respuesta',
      etiqueta: 'Respuesta',
      requerido: true,
      maxLength: 3000,
      filas: 5,
    },
    {
      tipo: 'select',
      nombre: 'categoria',
      etiqueta: 'Categoría',
      requerido: true,
      opciones: CATEGORIAS,
    },
    {
      tipo: 'number',
      nombre: 'orden',
      etiqueta: 'Orden',
      hint: 'Las de número más bajo aparecen primero.',
      min: 0,
      max: 9999,
      step: 1,
    },
    { tipo: 'toggle', nombre: 'activo', etiqueta: 'Visible en el sitio' },
  ],
  etiquetaFila: (f) => f.pregunta,
  valoresDe: (f) => ({
    pregunta: f.pregunta,
    respuesta: f.respuesta,
    categoria: f.categoria,
    orden: f.orden,
    activo: f.activo,
  }),
  valoresNuevo: { pregunta: '', respuesta: '', categoria: 'tramites', orden: 0, activo: true },
}

export default function PreguntasFrecuentes(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  specs: Record<string, SpecCliente>
}) {
  return <ResourcePage config={config} registros={props.registros} specs={props.specs} />
}

PreguntasFrecuentes.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
