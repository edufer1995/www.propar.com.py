/*
|--------------------------------------------------------------------------
| Servicio de uploads de imágenes
|--------------------------------------------------------------------------
|
| Valida imágenes por MAGIC BYTES (sharp lee el formato real del archivo,
| no la extensión), peso, dimensiones mínimas y proporción según la spec
| (app/validators/rules/imagen_specs.ts), guarda el archivo físico en
| UPLOADS_PATH como `<id>.<ext>` y registra la fila en `uploads`.
|
| El link público es un token hex de 100 caracteres (crypto.randomBytes(50))
| servido por GET /api/file/public/:link.
|
| Los errores de validación son ErrorDeImagen: mensaje en español listo
| para mostrarse inline en el formulario.
|
*/

import { randomBytes } from 'node:crypto'
import { copyFile, mkdir, open, stat, unlink } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { Exception } from '@adonisjs/core/exceptions'
import app from '@adonisjs/core/services/app'
import sharp from 'sharp'

import env from '#start/env'
import Upload from '#models/upload'
import {
  DOCUMENTO_SPECS,
  FORMATOS_PERMITIDOS,
  IMAGEN_SPECS,
  VIDEO_SPECS,
  describirDocumentoSpec,
  describirSpec,
  describirVideoSpec,
  type DocumentoSpec,
  type FormatoImagen,
  type ImagenSpec,
  type NombreDocumentoSpec,
  type NombreImagenSpec,
  type NombreVideoSpec,
  type VideoSpec,
} from '#validators/rules/imagen_specs'

/**
 * Error de validación de imagen. El mensaje está pensado para mostrarse
 * inline debajo del campo de subida.
 */
export class ErrorDeImagen extends Exception {
  static status = 422
  static code = 'E_IMAGEN_INVALIDA'
}

/** Archivo de entrada: ruta temporal en disco + nombre original del cliente */
export interface ArchivoEntrada {
  rutaTemporal: string
  nombreOriginal: string | null
}

/** Extensión física por formato real detectado */
const EXTENSION_POR_FORMATO: Record<FormatoImagen, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

/** MIME por formato real detectado */
const MIME_POR_FORMATO: Record<FormatoImagen, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

/** MIME de los videos aceptados (solo MP4, físico como `<id>.mp4`) */
const MIME_VIDEO = 'video/mp4'

/** MIME de los documentos aceptados (solo PDF, físico como `<id>.pdf`) */
const MIME_PDF = 'application/pdf'

/** Tolerancia de proporción (2%): las fotos reales rara vez son exactas */
const TOLERANCIA_ASPECTO = 0.02

export default class UploadService {
  /**
   * Directorio físico de uploads (UPLOADS_PATH, relativo a la raíz del proyecto).
   */
  directorio(): string {
    const configurado = env.get('UPLOADS_PATH')
    return isAbsolute(configurado) ? configurado : resolve(app.makePath(), configurado)
  }

  /**
   * Ruta física del archivo de un upload, derivada de id + mime.
   * Devuelve null si el mime no corresponde a un formato conocido
   * (uploads legados migrados sin archivo físico).
   */
  rutaFisica(upload: Upload): string | null {
    if (upload.mime === MIME_VIDEO) {
      return join(this.directorio(), `${upload.id}.mp4`)
    }
    if (upload.mime === MIME_PDF) {
      return join(this.directorio(), `${upload.id}.pdf`)
    }
    const formato = (Object.keys(MIME_POR_FORMATO) as FormatoImagen[]).find(
      (f) => MIME_POR_FORMATO[f] === upload.mime
    )
    if (!formato) return null
    return join(this.directorio(), `${upload.id}.${EXTENSION_POR_FORMATO[formato]}`)
  }

  /**
   * Valida y guarda una imagen según la spec indicada.
   * Devuelve la fila `uploads` creada (con su link público).
   */
  async guardar(archivo: ArchivoEntrada, nombreSpec: NombreImagenSpec): Promise<Upload> {
    const spec: ImagenSpec = IMAGEN_SPECS[nombreSpec]

    // Peso máximo (sobre el archivo real en disco)
    const { size } = await stat(archivo.rutaTemporal)
    if (size > spec.pesoMaximoBytes) {
      throw new ErrorDeImagen(`La imagen supera el peso máximo permitido (${describirSpec(spec)})`)
    }

    // Formato real por magic bytes: sharp ignora la extensión del nombre
    let metadata: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>
    try {
      metadata = await sharp(archivo.rutaTemporal).metadata()
    } catch {
      throw new ErrorDeImagen('El archivo no es una imagen válida (se acepta PNG, JPG o WebP)')
    }

    const formato = metadata.format as FormatoImagen | undefined
    if (!formato || !FORMATOS_PERMITIDOS.includes(formato)) {
      throw new ErrorDeImagen('El formato de la imagen debe ser PNG, JPG o WebP')
    }

    // Dimensiones mínimas
    const ancho = metadata.width ?? 0
    const alto = metadata.height ?? 0
    if (ancho < spec.anchoMinimo || alto < spec.altoMinimo) {
      throw new ErrorDeImagen(
        `La imagen mide ${ancho}×${alto} px y el mínimo es ${spec.anchoMinimo}×${spec.altoMinimo} px`
      )
    }

    // Proporción
    this.#validarAspecto(spec, ancho, alto)

    // Registro + archivo físico. El link es único (100 hex) y sirve de URL pública.
    const upload = await Upload.create({
      link: randomBytes(50).toString('hex'),
      mime: MIME_POR_FORMATO[formato],
      size,
      originalName: archivo.nombreOriginal,
      // El admin verifica esta columna al asociar la imagen a un recurso
      spec: nombreSpec,
    })

    try {
      await mkdir(this.directorio(), { recursive: true })
      await copyFile(
        archivo.rutaTemporal,
        join(this.directorio(), `${upload.id}.${EXTENSION_POR_FORMATO[formato]}`)
      )
    } catch (error) {
      // Si el disco falla no dejamos la fila huérfana
      await upload.delete()
      throw error
    }

    return upload
  }

  /**
   * Valida y guarda un video MP4 según la spec indicada: peso máximo y
   * MAGIC BYTES del contenedor (caja "ftyp" en el offset 4 — la extensión
   * del cliente puede mentir). Archivo físico como `<id>.mp4`.
   */
  async guardarVideo(archivo: ArchivoEntrada, nombreSpec: NombreVideoSpec): Promise<Upload> {
    const spec: VideoSpec = VIDEO_SPECS[nombreSpec]

    const { size } = await stat(archivo.rutaTemporal)
    if (size > spec.pesoMaximoBytes) {
      throw new ErrorDeImagen(
        `El video supera el peso máximo permitido (${describirVideoSpec(spec)})`
      )
    }

    const descriptor = await open(archivo.rutaTemporal, 'r')
    const cabecera = Buffer.alloc(8)
    try {
      await descriptor.read(cabecera, 0, 8, 0)
    } finally {
      await descriptor.close()
    }
    if (cabecera.subarray(4, 8).toString('latin1') !== 'ftyp') {
      throw new ErrorDeImagen('El archivo no es un video MP4 válido (exportalo como MP4 H.264)')
    }

    const upload = await Upload.create({
      link: randomBytes(50).toString('hex'),
      mime: MIME_VIDEO,
      size,
      originalName: archivo.nombreOriginal,
      spec: nombreSpec,
    })

    try {
      await mkdir(this.directorio(), { recursive: true })
      await copyFile(archivo.rutaTemporal, join(this.directorio(), `${upload.id}.mp4`))
    } catch (error) {
      // Si el disco falla no dejamos la fila huérfana
      await upload.delete()
      throw error
    }

    return upload
  }

  /**
   * Valida y guarda un documento PDF según la spec indicada: peso máximo y
   * MAGIC BYTES de la cabecera ("%PDF-" — la extensión del cliente puede
   * mentir). Archivo físico como `<id>.pdf`.
   */
  async guardarPdf(archivo: ArchivoEntrada, nombreSpec: NombreDocumentoSpec): Promise<Upload> {
    const spec: DocumentoSpec = DOCUMENTO_SPECS[nombreSpec]

    const { size } = await stat(archivo.rutaTemporal)
    if (size > spec.pesoMaximoBytes) {
      throw new ErrorDeImagen(
        `El PDF supera el peso máximo permitido (${describirDocumentoSpec(spec)})`
      )
    }

    const descriptor = await open(archivo.rutaTemporal, 'r')
    const cabecera = Buffer.alloc(5)
    try {
      await descriptor.read(cabecera, 0, 5, 0)
    } finally {
      await descriptor.close()
    }
    if (cabecera.toString('latin1') !== '%PDF-') {
      throw new ErrorDeImagen('El archivo no es un PDF válido')
    }

    const upload = await Upload.create({
      link: randomBytes(50).toString('hex'),
      mime: MIME_PDF,
      size,
      originalName: archivo.nombreOriginal,
      spec: nombreSpec,
    })

    try {
      await mkdir(this.directorio(), { recursive: true })
      await copyFile(archivo.rutaTemporal, join(this.directorio(), `${upload.id}.pdf`))
    } catch (error) {
      // Si el disco falla no dejamos la fila huérfana
      await upload.delete()
      throw error
    }

    return upload
  }

  /**
   * Elimina el archivo físico (si existe) y la fila del upload.
   */
  async eliminar(uploadId: number): Promise<void> {
    const upload = await Upload.find(uploadId)
    if (!upload) return

    const ruta = this.rutaFisica(upload)
    if (ruta) {
      try {
        await unlink(ruta)
      } catch (error) {
        // Los uploads migrados no tienen archivo físico: ENOENT es esperable
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
    }

    await upload.delete()
  }

  #validarAspecto(spec: ImagenSpec, ancho: number, alto: number): void {
    switch (spec.aspecto) {
      case 'apaisada':
        if (ancho <= alto) {
          throw new ErrorDeImagen('La imagen debe ser apaisada (más ancha que alta)')
        }
        break
      case 'cuadrada':
        if (Math.abs(ancho - alto) > ancho * TOLERANCIA_ASPECTO) {
          throw new ErrorDeImagen('La imagen debe ser cuadrada (mismo ancho y alto)')
        }
        break
      case 'cuatroTres':
        if (Math.abs(ancho / alto - 4 / 3) > (4 / 3) * TOLERANCIA_ASPECTO) {
          throw new ErrorDeImagen('La imagen debe tener proporción 4:3')
        }
        break
      case 'libre':
        break
    }
  }
}
