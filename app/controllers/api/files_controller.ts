/*
|--------------------------------------------------------------------------
| Servido público de archivos subidos
|--------------------------------------------------------------------------
|
| GET /api/file/public/:link — el link es el token hex de 100 caracteres
| de la fila `uploads` (el matcher de la ruta ya rechaza cualquier otra
| forma con 404). Si la fila existe pero el archivo físico no está (los
| 186 uploads migrados del sitio viejo vinieron sin archivos), se sirve
| el placeholder SVG de marca con cache corto.
|
*/

import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'

import Upload from '#models/upload'
import UploadService from '#services/upload_service'

@inject()
export default class FilesController {
  constructor(private uploadService: UploadService) {}

  async show({ params, request, response }: HttpContext) {
    const upload = await Upload.findBy('link', params.link)
    if (!upload) {
      return response.notFound({ message: 'Archivo no encontrado' })
    }

    const ruta = this.uploadService.rutaFisica(upload)
    const disponible = ruta ? await this.#existe(ruta) : false

    if (!ruta || !disponible) {
      // Upload sin archivo físico: placeholder de marca, 200 con cache corto
      // (si mañana se sube el archivo real, el link empieza a servirlo).
      response.header('Content-Type', 'image/svg+xml')
      response.header('Cache-Control', 'public, max-age=300')
      return response.stream(createReadStream(app.publicPath('img/placeholder.svg')))
    }

    // El link es inmutable (un upload nuevo genera link nuevo): cache agresivo
    response.header('Content-Type', upload.mime ?? 'application/octet-stream')
    response.header('Cache-Control', 'public, max-age=31536000, immutable')
    response.header('Accept-Ranges', 'bytes')

    // Los PDF se abren en el visor del navegador con su nombre original
    // (sin él, "guardar como" ofrecería el link hex de 100 caracteres).
    if (upload.mime === 'application/pdf') {
      const nombre = (upload.originalName ?? 'documento.pdf').replace(/[^\w. ()-]+/g, '_')
      response.header('Content-Disposition', `inline; filename="${nombre}"`)
    }

    /**
     * Range requests: imprescindibles para los videos (saltar dentro del
     * reproductor sin descargar el archivo entero). Solo se atiende el
     * primer rango; un rango fuera del archivo responde 416.
     */
    const { size } = await stat(ruta)
    const rango = /^bytes=(\d*)-(\d*)$/.exec(request.header('range') ?? '')
    if (rango && (rango[1] !== '' || rango[2] !== '')) {
      const desde = rango[1] === '' ? Math.max(0, size - Number(rango[2])) : Number(rango[1])
      const hasta = rango[1] !== '' && rango[2] !== '' ? Number(rango[2]) : size - 1
      const fin = Math.min(hasta, size - 1)
      if (desde >= size || desde > fin) {
        response.header('Content-Range', `bytes */${size}`)
        return response.status(416).send('')
      }
      response.status(206)
      response.header('Content-Range', `bytes ${desde}-${fin}/${size}`)
      response.header('Content-Length', String(fin - desde + 1))
      return response.stream(createReadStream(ruta, { start: desde, end: fin }))
    }

    response.header('Content-Length', String(size))
    return response.stream(createReadStream(ruta))
  }

  async #existe(ruta: string): Promise<boolean> {
    try {
      await access(ruta)
      return true
    } catch {
      return false
    }
  }
}
