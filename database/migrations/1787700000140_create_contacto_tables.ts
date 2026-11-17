import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Bloques de contacto del sitio: ofrecemos, nuestros_horarios,
 * direccion_contacto y sucursales.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('ofrecemos', (table) => {
      table.increments('id').notNullable()
      table.string('descripcion').nullable()
      table
        .integer('imagen_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')
      table.boolean('imagen_check').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('nuestros_horarios', (table) => {
      table.increments('id').notNullable()
      table.string('descripcion').nullable()
      table.string('obs').nullable()
      table.boolean('obs_check').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('direccion_contacto', (table) => {
      table.increments('id').notNullable()
      table.string('descripcion').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

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
    this.schema.dropTable('direccion_contacto')
    this.schema.dropTable('nuestros_horarios')
    this.schema.dropTable('ofrecemos')
  }
}
