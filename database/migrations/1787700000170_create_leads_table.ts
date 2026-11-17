import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'leads'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('tipo').notNullable()
      table.string('nombre').notNullable()
      table.string('telefono').notNullable()
      table.string('email').nullable()
      table.text('comentario').nullable()
      table.string('asunto').nullable()
      table.integer('fraccion_codigo').nullable()
      table.integer('manzana_codigo').nullable()
      table.integer('lote_codigo').nullable()
      table.jsonb('precio_snapshot').nullable()
      table.timestamp('mail_enviado_at').nullable()

      table.timestamp('created_at').notNullable()

      table.check(`tipo IN ('compra', 'contacto', 'vender')`, [], 'leads_tipo_check')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
