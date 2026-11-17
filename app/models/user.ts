import { UserSchema } from '#database/schema'
import Rol from '#models/rol'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

const AuthFinder = withAuthFinder(hash, {
  uids: ['username', 'email'],
  passwordColumnName: 'password',
})

export default class User extends compose(UserSchema, AuthFinder) {
  static table = 'users'

  /**
   * Tokens persistentes para "Recordarme" en el login.
   */
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  @belongsTo(() => Rol, { foreignKey: 'rolId' })
  declare rol: BelongsTo<typeof Rol>

  get initials() {
    const fuente = this.nombre ?? this.username
    const [primero, segundo] = fuente.split(' ')
    if (primero && segundo) {
      return `${primero.charAt(0)}${segundo.charAt(0)}`.toUpperCase()
    }
    return `${primero.slice(0, 2)}`.toUpperCase()
  }
}
