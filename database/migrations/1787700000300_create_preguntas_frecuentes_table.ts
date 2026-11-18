import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Preguntas frecuentes del sitio público (/preguntas-frecuentes). Se cargan
 * desde el admin; la categoría arma los filtros de la página.
 */
const INICIALES = [
  {
    categoria: 'titulos',
    pregunta: '¿Cómo titulo mi lote?',
    respuesta:
      'Una vez canceladas las cuotas, se solicita una orden de escrituración en cualquiera de nuestras sucursales.',
    orden: 1,
  },
  {
    categoria: 'tramites',
    pregunta: '¿Qué necesito para la cesión de derechos y acciones de mi lote?',
    respuesta: 'Tener la cuota al día o haber cancelado el lote.',
    orden: 2,
  },
  {
    categoria: 'tramites',
    pregunta: '¿Qué necesito para cambiar de lote?',
    respuesta: 'Tener la cuota al día.',
    orden: 3,
  },
  {
    categoria: 'tramites',
    pregunta: '¿Qué necesito para solicitar constancias?',
    respuesta: 'Tener el impuesto inmobiliario al día.',
    orden: 4,
  },
]

export default class extends BaseSchema {
  protected tableName = 'preguntas_frecuentes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('categoria', 30).notNullable()
      table.string('pregunta', 255).notNullable()
      table.text('respuesta').notNullable()
      table.integer('orden').notNullable().defaultTo(0)
      table.boolean('activo').notNullable().defaultTo(true)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.defer(async (db) => {
      const ahora = new Date()
      await db
        .table(this.tableName)
        .insert(
          INICIALES.map((p) => ({ ...p, activo: true, created_at: ahora, updated_at: ahora }))
        )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
