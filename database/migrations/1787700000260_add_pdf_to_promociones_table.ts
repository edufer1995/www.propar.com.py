import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Bases y condiciones de la promoción: PDF opcional que se adjunta desde
 * el ABM y se ofrece como enlace en la card y en el modal del home.
 * Nullable: las promociones existentes siguen sin bases.
 */
export default class extends BaseSchema {
  protected tableName = 'promociones'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('pdf_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('pdf_upload_id')
    })
  }
}
