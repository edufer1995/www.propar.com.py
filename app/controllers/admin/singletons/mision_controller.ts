import type { HttpContext } from '@adonisjs/core/http'

import Mision from '#models/mision'
import SingletonController, {
  type ConfigSingleton,
} from '#controllers/admin/concerns/singleton_base'
import { misionValidator } from '#validators/admin/singletons'

/** Sección "Misión" de /quienes-somos (título + párrafo + fotos). */
export default class MisionController extends SingletonController<Mision> {
  protected config: ConfigSingleton = {
    modelo: Mision,
    pagina: 'admin/singletons/mision',
    nombre: 'Misión',
    camposImagen: [
      { campo: 'imagenUnoUploadId', columna: 'imagenUnoUploadId', spec: 'fotoInstitucional' },
      { campo: 'imagenDosUploadId', columna: 'imagenDosUploadId', spec: 'fotoInstitucional' },
    ],
  }

  protected serializar(fila: Mision) {
    return {
      titulo: fila.titulo,
      parrafoUno: fila.parrafoUno,
      imagenUnoUploadId: fila.imagenUnoUploadId,
      imagenDosUploadId: fila.imagenDosUploadId,
    }
  }

  protected async validar({ request }: HttpContext) {
    const datos = await request.validateUsing(misionValidator)
    return {
      titulo: datos.titulo,
      parrafoUno: datos.parrafoUno ?? null,
    }
  }
}
