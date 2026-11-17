import type { HttpContext } from '@adonisjs/core/http'

import Vision from '#models/vision'
import SingletonController, {
  type ConfigSingleton,
} from '#controllers/admin/concerns/singleton_base'
import { visionValidator } from '#validators/admin/singletons'

/** Sección "Visión" de /quienes-somos (título + párrafo + foto). */
export default class VisionController extends SingletonController<Vision> {
  protected config: ConfigSingleton = {
    modelo: Vision,
    pagina: 'admin/singletons/vision',
    nombre: 'Visión',
    camposImagen: [
      { campo: 'imagenUnoUploadId', columna: 'imagenUnoUploadId', spec: 'fotoInstitucional' },
    ],
  }

  protected serializar(fila: Vision) {
    return {
      titulo: fila.titulo,
      parrafoUno: fila.parrafoUno,
      imagenUnoUploadId: fila.imagenUnoUploadId,
    }
  }

  protected async validar({ request }: HttpContext) {
    const datos = await request.validateUsing(visionValidator)
    return {
      titulo: datos.titulo,
      parrafoUno: datos.parrafoUno ?? null,
    }
  }
}
