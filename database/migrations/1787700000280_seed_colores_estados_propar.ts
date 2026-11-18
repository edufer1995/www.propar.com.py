import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Colores de los cuatro estados que devuelve el conector de Odoo
 * (ESTADOS_WEB en odoo_lotes_erp_repository.ts), con la paleta de marca.
 * Solo inserta los que falten: si el admin ya los cambió, no los pisa.
 */
const ESTADOS = [
  { estado: 'LIBRE', color: '#6a822b', descripcion: 'Disponible para la venta' },
  { estado: 'RESERVADO', color: '#ec8a1a', descripcion: 'Reservado (portal o propietario)' },
  { estado: 'VENDIDO', color: '#9aa0a6', descripcion: 'Vendido o en proceso de venta' },
  { estado: 'NO DISPONIBLE', color: '#785624', descripcion: 'No disponible para la venta' },
]

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      const ahora = new Date()
      await db
        .table('lotes_colores')
        .insert(ESTADOS.map((e) => ({ ...e, created_at: ahora, updated_at: ahora })))
        .onConflict('estado')
        .ignore()
    })
  }

  async down() {
    this.defer(async (db) => {
      await db
        .from('lotes_colores')
        .whereIn(
          'estado',
          ESTADOS.map((e) => e.estado)
        )
        .delete()
    })
  }
}
