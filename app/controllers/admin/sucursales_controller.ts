import type { HttpContext } from '@adonisjs/core/http'

import Sucursal from '#models/sucursal'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'
import { sucursalValidator } from '#validators/admin/recursos'

/**
 * Sucursales (piloto del motor CRUD). El sitio público muestra las de
 * estado 'A' en /contacto y en el footer de todas las páginas.
 */
export default class SucursalesController extends RecursoController<Sucursal> {
  protected config: ConfigRecurso = {
    modelo: Sucursal,
    pagina: 'admin/recursos/sucursales',
    recurso: 'sucursales',
    nombre: 'Sucursal',
    genero: 'f',
    busquedaEn: ['titulo', 'telefonos', 'horarios'],
    ordenables: { id: 'id', titulo: 'titulo', estado: 'estado' },
    ordenDefault: { sort: 'id', order: 'asc' },
  }

  protected serializar(fila: Sucursal) {
    return {
      id: fila.id,
      titulo: fila.titulo,
      lat: fila.coordenadas?.lat ?? null,
      lng: fila.coordenadas?.lng ?? null,
      horarios: fila.horarios,
      telefonos: fila.telefonos,
      activo: fila.estado === 'A',
    }
  }

  protected async validar({ request }: HttpContext) {
    const datos = await request.validateUsing(sucursalValidator)
    return {
      titulo: datos.titulo,
      coordenadas: { lat: datos.lat, lng: datos.lng },
      horarios: datos.horarios ?? null,
      telefonos: datos.telefonos ?? null,
      estado: datos.activo ? 'A' : 'E',
    }
  }

  protected csv() {
    return {
      encabezados: ['ID', 'Título', 'Latitud', 'Longitud', 'Horarios', 'Teléfonos', 'Activa'],
      fila: (fila: Sucursal) => [
        fila.id,
        fila.titulo,
        fila.coordenadas?.lat ?? null,
        fila.coordenadas?.lng ?? null,
        fila.horarios,
        fila.telefonos,
        fila.estado === 'A' ? 'Sí' : 'No',
      ],
    }
  }
}
