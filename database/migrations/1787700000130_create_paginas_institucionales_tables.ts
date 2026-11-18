import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Singletons del CMS institucional: quienes_somos, mision, vision,
 * producto y trayectoria.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('quienes_somos', (table) => {
      table.increments('id').notNullable()
      table.string('titulo').nullable()
      table.text('parrafo_uno').nullable()
      table.text('parrafo_dos').nullable()
      table.text('parrafo_tres').nullable()
      table.text('parrafo_cuatro').nullable()
      table
        .integer('imagen_uno_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')
      table
        .integer('imagen_dos_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')
      table
        .integer('imagen_tres_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('mision', (table) => {
      table.increments('id').notNullable()
      table.string('titulo').nullable()
      table.text('parrafo_uno').nullable()
      table
        .integer('imagen_uno_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')
      table
        .integer('imagen_dos_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('vision', (table) => {
      table.increments('id').notNullable()
      table.string('titulo').nullable()
      table.text('parrafo_uno').nullable()
      table
        .integer('imagen_uno_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('producto', (table) => {
      table.increments('id').notNullable()
      table.string('titulo').nullable()
      table.text('parrafo_uno').nullable()
      table
        .integer('imagen_uno_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('trayectoria', (table) => {
      table.increments('id').notNullable()
      table.string('titulo').nullable()
      table.text('parrafo_uno').nullable()
      table.text('parrafo_dos').nullable()
      table.text('parrafo_tres').nullable()
      table.text('parrafo_cuatro').nullable()
      table.text('parrafo_cinco').nullable()
      table.text('parrafo_seis').nullable()
      table
        .integer('imagen_uno_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')
      table
        .integer('imagen_dos_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')
      table
        .integer('imagen_tres_upload_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('uploads')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('trayectoria')
    this.schema.dropTable('producto')
    this.schema.dropTable('vision')
    this.schema.dropTable('mision')
    this.schema.dropTable('quienes_somos')
  }
}
