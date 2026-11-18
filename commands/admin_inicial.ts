import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import env from '#start/env'

/**
 * Crea el primer administrador a partir de ADMIN_INICIAL_USUARIO y
 * ADMIN_INICIAL_PASSWORD. Corre en el pre-deploy: si alguna de las dos
 * falta, o ya existe algún usuario, no hace nada. Así la contraseña nunca
 * pasa por el repo ni por los logs; después de entrar conviene cambiarla
 * desde "Mi cuenta" y borrar la variable.
 */
export default class AdminInicial extends BaseCommand {
  static commandName = 'admin:inicial'
  static description = 'Crea el primer administrador desde ADMIN_INICIAL_* (si no hay usuarios)'
  static options: CommandOptions = { startApp: true }

  async run() {
    const username = env.get('ADMIN_INICIAL_USUARIO')?.trim()
    const password = env.get('ADMIN_INICIAL_PASSWORD')
    if (!username || !password) {
      this.logger.info('admin:inicial: sin ADMIN_INICIAL_USUARIO/PASSWORD, no se crea nada')
      return
    }
    if (password.length < 10) {
      this.logger.error('admin:inicial: la contraseña debe tener al menos 10 caracteres')
      this.exitCode = 1
      return
    }

    const { default: User } = await import('#models/user')
    const existente = await User.query().first()
    if (existente) {
      this.logger.info('admin:inicial: ya hay usuarios, no se crea nada')
      return
    }

    const usuario = await User.create({
      username,
      nombre: username,
      password,
      rolId: 1,
      activo: true,
    })
    this.logger.success(`admin:inicial: administrador "${usuario.username}" creado`)
  }
}
