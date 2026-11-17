import type { HttpContext } from '@adonisjs/core/http'

import NuestroHorario from '#models/nuestro_horario'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'
import { nuestroHorarioValidator } from '#validators/admin/recursos'
import { errorDeCampo } from '#controllers/admin/concerns/imagenes_recurso'

/**
 * Líneas de "Nuestros horarios" de /parking. Igual que el sitio viejo:
 * obsCheck marca la fila como observación (usa el campo obs en lugar de
 * descripcion al mostrarse).
 */
export default class HorariosController extends RecursoController<NuestroHorario> {
  protected config: ConfigRecurso = {
    modelo: NuestroHorario,
    pagina: 'admin/recursos/horarios',
    recurso: 'horarios',
    nombre: 'Horario',
    genero: 'm',
    busquedaEn: ['descripcion', 'obs'],
    ordenables: { id: 'id', descripcion: 'descripcion' },
    ordenDefault: { sort: 'id', order: 'asc' },
  }

  protected serializar(fila: NuestroHorario) {
    return {
      id: fila.id,
      descripcion: fila.descripcion,
      obs: fila.obs,
      esObservacion: Boolean(fila.obsCheck),
    }
  }

  protected async validar(ctx: HttpContext) {
    const datos = await ctx.request.validateUsing(nuestroHorarioValidator)

    if (datos.obsCheck && !datos.obs) {
      throw errorDeCampo('obs', 'Una observación necesita su texto')
    }
    if (!datos.obsCheck && !datos.descripcion) {
      throw errorDeCampo('descripcion', 'Un horario necesita su descripción')
    }

    return {
      descripcion: datos.descripcion ?? null,
      obs: datos.obs ?? null,
      obsCheck: datos.obsCheck,
    }
  }

  protected csv() {
    return {
      encabezados: ['ID', 'Descripción', 'Observación', 'Es observación'],
      fila: (fila: NuestroHorario) => [
        fila.id,
        fila.descripcion,
        fila.obs,
        fila.obsCheck ? 'Sí' : 'No',
      ],
    }
  }
}
