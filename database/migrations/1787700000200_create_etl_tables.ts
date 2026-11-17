import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Tablas operativas del ETL de migración desde abas_staging:
 * - etl_rechazos: filas del dump viejo que no pudieron importarse y por qué.
 * - etl_id_map: mapeo id viejo → id nuevo (necesario para migrar archivos
 *   físicos de uploads y para trazabilidad).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('etl_rechazos', (table) => {
      table.increments('id').notNullable()
      table.string('tabla').notNullable().index()
      table.string('pk_original').nullable()
      table.text('motivo').notNullable()
      table.jsonb('payload').nullable()

      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('etl_id_map', (table) => {
      table.increments('id').notNullable()
      table.string('tabla').notNullable()
      table.integer('id_viejo').notNullable()
      table.integer('id_nuevo').notNullable()

      table.timestamp('created_at').notNullable()

      table.unique(['tabla', 'id_viejo'])
    })
  }

  async down() {
    this.schema.dropTable('etl_id_map')
    this.schema.dropTable('etl_rechazos')
  }
}
