import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * SOLO desarrollo: crea (o resetea) un administrador local `dev` con
 * contraseña `dev12345` para probar el panel sin conocer las claves de
 * los usuarios reales importados. Se niega a correr en producción.
 */
export default class DevCrearAdmin extends BaseCommand {
  static commandName = 'dev:crear-admin'
  static description = 'Crea el usuario dev/dev12345 (solo desarrollo)'
  static options: CommandOptions = { startApp: true }

  async run() {
    if (this.app.inProduction) {
      this.logger.error('Este comando es solo para desarrollo')
      this.exitCode = 1
      return
    }

    const { default: User } = await import('#models/user')
    const usuario = await User.updateOrCreate(
      { username: 'dev' },
      { nombre: 'Dev Local', password: 'dev12345', rolId: 1, activo: true }
    )
    this.logger.info(`Listo: usuario "dev" (id ${usuario.id}) con contraseña "dev12345"`)
  }
}
