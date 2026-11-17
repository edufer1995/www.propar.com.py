import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fracciones'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('codigo').notNullable().unique()
      table.string('descripcion').nullable()
      table.jsonb('coorde_centro').nullable()
      table.jsonb('coorde_lados').nullable()
      table.string('observacion').nullable()
      table.string('estado').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
