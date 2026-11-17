import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'proximos_desarrollos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('distrito').nullable()
      table.string('fraccion').nullable()
      table.decimal('precio_desde', 14, 0).nullable()
      table.string('estado').nullable()
      table.string('departamento').nullable()
      table.integer('lotes').nullable()
      table
        .integer('imagen_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
