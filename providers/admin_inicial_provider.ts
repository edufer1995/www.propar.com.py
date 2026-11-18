/*
|--------------------------------------------------------------------------
| Primer administrador al arrancar el servidor
|--------------------------------------------------------------------------
|
| Con Node 24 los comandos ace propios fallan al cargarse ("Invalid
| command exported ... Invalid URL": jsonschema 1.5.0 arma mal la URL del
| schema de metadatos), así que el primer admin no se puede crear con un
| comando en el pre-deploy de Railway. Se crea acá, cuando levanta el
| servidor web, si están las variables ADMIN_INICIAL_* y no hay usuarios.
|
*/

import type { ApplicationService } from '@adonisjs/core/types'

export default class AdminInicialProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    if (this.app.getEnvironment() !== 'web') return
    const { crearAdminInicial } = await import('#services/admin_inicial')
    try {
      await crearAdminInicial()
    } catch (error) {
      const { default: logger } = await import('@adonisjs/core/services/logger')
      logger.error({ err: error }, 'admin inicial: no se pudo crear el administrador')
    }
  }
}
