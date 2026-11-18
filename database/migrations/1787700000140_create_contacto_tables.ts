import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Bloques de contacto del sitio: sucursales.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('sucursales', (table) => {
      table.increments('id').notNullable()
      table.string('titulo').nullable()
      table.jsonb('coordenadas').nullable()
      table.string('horarios').nullable()
      table.string('telefonos').nullable()
      table.string('estado').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('sucursales')
  }
}
