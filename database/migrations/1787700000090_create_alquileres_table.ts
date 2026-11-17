import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'alquileres'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.decimal('precio_mensual', 14, 0).nullable()
      table.decimal('precio_garantia', 14, 0).nullable()
      table.string('direccion').nullable()
      table.string('ubicacion').nullable()
      table.string('contacto').nullable()
      table.integer('habitaciones').nullable()
      table.integer('banos').nullable()
      table.integer('cocinas').nullable()
      table.text('observaciones').nullable()
      table.jsonb('coordenadas').nullable()
      table.string('estado').nullable()
      table.jsonb('imagenes').nullable()
      table.boolean('expensas').nullable()
      table.boolean('balcon').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
