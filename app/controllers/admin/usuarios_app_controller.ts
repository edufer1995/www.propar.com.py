import type { HttpContext } from '@adonisjs/core/http'

import UsuarioApp from '#models/usuario_app'
import { urlDeLink } from '#services/public_layout_service'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'
import { usuarioAppValidator } from '#validators/admin/recursos'

/**
 * Usuarios de la app móvil (vendedores) — la tabla que el admin viejo
 * llamaba "usuarios". La columna `foto` guarda el LINK público del
 * upload (spec fotoPerfil), no el id.
 */
export default class UsuariosAppController extends RecursoController<UsuarioApp> {
  protected config: ConfigRecurso = {
    modelo: UsuarioApp,
    pagina: 'admin/recursos/usuarios_app',
    recurso: 'usuarios-app',
    nombre: 'Usuario',
    genero: 'm',
    busquedaEn: ['nombres', 'documento', 'correo'],
    ordenables: { id: 'id', nombres: 'nombres', documento: 'documento', correo: 'correo' },
    ordenDefault: { sort: 'nombres', order: 'asc' },
    camposImagen: [
      { campo: 'fotoUploadId', columna: 'foto', spec: 'fotoPerfil', guardarComo: 'link' },
    ],
  }

  protected serializar(fila: UsuarioApp) {
    return {
      id: fila.id,
      nombres: fila.nombres,
      documento: fila.documento,
      correo: fila.correo,
      fotoUrl: urlDeLink(fila.foto),
    }
  }

  protected async validar({ request }: HttpContext) {
    const datos = await request.validateUsing(usuarioAppValidator)
    return {
      nombres: datos.nombres,
      documento: datos.documento,
      correo: datos.correo,
    }
  }

  protected csv() {
    return {
      encabezados: ['ID', 'Nombres', 'Documento', 'Correo'],
      fila: (fila: UsuarioApp) => [fila.id, fila.nombres, fila.documento, fila.correo],
    }
  }
}
