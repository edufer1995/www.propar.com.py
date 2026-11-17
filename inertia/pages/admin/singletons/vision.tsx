import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { SingletonEditor, type SingletonConfig } from '~/components/crud/singleton_editor'
import type { SpecCliente, ValorImagen } from '~/components/crud/tipos'

interface Datos {
  titulo: string | null
  parrafoUno: string | null
  imagenUnoUploadId: number | null
}

interface Props {
  datos: Datos | null
  imagenes: Record<string, string | null>
  specs: Record<string, SpecCliente>
}

const config: SingletonConfig = {
  titulo: 'Visión',
  descripcion: 'Sección "Visión" de la página pública /quienes-somos.',
  baseUrl: '/app/vision',
  campos: [
    { tipo: 'text', nombre: 'titulo', etiqueta: 'Título', requerido: true, maxLength: 150 },
    { tipo: 'textarea', nombre: 'parrafoUno', etiqueta: 'Párrafo', filas: 5, maxLength: 2000 },
    { tipo: 'image', nombre: 'imagenUno', etiqueta: 'Imagen', spec: 'fotoInstitucional' },
  ],
}

function imagen(id: number | null | undefined, url: string | null | undefined): ValorImagen | null {
  return id ? { id, url: url ?? null } : null
}

export default function Vision({ datos, imagenes, specs }: Props) {
  return (
    <SingletonEditor
      config={config}
      specs={specs}
      valoresIniciales={{
        titulo: datos?.titulo ?? '',
        parrafoUno: datos?.parrafoUno ?? '',
        imagenUno: imagen(datos?.imagenUnoUploadId, imagenes.imagenUnoUploadId),
      }}
    />
  )
}

Vision.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
