import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Lo mismo que hace AdminInicialProvider al arrancar el servidor, a mano.
 * Ojo: con Node 24 los comandos propios no cargan en el build de
 * producción (ver providers/admin_inicial_provider.ts).
 */
export default class AdminInicial extends BaseCommand {
  static commandName = 'admin:inicial'
  static description = 'Crea el primer administrador desde ADMIN_INICIAL_* (si no hay usuarios)'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { crearAdminInicial } = await import('#services/admin_inicial')
    const resultado = await crearAdminInicial()
    const mensajes = {
      'sin-variables': 'sin ADMIN_INICIAL_USUARIO/PASSWORD, no se crea nada',
      'clave-corta': 'la contraseña debe tener al menos 10 caracteres',
      'ya-hay-usuarios': 'ya hay usuarios, no se crea nada',
      'creado': 'administrador creado',
    }
    this.logger.info(`admin:inicial: ${mensajes[resultado]}`)
    if (resultado === 'clave-corta') this.exitCode = 1
  }
}
