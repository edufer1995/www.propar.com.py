import { AlquilereSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'

export default class Alquiler extends AlquilereSchema {
  static table = 'alquileres'

  /**
   * Galería: array ordenado de upload ids en jsonb. Se re-declara la
   * columna con prepare porque el driver de PG serializa los arrays JS
   * como array de Postgres (no como JSON) si no se stringifica.
   */
  @column({
    prepare: (value: unknown) =>
      value === null || value === undefined ? null : JSON.stringify(value),
  })
  declare imagenes: number[] | null
}
