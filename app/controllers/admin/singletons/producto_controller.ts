import type { HttpContext } from '@adonisjs/core/http'

import Producto from '#models/producto'
import SingletonController, {
  type ConfigSingleton,
} from '#controllers/admin/concerns/singleton_base'
import { productoValidator } from '#validators/admin/singletons'

/** Sección "Producto" de /quienes-somos (título + párrafo + foto). */
export default class ProductoController extends SingletonController<Producto> {
  protected config: ConfigSingleton = {
    modelo: Producto,
    pagina: 'admin/singletons/producto',
    nombre: 'Producto',
    camposImagen: [
      { campo: 'imagenUnoUploadId', columna: 'imagenUnoUploadId', spec: 'fotoInstitucional' },
    ],
  }

  protected serializar(fila: Producto) {
    return {
      titulo: fila.titulo,
      parrafoUno: fila.parrafoUno,
      imagenUnoUploadId: fila.imagenUnoUploadId,
    }
  }

  protected async validar({ request }: HttpContext) {
    const datos = await request.validateUsing(productoValidator)
    return {
      titulo: datos.titulo,
      parrafoUno: datos.parrafoUno ?? null,
    }
  }
}
