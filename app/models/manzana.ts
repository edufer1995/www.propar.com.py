import { ManzanaSchema } from '#database/schema'
import Fraccion from '#models/fraccion'
import Lote from '#models/lote'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class Manzana extends ManzanaSchema {
  static table = 'manzanas'

  @belongsTo(() => Fraccion, { foreignKey: 'fraccionId' })
  declare fraccion: BelongsTo<typeof Fraccion>

  @hasMany(() => Lote, { foreignKey: 'manzanaId' })
  declare lotes: HasMany<typeof Lote>
}
