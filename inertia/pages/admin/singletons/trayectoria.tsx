import { type ReactElement } from 'react'
import AdminLayout from '~/layouts/admin'
import { SingletonEditor, type SingletonConfig } from '~/components/crud/singleton_editor'
import type { SpecCliente, ValorImagen } from '~/components/crud/tipos'

interface Datos {
  titulo: string | null
  parrafoUno: string | null
  parrafoDos: string | null
  parrafoTres: string | null
  parrafoCuatro: string | null
  parrafoCinco: string | null
  parrafoSeis: string | null
  imagenUnoUploadId: number | null
  imagenDosUploadId: number | null
  imagenTresUploadId: number | null
}

interface Props {
  datos: Datos | null
  imagenes: Record<string, string | null>
  specs: Record<string, SpecCliente>
}

const config: SingletonConfig = {
  titulo: 'Trayectoria',
  descripcion: 'Sección "Trayectoria" de la página pública /quienes-somos.',
  baseUrl: '/app/trayectoria',
  campos: [
    { tipo: 'text', nombre: 'titulo', etiqueta: 'Título', requerido: true, maxLength: 150 },
    { tipo: 'textarea', nombre: 'parrafoUno', etiqueta: 'Párrafo 1', filas: 4, maxLength: 2000 },
    { tipo: 'textarea', nombre: 'parrafoDos', etiqueta: 'Párrafo 2', filas: 4, maxLength: 2000 },
    { tipo: 'textarea', nombre: 'parrafoTres', etiqueta: 'Párrafo 3', filas: 4, maxLength: 2000 },
    { tipo: 'textarea', nombre: 'parrafoCuatro', etiqueta: 'Párrafo 4', filas: 4, maxLength: 2000 },
    { tipo: 'textarea', nombre: 'parrafoCinco', etiqueta: 'Párrafo 5', filas: 4, maxLength: 2000 },
    { tipo: 'textarea', nombre: 'parrafoSeis', etiqueta: 'Párrafo 6', filas: 4, maxLength: 2000 },
    { tipo: 'image', nombre: 'imagenUno', etiqueta: 'Imagen 1', spec: 'fotoInstitucional' },
    { tipo: 'image', nombre: 'imagenDos', etiqueta: 'Imagen 2', spec: 'fotoInstitucional' },
    { tipo: 'image', nombre: 'imagenTres', etiqueta: 'Imagen 3', spec: 'fotoInstitucional' },
  ],
}

function imagen(id: number | null | undefined, url: string | null | undefined): ValorImagen | null {
  return id ? { id, url: url ?? null } : null
}

export default function Trayectoria({ datos, imagenes, specs }: Props) {
  return (
    <SingletonEditor
      config={config}
      specs={specs}
      valoresIniciales={{
        titulo: datos?.titulo ?? '',
        parrafoUno: datos?.parrafoUno ?? '',
        parrafoDos: datos?.parrafoDos ?? '',
        parrafoTres: datos?.parrafoTres ?? '',
        parrafoCuatro: datos?.parrafoCuatro ?? '',
        parrafoCinco: datos?.parrafoCinco ?? '',
        parrafoSeis: datos?.parrafoSeis ?? '',
        imagenUno: imagen(datos?.imagenUnoUploadId, imagenes.imagenUnoUploadId),
        imagenDos: imagen(datos?.imagenDosUploadId, imagenes.imagenDosUploadId),
        imagenTres: imagen(datos?.imagenTresUploadId, imagenes.imagenTresUploadId),
      }}
    />
  )
}

Trayectoria.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
