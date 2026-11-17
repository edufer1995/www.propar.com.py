import { LotesDistritoSchema } from '#database/schema'
import Upload from '#models/upload'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class LoteDistrito extends LotesDistritoSchema {
  static table = 'lotes_distritos'

  @belongsTo(() => Upload, { foreignKey: 'imagenUploadId' })
  declare imagen: BelongsTo<typeof Upload>
}
