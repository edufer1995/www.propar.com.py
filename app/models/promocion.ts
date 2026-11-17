import { PromocioneSchema } from '#database/schema'
import Upload from '#models/upload'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Promocion extends PromocioneSchema {
  static table = 'promociones'

  @belongsTo(() => Upload, { foreignKey: 'imagenUploadId' })
  declare imagen: BelongsTo<typeof Upload>

  @belongsTo(() => Upload, { foreignKey: 'pdfUploadId' })
  declare pdf: BelongsTo<typeof Upload>
}
