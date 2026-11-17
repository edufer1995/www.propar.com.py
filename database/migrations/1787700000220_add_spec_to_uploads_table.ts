import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Los uploads recuerdan con qué spec fueron validados (carrusel, iconoRed,
 * etc.). El motor CRUD del admin usa esta columna para verificar que la
 * imagen elegida corresponda al tipo requerido por el campo del recurso.
 * Los 186 uploads migrados del sitio viejo quedan con spec NULL.
 */
export default class extends BaseSchema {
  protected tableName = 'uploads'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('spec').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('spec')
    })
  }
}
