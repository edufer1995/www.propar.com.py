import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Verificación post-ETL de credenciales:
 * - toma usuarios reales del dump y comprueba que User.verifyCredentials
 *   funcione con el password plano de staging (ya hasheado en v2),
 * - confirma que ningún password de v2 quedó en texto plano,
 * - confirma que una credencial inválida es rechazada.
 * No imprime credenciales.
 */
export default class EtlVerifyAuth extends BaseCommand {
  static commandName = 'etl:verify-auth'
  static description = 'Verifica que los passwords migrados funcionen con el auth de Adonis'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const { default: User } = await import('#models/user')

    let fallo = false

    // password plano leído SOLO en memoria desde staging
    const muestras = await db
      .connection('staging')
      .from('usuarios')
      .select('usuario_username', 'usuario_password')
      .orderBy('usuario_id')
      .limit(3)

    for (const muestra of muestras) {
      try {
        const user = await User.verifyCredentials(
          muestra.usuario_username,
          muestra.usuario_password
        )
        this.logger.info(`OK: verifyCredentials funcionó para ${user.username} (id ${user.id})`)
      } catch {
        this.logger.error(`FALLO: verifyCredentials rechazó a ${muestra.usuario_username}`)
        fallo = true
      }
    }

    // ningún password de v2 debe coincidir con el plano de staging
    const planos = await db
      .connection('staging')
      .from('usuarios')
      .select('usuario_username', 'usuario_password')
    const nuevos = await db.from('users').select('username', 'password')
    const porUsername = new Map(nuevos.map((u) => [u.username, u.password]))
    const iguales = planos.filter((p) => porUsername.get(p.usuario_username) === p.usuario_password)
    if (iguales.length > 0) {
      this.logger.error(`FALLO: ${iguales.length} passwords quedaron en texto plano`)
      fallo = true
    } else {
      this.logger.info('OK: ningún password de v2 coincide con el texto plano de staging')
    }

    // una credencial inválida debe ser rechazada
    try {
      await User.verifyCredentials(muestras[0].usuario_username, 'password-incorrecto-123')
      this.logger.error('FALLO: se aceptó una credencial inválida')
      fallo = true
    } catch {
      this.logger.info('OK: credencial inválida rechazada')
    }

    await db.manager.closeAll()
    this.exitCode = fallo ? 1 : 0
  }
}
