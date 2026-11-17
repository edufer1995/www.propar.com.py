import type { HttpContext } from '@adonisjs/core/http'

import Trayectoria from '#models/trayectoria'
import SingletonController, {
  type ConfigSingleton,
} from '#controllers/admin/concerns/singleton_base'
import { trayectoriaValidator } from '#validators/admin/singletons'

/** Sección "Trayectoria" de /quienes-somos (título + 6 párrafos + 3 fotos). */
export default class TrayectoriaController extends SingletonController<Trayectoria> {
  protected config: ConfigSingleton = {
    modelo: Trayectoria,
    pagina: 'admin/singletons/trayectoria',
    nombre: 'Trayectoria',
    camposImagen: [
      { campo: 'imagenUnoUploadId', columna: 'imagenUnoUploadId', spec: 'fotoInstitucional' },
      { campo: 'imagenDosUploadId', columna: 'imagenDosUploadId', spec: 'fotoInstitucional' },
      { campo: 'imagenTresUploadId', columna: 'imagenTresUploadId', spec: 'fotoInstitucional' },
    ],
  }

  protected serializar(fila: Trayectoria) {
    return {
      titulo: fila.titulo,
      parrafoUno: fila.parrafoUno,
      parrafoDos: fila.parrafoDos,
      parrafoTres: fila.parrafoTres,
      parrafoCuatro: fila.parrafoCuatro,
      parrafoCinco: fila.parrafoCinco,
      parrafoSeis: fila.parrafoSeis,
      imagenUnoUploadId: fila.imagenUnoUploadId,
      imagenDosUploadId: fila.imagenDosUploadId,
      imagenTresUploadId: fila.imagenTresUploadId,
    }
  }

  protected async validar({ request }: HttpContext) {
    const datos = await request.validateUsing(trayectoriaValidator)
    return {
      titulo: datos.titulo,
      parrafoUno: datos.parrafoUno ?? null,
      parrafoDos: datos.parrafoDos ?? null,
      parrafoTres: datos.parrafoTres ?? null,
      parrafoCuatro: datos.parrafoCuatro ?? null,
      parrafoCinco: datos.parrafoCinco ?? null,
      parrafoSeis: datos.parrafoSeis ?? null,
    }
  }
}
