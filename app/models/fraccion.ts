import { FraccioneSchema } from '#database/schema'
import Manzana from '#models/manzana'
import Lote from '#models/lote'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

/** El driver de PG serializa arrays JS como array de Postgres si no se
 *  stringifica (mismo patrón que Alquiler.imagenes). */
const prepararJson = (value: unknown) =>
  value === null || value === undefined ? null : JSON.stringify(value)

export default class Fraccion extends FraccioneSchema {
  static table = 'fracciones'

  /** Galería de fotos: array ordenado de upload ids (jsonb). */
  @column({ prepare: prepararJson })
  declare imagenes: number[] | null

  /** Videos MP4: array ordenado de upload ids (jsonb). */
  @column({ prepare: prepararJson })
  declare videos: number[] | null

  @hasMany(() => Manzana, { foreignKey: 'fraccionId' })
  declare manzanas: HasMany<typeof Manzana>

  /** Lotes de la fracción vía el código FML desnormalizado (para counts) */
  @hasMany(() => Lote, { foreignKey: 'fraccionCodigo', localKey: 'codigo' })
  declare lotes: HasMany<typeof Lote>
}
