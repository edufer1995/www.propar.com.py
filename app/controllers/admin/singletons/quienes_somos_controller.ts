import type { HttpContext } from '@adonisjs/core/http'

import QuienesSomos from '#models/quienes_somos'
import SingletonController, {
  type ConfigSingleton,
} from '#controllers/admin/concerns/singleton_base'
import { quienesSomosValidator } from '#validators/admin/singletons'

/** Sección "Quiénes somos" de /quienes-somos (título + 4 párrafos + 3 fotos). */
export default class QuienesSomosController extends SingletonController<QuienesSomos> {
  protected config: ConfigSingleton = {
    modelo: QuienesSomos,
    pagina: 'admin/singletons/quienes_somos',
    nombre: 'Quiénes somos',
    camposImagen: [
      { campo: 'imagenUnoUploadId', columna: 'imagenUnoUploadId', spec: 'fotoInstitucional' },
      { campo: 'imagenDosUploadId', columna: 'imagenDosUploadId', spec: 'fotoInstitucional' },
      { campo: 'imagenTresUploadId', columna: 'imagenTresUploadId', spec: 'fotoInstitucional' },
    ],
  }

  protected serializar(fila: QuienesSomos) {
    return {
      titulo: fila.titulo,
      parrafoUno: fila.parrafoUno,
      parrafoDos: fila.parrafoDos,
      parrafoTres: fila.parrafoTres,
      parrafoCuatro: fila.parrafoCuatro,
      imagenUnoUploadId: fila.imagenUnoUploadId,
      imagenDosUploadId: fila.imagenDosUploadId,
      imagenTresUploadId: fila.imagenTresUploadId,
    }
  }

  protected async validar({ request }: HttpContext) {
    const datos = await request.validateUsing(quienesSomosValidator)
    return {
      titulo: datos.titulo,
      parrafoUno: datos.parrafoUno ?? null,
      parrafoDos: datos.parrafoDos ?? null,
      parrafoTres: datos.parrafoTres ?? null,
      parrafoCuatro: datos.parrafoCuatro ?? null,
    }
  }
}
