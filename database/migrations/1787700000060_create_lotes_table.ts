import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lotes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('manzana_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('manzanas')
        .onDelete('CASCADE')
        .index()
      table.integer('fraccion_codigo').notNullable()
      table.integer('manzana_codigo').notNullable()
      table.integer('codigo').notNullable()
      table.jsonb('coorde_centro').nullable()
      table.jsonb('coorde_lados').nullable()
      table.string('observacion').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['fraccion_codigo', 'manzana_codigo', 'codigo'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
