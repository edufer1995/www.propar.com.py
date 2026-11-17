import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Promociones destacadas: además de su card en el home, la promoción se
 * abre como modal al entrar al sitio. Las existentes quedan en false (se
 * siguen viendo solo como card, como hasta ahora).
 */
export default class extends BaseSchema {
  protected tableName = 'promociones'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('modal').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('modal')
    })
  }
}
