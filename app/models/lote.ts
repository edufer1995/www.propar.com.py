import { LoteSchema } from '#database/schema'
import Manzana from '#models/manzana'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Lote extends LoteSchema {
  static table = 'lotes'

  @belongsTo(() => Manzana, { foreignKey: 'manzanaId' })
  declare manzana: BelongsTo<typeof Manzana>
}
