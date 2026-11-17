import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Imagen ampliable de la card de red social en el home. Es OTRA cosa que
 * el icono: el icono (cuadrado, 128×128) identifica la marca en el pie y
 * en la card; esta imagen es la foto/placa que se abre a pantalla
 * completa desde el botón de ampliar. Nullable: las redes ya cargadas
 * siguen mostrando solo el icono, sin botón.
 */
export default class extends BaseSchema {
  protected tableName = 'redes_sociales'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('imagen_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('imagen_upload_id')
    })
  }
}
