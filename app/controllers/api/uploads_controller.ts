/*
|--------------------------------------------------------------------------
| Subida de imágenes (admin)
|--------------------------------------------------------------------------
|
| POST /api/uploads (requiere sesión): multipart con `file` + `spec`
| (nombre de una spec de app/validators/rules/imagen_specs.ts). La
| validación fina (magic bytes, peso, dimensiones, proporción) vive en
| UploadService; acá solo se valida la presencia del archivo y que la
| spec exista.
|
| Respuesta: { id, link, url } — url lista para usar como src.
|
*/

import { inject } from '@adonisjs/core'
import router from '@adonisjs/core/services/router'
import type { HttpContext } from '@adonisjs/core/http'

import UploadService from '#services/upload_service'
import {
  NOMBRES_DOCUMENTO_SPECS,
  NOMBRES_IMAGEN_SPECS,
  NOMBRES_VIDEO_SPECS,
  type NombreDocumentoSpec,
  type NombreImagenSpec,
  type NombreVideoSpec,
} from '#validators/rules/imagen_specs'

@inject()
export default class UploadsController {
  constructor(private uploadService: UploadService) {}

  async store({ request, response }: HttpContext) {
    const spec = request.input('spec')
    const esImagen =
      typeof spec === 'string' && NOMBRES_IMAGEN_SPECS.includes(spec as NombreImagenSpec)
    const esVideo =
      typeof spec === 'string' && NOMBRES_VIDEO_SPECS.includes(spec as NombreVideoSpec)
    const esDocumento =
      typeof spec === 'string' && NOMBRES_DOCUMENTO_SPECS.includes(spec as NombreDocumentoSpec)
    if (!esImagen && !esVideo && !esDocumento) {
      return response.unprocessableEntity({
        errors: [{ field: 'spec', message: 'Tipo de archivo desconocido' }],
      })
    }

    // Sin validaciones de extensión acá: el formato real se verifica por
    // magic bytes en el servicio (la extensión del cliente puede mentir).
    const file = request.file('file')
    if (!file || !file.tmpPath) {
      return response.unprocessableEntity({
        errors: [{ field: 'file', message: 'Seleccioná un archivo para subir' }],
      })
    }

    const entrada = { rutaTemporal: file.tmpPath, nombreOriginal: file.clientName }
    const upload = esVideo
      ? await this.uploadService.guardarVideo(entrada, spec as NombreVideoSpec)
      : esDocumento
        ? await this.uploadService.guardarPdf(entrada, spec as NombreDocumentoSpec)
        : await this.uploadService.guardar(entrada, spec as NombreImagenSpec)

    return response.created({
      id: upload.id,
      link: upload.link,
      url: router.makeUrl('api.file.public', { link: upload.link }),
    })
  }
}
