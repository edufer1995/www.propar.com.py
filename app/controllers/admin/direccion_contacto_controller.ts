import type { HttpContext } from '@adonisjs/core/http'

import DireccionContacto from '#models/direccion_contacto'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'
import { direccionContactoValidator } from '#validators/admin/recursos'

/** Líneas de dirección/contacto que muestra la página /parking. */
export default class DireccionContactoController extends RecursoController<DireccionContacto> {
  protected config: ConfigRecurso = {
    modelo: DireccionContacto,
    pagina: 'admin/recursos/direccion_contacto',
    recurso: 'direccion-contacto',
    nombre: 'Línea de dirección',
    genero: 'f',
    busquedaEn: ['descripcion'],
    ordenables: { id: 'id', descripcion: 'descripcion' },
    ordenDefault: { sort: 'id', order: 'asc' },
  }

  protected serializar(fila: DireccionContacto) {
    return {
      id: fila.id,
      descripcion: fila.descripcion,
    }
  }

  protected async validar(ctx: HttpContext) {
    const datos = await ctx.request.validateUsing(direccionContactoValidator)
    return { descripcion: datos.descripcion }
  }

  protected csv() {
    return {
      encabezados: ['ID', 'Descripción'],
      fila: (fila: DireccionContacto) => [fila.id, fila.descripcion],
    }
  }
}
