/*
|--------------------------------------------------------------------------
| Provider de la capa ERP
|--------------------------------------------------------------------------
|
| Bindea la clase abstracta LotesErpRepository en el container según
| ERP_DRIVER:
|  - fake → CachedLotesErpRepository(FakeLotesErpRepository) [desarrollo y tests]
|  - odoo → CachedLotesErpRepository(OdooLotesErpRepository) [Odoo de Propar]
|
| Los controladores y servicios lo reciben por @inject:
|
|     constructor(private erp: LotesErpRepository) {}
|
| Con odoo, si falta alguna ODOO_* el boot falla con un mensaje que dice
| cuál: mejor que arrancar y mostrar el mapa vacío.
|
*/

import type { ApplicationService } from '@adonisjs/core/types'

import LotesErpRepository from '#repositories/erp/lotes_erp_repository'

export default class ErpProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(LotesErpRepository, async () => {
      const { default: env } = await import('#start/env')
      const { default: CachedLotesErpRepository } =
        await import('#repositories/erp/cached_lotes_erp_repository')

      const driver = env.get('ERP_DRIVER')

      if (driver === 'odoo') {
        const faltan = (['ODOO_URL', 'ODOO_DB', 'ODOO_LOGIN', 'ODOO_API_KEY'] as const).filter(
          (nombre) => !env.get(nombre)
        )
        if (faltan.length > 0) {
          throw new Error(`ERP_DRIVER=odoo requiere ${faltan.join(', ')} en el .env`)
        }
        const { default: OdooClient } = await import('#repositories/erp/odoo_client')
        const { default: OdooLotesErpRepository } =
          await import('#repositories/erp/odoo_lotes_erp_repository')
        const cliente = new OdooClient({
          url: env.get('ODOO_URL')!,
          db: env.get('ODOO_DB')!,
          login: env.get('ODOO_LOGIN')!,
          apiKey: env.get('ODOO_API_KEY')!,
          timeoutMs: env.get('ODOO_TIMEOUT_MS'),
        })
        return new CachedLotesErpRepository(new OdooLotesErpRepository(cliente))
      }

      const { default: FakeLotesErpRepository } =
        await import('#repositories/erp/fake_lotes_erp_repository')
      return new CachedLotesErpRepository(new FakeLotesErpRepository())
    })
  }
}
