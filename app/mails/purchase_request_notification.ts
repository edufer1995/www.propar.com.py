import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'

import type { LoteErp } from '#repositories/erp/lotes_erp_repository'

export interface DatosCompra {
  nombre: string
  telefono: string
  comentario: string | null
  fraccionCodigo: number
  fraccionDescripcion: string
  manzanaCodigo: number
  loteCodigo: number
  /** Snapshot de precios tomado server-side del ERP al momento del pedido */
  precio: LoteErp
}

/**
 * Notificación interna de una solicitud de compra de lote (botón
 * "Comprar" del mapa). Va a VENTAS_EMAIL; el template Edge escapa todo
 * (entrada pública).
 */
export default class PurchaseRequestNotification extends BaseMail {
  constructor(private datos: DatosCompra) {
    super()
  }

  prepare() {
    const { fraccionCodigo, manzanaCodigo, loteCodigo, precio } = this.datos
    const fml = `${fraccionCodigo}-${manzanaCodigo}-${loteCodigo}`

    const gs = new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      maximumFractionDigits: 0,
    })

    this.message
      .subject(`Solicitud de compra — Lote ${fml} (${this.datos.fraccionDescripcion})`)
      .from(env.get('MAIL_FROM'), env.get('MAIL_FROM_NAME'))
      .to(env.get('VENTAS_EMAIL'))
      .htmlView('emails/purchase_request_notification', {
        ...this.datos,
        fml,
        superficie: `${precio.superficie} m²`,
        plazos: `${precio.cantidadCuotas} meses`,
        mensual: gs.format(precio.importeCuota),
        credito: gs.format(precio.precioCredito),
      })
  }
}
