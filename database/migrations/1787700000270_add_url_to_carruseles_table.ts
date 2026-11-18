import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Enlace propio del slide (ruta interna o http(s)): el botón del slide
 * deja de depender solo de una fracción, para slides que no son de
 * loteamientos (ej. una página de promoción). Nullable: los slides existentes siguen
 * con su "Ver lotes" de siempre.
 */
export default class extends BaseSchema {
  protected tableName = 'carruseles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('url', 300).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('url')
    })
  }
}
