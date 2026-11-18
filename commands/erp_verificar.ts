import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Verifica la conexión con el ERP configurado (ERP_DRIVER) y resume lo que
 * la web va a mostrar: fracciones, lotes por estado y lotes libres sin
 * precio vigente. Con --fraccion muestra el detalle de una fracción.
 *
 * Solo lee: no escribe nada ni en el ERP ni en la base de la web.
 *
 *   node ace erp:verificar
 *   node ace erp:verificar --fraccion=236
 */
export default class ErpVerificar extends BaseCommand {
  static commandName = 'erp:verificar'
  static description = 'Prueba la conexión con el ERP y resume fracciones, estados y precios'
  static options: CommandOptions = { startApp: true }

  @flags.number({ description: 'Código de fracción para ver el detalle de sus lotes' })
  declare fraccion?: number

  async run() {
    const { default: env } = await import('#start/env')
    const { default: LotesErpRepository } = await import('#repositories/erp/lotes_erp_repository')
    const { OdooError } = await import('#repositories/erp/odoo_client')

    this.logger.info(`ERP_DRIVER=${env.get('ERP_DRIVER')}`)

    try {
      const erp = await this.app.container.make(LotesErpRepository)
      const inicio = Date.now()
      const fracciones = await erp.buscarFracciones()
      const distritos = await erp.distritos()
      this.logger.success(
        `Conexión OK (${Date.now() - inicio} ms): ${fracciones.length} fracciones, ${distritos.length} distritos`
      )

      const libres = distritos.reduce((total, d) => total + d.lotesLibres, 0)
      this.logger.info(`Lotes libres: ${libres}`)

      const tabla = this.ui.table()
      tabla.head(['Distrito', 'Fracciones', 'Libres', 'Cuota mínima'])
      for (const d of distritos) {
        tabla.row([
          d.nombre,
          String(d.fracciones),
          String(d.lotesLibres),
          d.cuotaMinima.toLocaleString('es-PY'),
        ])
      }
      tabla.render()

      if (this.fraccion !== undefined) {
        const lotes = await erp.lotesPorFraccion(this.fraccion)
        if (lotes.length === 0) {
          this.logger.warning(`La fracción ${this.fraccion} no existe en el ERP o no tiene lotes`)
          return
        }
        const porEstado = new Map<string, number>()
        for (const l of lotes) porEstado.set(l.estado, (porEstado.get(l.estado) ?? 0) + 1)
        this.logger.info(
          `Fracción ${this.fraccion}: ${lotes.length} lotes — ` +
            [...porEstado].map(([estado, n]) => `${estado} ${n}`).join(', ')
        )
        const sinPrecio = lotes.filter((l) => l.estado === 'LIBRE' && l.importeCuota <= 0)
        if (sinPrecio.length > 0) {
          this.logger.warning(
            `Libres sin precio vigente: ${sinPrecio.map((l) => `${l.manzanaCodigo}-${l.loteCodigo}`).join(', ')}`
          )
        }
        const detalle = this.ui.table()
        detalle.head(['Mz', 'Lote', 'Estado', 'm²', 'Contado', 'Cuota', 'Cuotas'])
        for (const l of lotes.slice(0, 30)) {
          detalle.row([
            String(l.manzanaCodigo),
            String(l.loteCodigo),
            l.estado,
            String(l.superficie),
            l.precioContado.toLocaleString('es-PY'),
            l.importeCuota.toLocaleString('es-PY'),
            String(l.cantidadCuotas),
          ])
        }
        detalle.render()
        if (lotes.length > 30) this.logger.info(`(${lotes.length - 30} lotes más)`)
      }
    } catch (error) {
      if (error instanceof OdooError) {
        this.logger.error(`Odoo [${error.motivo}]: ${error.message}`)
        if (error.cause instanceof Error) {
          this.logger.error(`Detalle: ${String(error.cause.cause ?? error.cause.message)}`)
        }
      } else {
        this.logger.error(error instanceof Error ? error.message : String(error))
      }
      this.exitCode = 1
    }
  }
}
