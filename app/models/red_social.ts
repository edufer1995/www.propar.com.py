import { RedesSocialeSchema } from '#database/schema'
import Upload from '#models/upload'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class RedSocial extends RedesSocialeSchema {
  static table = 'redes_sociales'

  @belongsTo(() => Upload, { foreignKey: 'iconoUploadId' })
  declare icono: BelongsTo<typeof Upload>

  @belongsTo(() => Upload, { foreignKey: 'imagenUploadId' })
  declare imagen: BelongsTo<typeof Upload>
}
