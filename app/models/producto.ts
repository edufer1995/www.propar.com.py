import { ProductoSchema } from '#database/schema'

export default class Producto extends ProductoSchema {
  static table = 'producto'
}
