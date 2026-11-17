import type { HttpContext } from '@adonisjs/core/http'

import RedSocial from '#models/red_social'
import { urlDeLink } from '#services/public_layout_service'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'
import { redSocialValidator } from '#validators/admin/recursos'

/**
 * Redes sociales del footer público (solo activas, por orden). Dos
 * imágenes distintas: el icono identifica la marca en el pie y en la
 * card (spec iconoRed, cuadrado 128×128), y la imagen —opcional— es la
 * que la card del home abre a pantalla completa (spec imagenRed, 4:3).
 */
export default class RedesSocialesController extends RecursoController<RedSocial> {
  protected config: ConfigRecurso = {
    modelo: RedSocial,
    pagina: 'admin/recursos/redes_sociales',
    recurso: 'redes-sociales',
    nombre: 'Red social',
    genero: 'f',
    busquedaEn: ['nombre', 'url'],
    ordenables: { id: 'id', nombre: 'nombre', orden: 'orden', activo: 'activo' },
    ordenDefault: { sort: 'orden', order: 'asc' },
    camposImagen: [
      { campo: 'iconoUploadId', columna: 'iconoUploadId', spec: 'iconoRed' },
      { campo: 'imagenUploadId', columna: 'imagenUploadId', spec: 'imagenRed' },
    ],
    precargar: ['icono', 'imagen'],
  }

  protected serializar(fila: RedSocial) {
    return {
      id: fila.id,
      nombre: fila.nombre,
      url: fila.url,
      orden: fila.orden,
      activo: fila.activo,
      iconoUploadId: fila.iconoUploadId,
      iconoUrl: urlDeLink(fila.icono?.link),
      imagenUploadId: fila.imagenUploadId,
      imagenUrl: urlDeLink(fila.imagen?.link),
    }
  }

  protected async validar({ request }: HttpContext) {
    const datos = await request.validateUsing(redSocialValidator)
    return {
      nombre: datos.nombre,
      url: datos.url,
      orden: datos.orden,
      activo: datos.activo,
    }
  }

  protected csv() {
    return {
      encabezados: ['ID', 'Nombre', 'URL', 'Orden', 'Activa'],
      fila: (fila: RedSocial) => [
        fila.id,
        fila.nombre,
        fila.url,
        fila.orden,
        fila.activo ? 'Sí' : 'No',
      ],
    }
  }
}
