import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { Miniatura, ResourcePage } from '~/components/crud/resource_page'
import type { MetaTabla } from '~/components/datatable/data_table'
import type { RecursoConfig, SpecCliente } from '~/components/crud/tipos'

interface Fila {
  id: number
  nombres: string
  documento: string
  correo: string
  fotoUrl: string | null
}

const config: RecursoConfig<Fila> = {
  titulo: 'Usuarios App',
  tituloCrear: 'Nuevo usuario',
  tituloEditar: 'Editar usuario',
  descripcion: 'Vendedores de la app móvil (la tabla "usuarios" del admin viejo).',
  baseUrl: '/app/usuarios-app',
  busquedaPlaceholder: 'Buscar por nombre, documento o correo',
  vacioTitulo: 'Aún no hay usuarios de la app',
  columnas: [
    {
      clave: 'foto',
      titulo: 'Foto',
      render: (f) => <Miniatura url={f.fotoUrl} cuadrada />,
    },
    { clave: 'nombres', titulo: 'Nombres', sortable: true, esTituloCard: true },
    { clave: 'documento', titulo: 'Documento', sortable: true },
    { clave: 'correo', titulo: 'Correo', sortable: true },
  ],
  campos: [
    {
      tipo: 'text',
      nombre: 'nombres',
      etiqueta: 'Nombres y apellidos',
      requerido: true,
      maxLength: 120,
    },
    { tipo: 'text', nombre: 'documento', etiqueta: 'Documento', requerido: true, maxLength: 30 },
    { tipo: 'text', nombre: 'correo', etiqueta: 'Correo', requerido: true, maxLength: 254 },
    { tipo: 'image', nombre: 'foto', etiqueta: 'Foto de perfil', spec: 'fotoPerfil' },
  ],
  etiquetaFila: (f) => f.nombres,
  valoresDe: (f) => ({
    nombres: f.nombres,
    documento: f.documento,
    correo: f.correo,
    foto: f.fotoUrl ? { id: null, url: f.fotoUrl } : null,
  }),
  valoresNuevo: { nombres: '', documento: '', correo: '', foto: null },
  validar: (valores) => {
    const errores: Record<string, string> = {}
    const correo = String(valores.correo ?? '')
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      errores.correo = 'Ingresá un correo válido'
    }
    return errores
  },
}

export default function UsuariosApp(props: {
  registros: { data: Fila[]; meta: MetaTabla }
  specs: Record<string, SpecCliente>
}) {
  return <ResourcePage config={config} registros={props.registros} specs={props.specs} />
}

UsuariosApp.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
