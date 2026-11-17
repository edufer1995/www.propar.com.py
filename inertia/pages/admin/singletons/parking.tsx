import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { SingletonEditor, type SingletonConfig } from '~/components/crud/singleton_editor'
import type { SpecCliente, ValorImagen } from '~/components/crud/tipos'

interface Datos {
  titulo: string | null
  parrafoUno: string | null
  parrafoDos: string | null
  parrafoTres: string | null
  imagenUnoUploadId: number | null
  imagenDosUploadId: number | null
}

interface Props {
  datos: Datos | null
  imagenes: Record<string, string | null>
  specs: Record<string, SpecCliente>
}

const config: SingletonConfig = {
  titulo: 'Parking',
  descripcion:
    'Textos y fotos principales de la página pública /parking (los ítems "Ofrecemos", horarios y dirección se editan en sus propias secciones).',
  baseUrl: '/app/parking',
  campos: [
    { tipo: 'text', nombre: 'titulo', etiqueta: 'Título', requerido: true, maxLength: 150 },
    { tipo: 'textarea', nombre: 'parrafoUno', etiqueta: 'Párrafo 1', filas: 4, maxLength: 2000 },
    { tipo: 'textarea', nombre: 'parrafoDos', etiqueta: 'Párrafo 2', filas: 4, maxLength: 2000 },
    { tipo: 'textarea', nombre: 'parrafoTres', etiqueta: 'Párrafo 3', filas: 4, maxLength: 2000 },
    { tipo: 'image', nombre: 'imagenUno', etiqueta: 'Imagen 1', spec: 'fotoInstitucional' },
    { tipo: 'image', nombre: 'imagenDos', etiqueta: 'Imagen 2', spec: 'fotoInstitucional' },
  ],
}

function imagen(id: number | null | undefined, url: string | null | undefined): ValorImagen | null {
  return id ? { id, url: url ?? null } : null
}

export default function Parking({ datos, imagenes, specs }: Props) {
  return (
    <SingletonEditor
      config={config}
      specs={specs}
      valoresIniciales={{
        titulo: datos?.titulo ?? '',
        parrafoUno: datos?.parrafoUno ?? '',
        parrafoDos: datos?.parrafoDos ?? '',
        parrafoTres: datos?.parrafoTres ?? '',
        imagenUno: imagen(datos?.imagenUnoUploadId, imagenes.imagenUnoUploadId),
        imagenDos: imagen(datos?.imagenDosUploadId, imagenes.imagenDosUploadId),
      }}
    />
  )
}

Parking.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
