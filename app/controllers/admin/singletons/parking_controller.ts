import type { HttpContext } from '@adonisjs/core/http'

import Parking from '#models/parking'
import SingletonController, {
  type ConfigSingleton,
} from '#controllers/admin/concerns/singleton_base'
import { parkingValidator } from '#validators/admin/singletons'

/** Página /parking (título + 3 párrafos + 2 fotos). */
export default class ParkingController extends SingletonController<Parking> {
  protected config: ConfigSingleton = {
    modelo: Parking,
    pagina: 'admin/singletons/parking',
    nombre: 'Parking',
    camposImagen: [
      { campo: 'imagenUnoUploadId', columna: 'imagenUnoUploadId', spec: 'fotoInstitucional' },
      { campo: 'imagenDosUploadId', columna: 'imagenDosUploadId', spec: 'fotoInstitucional' },
    ],
  }

  protected serializar(fila: Parking) {
    return {
      titulo: fila.titulo,
      parrafoUno: fila.parrafoUno,
      parrafoDos: fila.parrafoDos,
      parrafoTres: fila.parrafoTres,
      imagenUnoUploadId: fila.imagenUnoUploadId,
      imagenDosUploadId: fila.imagenDosUploadId,
    }
  }

  protected async validar({ request }: HttpContext) {
    const datos = await request.validateUsing(parkingValidator)
    return {
      titulo: datos.titulo,
      parrafoUno: datos.parrafoUno ?? null,
      parrafoDos: datos.parrafoDos ?? null,
      parrafoTres: datos.parrafoTres ?? null,
    }
  }
}
