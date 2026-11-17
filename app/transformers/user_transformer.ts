import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'username', 'nombre', 'email', 'activo', 'initials']),
      /**
       * Nivel del rol (1 = Administrador). El silent auth middleware precarga
       * la relación en cada request autenticado.
       */
      rolNivel: this.resource.rol?.nivel ?? null,
      rol: this.resource.rol?.descripcion ?? null,
    }
  }
}
