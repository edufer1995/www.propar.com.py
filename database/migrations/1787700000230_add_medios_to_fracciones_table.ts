import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Medios de las fracciones cargados desde el admin: galería de fotos y
 * videos (arrays ordenados de upload ids en jsonb).
 */
export default class extends BaseSchema {
  protected tableName = 'fracciones'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('imagenes').notNullable().defaultTo('[]')
      table.jsonb('videos').notNullable().defaultTo('[]')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('imagenes')
      table.dropColumn('videos')
    })
  }
}
