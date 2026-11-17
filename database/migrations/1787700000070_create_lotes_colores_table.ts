import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lotes_colores'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('estado').notNullable().unique()
      table.string('color', 7).notNullable()
      table.string('descripcion').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.check(`color ~ '^#[0-9a-fA-F]{6}$'`, [], 'lotes_colores_color_formato_check')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
