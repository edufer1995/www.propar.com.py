import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Reemplaza la tabla `users` del starter (full_name/email/password) por el
 * esquema de usuarios del negocio. Se dropea y recrea porque en esta etapa
 * la tabla solo contiene datos de prueba del starter.
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.dropTable(this.tableName)

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('username').notNullable().unique()
      table.string('email', 254).nullable().unique()
      table.string('nombre').nullable()
      table.string('password').notNullable()
      table
        .integer('rol_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('roles')
        .onDelete('RESTRICT')
        .index()
      table.boolean('activo').notNullable().defaultTo(true)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('full_name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }
}
