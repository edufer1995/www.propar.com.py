import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'promociones'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('titulo').notNullable()
      table.text('descripcion').nullable()
      table
        .integer('imagen_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')
      table.string('url').nullable()
      table.date('vigente_desde').nullable()
      table.date('vigente_hasta').nullable()
      table.boolean('activo').notNullable().defaultTo(true)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['activo', 'vigente_desde', 'vigente_hasta'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
