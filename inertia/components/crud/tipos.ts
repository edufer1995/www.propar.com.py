/*
|--------------------------------------------------------------------------
| Tipos del motor CRUD (frontend)
|--------------------------------------------------------------------------
|
| Cada recurso del admin se describe con un RecursoConfig: columnas de la
| tabla, campos tipados del formulario y textos. La página del recurso es
| solo `<ResourcePage config={...} {...props} />`.
|
*/

import type { ReactNode } from 'react'
import type { ColumnaTabla } from '~/components/datatable/data_table'
import type { SpecCliente } from '~/lib/subir_imagen'

export type { SpecCliente }

/** Valor de un campo image en el form */
export interface ValorImagen {
  /** id del upload; null si es una imagen existente que no se tocó */
  id: number | null
  url: string | null
}

/** Valor de un campo pdf en el form (además, el nombre original para mostrar) */
export interface ValorArchivo extends ValorImagen {
  nombre: string | null
}

export type Valores = Record<string, unknown>

interface CampoBase {
  /** Nombre del campo en el payload (y en los errores del server) */
  nombre: string
  etiqueta: string
  requerido?: boolean
  hint?: string
  /** El campo solo existe al crear (ej. username): no se muestra al editar */
  soloCrear?: boolean
}

export type Campo =
  | (CampoBase & { tipo: 'text'; maxLength?: number })
  | (CampoBase & { tipo: 'textarea'; maxLength?: number; filas?: number })
  | (CampoBase & { tipo: 'number'; min?: number; max?: number; step?: number })
  | (CampoBase & { tipo: 'select'; opciones: { valor: string; etiqueta: string }[] })
  | (CampoBase & { tipo: 'date' })
  | (CampoBase & { tipo: 'toggle' })
  /**
   * image: el payload lleva `<nombre>UploadId` (id de /api/uploads).
   * Convención con el server: clave ausente = sin cambios, null = quitar.
   */
  | (CampoBase & { tipo: 'image'; spec: string })
  /**
   * pdf: documento adjunto (ej. bases y condiciones). Mismo contrato que
   * image: payload `<nombre>UploadId`, ausente = sin cambios, null = quitar.
   */
  | (CampoBase & { tipo: 'pdf'; spec: string })
  /** images: galería múltiple con orden; payload `<nombre>UploadIds` (array).
   *  Con `modo: 'video'` acepta MP4 y previews de <video>. */
  | (CampoBase & { tipo: 'images'; spec: string; maximo?: number; modo?: 'imagen' | 'video' })
  /**
   * latlng: payload `lat` y `lng` numéricos. Con `mapa: true` muestra el
   * MapPicker (click coloca un marker arrastrable) además de los inputs.
   */
  | (CampoBase & { tipo: 'latlng'; mapa?: boolean })

/** Filtro select cableado a la query string (ej. leads por tipo) */
export interface FiltroSelect {
  parametro: string
  etiqueta: string
  opciones: { valor: string; etiqueta: string }[]
}

export interface RecursoConfig<Fila extends { id: number }> {
  titulo: string
  /** "Nueva sucursal" / "Nuevo carrusel" */
  tituloCrear: string
  tituloEditar: string
  descripcion?: string
  /** Base de las rutas del recurso (ej. '/app/sucursales') */
  baseUrl: string
  columnas: ColumnaTabla<Fila>[]
  campos: Campo[]
  /** Texto que identifica la fila en la confirmación de borrado */
  etiquetaFila: (fila: Fila) => string
  /** Fila → valores iniciales del form al editar */
  valoresDe: (fila: Fila) => Valores
  /** Valores iniciales al crear */
  valoresNuevo: Valores
  /** Validación de cliente extra (ej. hasta >= desde). Devuelve errores por campo. */
  validar?: (valores: Valores) => Record<string, string>
  /** Sin crear/editar (leads) */
  soloLectura?: boolean
  /** Solo sin crear: filas que nacen fuera del admin (ej. fracciones del ETL) */
  sinCrear?: boolean
  /** Sin eliminar (fila y selección masiva) */
  sinEliminar?: boolean
  busquedaPlaceholder?: string
  filtros?: FiltroSelect[]
  /** Estado vacío (CTA crear se agrega solo si no es soloLectura) */
  vacioTitulo?: string
  renderExtra?: (fila: Fila) => ReactNode
  /** Acciones por fila adicionales a editar/eliminar (ej. reset password) */
  accionesExtra?: (fila: Fila) => ReactNode
  /** Oculta el botón eliminar cuando devuelve false (ej. el propio usuario) */
  puedeEliminar?: (fila: Fila) => boolean
  /** Aviso corto bajo el título del modal de edición */
  avisoEditar?: string
}
