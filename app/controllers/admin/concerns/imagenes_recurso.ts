/*
|--------------------------------------------------------------------------
| Campos imagen / galería de los recursos del admin
|--------------------------------------------------------------------------
|
| Helpers compartidos por el motor CRUD (RecursoController) y por los
| singletons institucionales (SingletonController). El cliente sube las
| imágenes ANTES por POST /api/uploads; acá solo llegan ids de upload.
|
| Convención del payload (igual en ambos motores):
|  - clave NO enviada  → sin cambios
|  - null / ''         → quitar la imagen
|  - id numérico       → asociar ese upload (se verifica existencia + spec)
|  - array de ids      → galería completa en ese orden (los que salen se borran)
|
| Los archivos reemplazados/quitados se borran DESPUÉS de persistir la
| fila (el caller recibe la lista `eliminar` y la ejecuta tras el save).
|
*/

import { errors as vineErrors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import type { LucidRow } from '@adonisjs/lucid/types/model'

import Upload from '#models/upload'
import type UploadService from '#services/upload_service'
import type {
  NombreDocumentoSpec,
  NombreImagenSpec,
  NombreVideoSpec,
} from '#validators/rules/imagen_specs'

/** Campo imagen (o documento PDF) simple de un recurso */
export interface CampoImagen {
  /** Nombre del campo en el payload del form (ej. 'imagenUploadId') */
  campo: string
  /** Columna/propiedad del modelo donde persiste (ej. 'imagenUploadId') */
  columna: string
  /** Spec contra la que se validó el upload */
  spec: NombreImagenSpec | NombreDocumentoSpec
  /** Qué se guarda en la columna: el id numérico (default) o el link público */
  guardarComo?: 'id' | 'link'
}

/** Campo galería (array ordenado de upload ids en una columna jsonb) */
export interface CampoGaleria {
  /** Nombre del campo en el payload (ej. 'imagenesUploadIds') */
  campo: string
  /** Columna jsonb del modelo (ej. 'imagenes') */
  columna: string
  /** Spec de imagen o de video (galerías de MP4, ej. videos de fracciones) */
  spec: NombreImagenSpec | NombreVideoSpec
  /** Cantidad máxima de archivos admitidos */
  maximo?: number
}

export interface ResultadoImagenes {
  /** Columnas a asignar a la fila antes del save */
  columnas: Record<string, unknown>
  /** Upload ids a borrar DESPUÉS de persistir */
  eliminar: number[]
}

export function errorDeCampo(campo: string, mensaje: string) {
  return new vineErrors.E_VALIDATION_ERROR([{ field: campo, rule: 'recurso', message: mensaje }])
}

/** Busca y valida un upload contra la spec del campo (existencia + spec) */
async function uploadValidado(
  campo: string,
  valor: unknown,
  spec: NombreImagenSpec | NombreVideoSpec | NombreDocumentoSpec
) {
  const id = Number(valor)
  const upload = Number.isInteger(id) ? await Upload.find(id) : null
  if (!upload) {
    throw errorDeCampo(campo, 'El archivo subido ya no existe. Volvé a subirlo.')
  }
  if (upload.spec !== spec) {
    throw errorDeCampo(campo, 'El archivo no corresponde al tipo requerido por este campo')
  }
  return upload
}

/** id de upload a partir del valor guardado (id numérico o link) */
export async function idDeValorGuardado(
  campo: CampoImagen,
  valor: unknown
): Promise<number | null> {
  if (valor === null || valor === undefined) return null
  if (campo.guardarComo === 'link') {
    const upload = await Upload.findBy('link', String(valor))
    return upload?.id ?? null
  }
  return typeof valor === 'number' ? valor : null
}

/** ids guardados en una columna galería (jsonb array) */
export function idsDeGaleriaGuardada(valor: unknown): number[] {
  if (!Array.isArray(valor)) return []
  return valor.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0)
}

/**
 * Resuelve los campos imagen simples del payload contra la fila existente.
 */
export async function resolverImagenes(
  ctx: HttpContext,
  campos: CampoImagen[],
  filaExistente: LucidRow | null
): Promise<ResultadoImagenes> {
  const columnas: Record<string, unknown> = {}
  const eliminar: number[] = []

  for (const campo of campos) {
    const valor = ctx.request.input(campo.campo, undefined)
    if (valor === undefined) continue // campo no enviado → sin cambios

    const actual = filaExistente
      ? ((filaExistente as unknown as Record<string, unknown>)[campo.columna] ?? null)
      : null

    if (valor === null || valor === '') {
      columnas[campo.columna] = null
      const idActual = await idDeValorGuardado(campo, actual)
      if (idActual) eliminar.push(idActual)
      continue
    }

    const upload = await uploadValidado(campo.campo, valor, campo.spec)
    columnas[campo.columna] = campo.guardarComo === 'link' ? upload.link : upload.id

    const idActual = await idDeValorGuardado(campo, actual)
    if (idActual && idActual !== upload.id) eliminar.push(idActual)
  }

  return { columnas, eliminar }
}

/**
 * Resuelve los campos galería del payload: array ordenado de upload ids.
 * Valida existencia + spec de cada uno; los ids que estaban y ya no
 * vienen quedan marcados para borrar tras el save.
 */
export async function resolverGalerias(
  ctx: HttpContext,
  campos: CampoGaleria[],
  filaExistente: LucidRow | null
): Promise<ResultadoImagenes> {
  const columnas: Record<string, unknown> = {}
  const eliminar: number[] = []

  for (const campo of campos) {
    const valor = ctx.request.input(campo.campo, undefined)
    if (valor === undefined) continue // campo no enviado → sin cambios

    const crudos: unknown[] = valor === null ? [] : Array.isArray(valor) ? valor : null!
    if (!Array.isArray(crudos)) {
      throw errorDeCampo(campo.campo, 'La galería debe ser una lista de imágenes')
    }

    const maximo = campo.maximo ?? 12
    if (crudos.length > maximo) {
      throw errorDeCampo(campo.campo, `La galería admite hasta ${maximo} imágenes`)
    }

    const ids: number[] = []
    for (const crudo of crudos) {
      const upload = await uploadValidado(campo.campo, crudo, campo.spec)
      if (!ids.includes(upload.id)) ids.push(upload.id)
    }

    const actuales = filaExistente
      ? idsDeGaleriaGuardada(
          (filaExistente as unknown as Record<string, unknown>)[campo.columna] ?? null
        )
      : []

    columnas[campo.columna] = ids
    for (const idActual of actuales) {
      if (!ids.includes(idActual)) eliminar.push(idActual)
    }
  }

  return { columnas, eliminar }
}

/**
 * Upload ids asociados a una fila (imágenes simples + galerías), para
 * borrarlos al eliminar la fila.
 */
export async function idsImagenesDeFila(
  fila: LucidRow,
  camposImagen: CampoImagen[],
  camposGaleria: CampoGaleria[]
): Promise<number[]> {
  const ids: number[] = []
  const registro = fila as unknown as Record<string, unknown>

  for (const campo of camposImagen) {
    const id = await idDeValorGuardado(campo, registro[campo.columna] ?? null)
    if (id) ids.push(id)
  }
  for (const campo of camposGaleria) {
    ids.push(...idsDeGaleriaGuardada(registro[campo.columna] ?? null))
  }
  return ids
}

/** Borra archivos físicos + filas uploads (ignora ids inexistentes) */
export async function eliminarUploads(servicio: UploadService, ids: number[]) {
  for (const id of ids) {
    await servicio.eliminar(id)
  }
}
