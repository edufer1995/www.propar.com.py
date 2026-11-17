/*
|--------------------------------------------------------------------------
| Provider de la capa ERP
|--------------------------------------------------------------------------
|
| Bindea la clase abstracta LotesErpRepository en el container según
| ORACLE_DRIVER:
|  - fake → CachedLotesErpRepository(FakeLotesErpRepository)   [desarrollo]
|  - real → CachedLotesErpRepository(OracleLotesErpRepository) [producción]
|
| Los controladores la reciben con inyección:
|
|   @inject()
|   export default class LoteamientosController {
|     constructor(private erp: LotesErpRepository) {}
|   }
|
| El import del repositorio Oracle es dinámico: con driver fake ese módulo
| ni se carga (no requiere oracledb ni la conexión 'oracle').
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

      if (env.get('ORACLE_DRIVER') === 'real') {
        const { default: OracleLotesErpRepository } =
          await import('#repositories/erp/oracle_lotes_erp_repository')
        return new CachedLotesErpRepository(new OracleLotesErpRepository())
      }

      const { default: FakeLotesErpRepository } =
        await import('#repositories/erp/fake_lotes_erp_repository')
      return new CachedLotesErpRepository(new FakeLotesErpRepository())
    })
  }
}
