import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import User from '#models/user'

export type ResultadoAdminInicial = 'sin-variables' | 'clave-corta' | 'ya-hay-usuarios' | 'creado'

/**
 * Crea el primer administrador a partir de ADMIN_INICIAL_USUARIO y
 * ADMIN_INICIAL_PASSWORD, solo si la tabla users está vacía. La contraseña
 * nunca pasa por el repo ni por los logs; después de entrar conviene
 * cambiarla desde "Mi cuenta" y borrar la variable.
 */
export async function crearAdminInicial(): Promise<ResultadoAdminInicial> {
  const username = env.get('ADMIN_INICIAL_USUARIO')?.trim()
  const password = env.get('ADMIN_INICIAL_PASSWORD')
  if (!username || !password) return 'sin-variables'
  if (password.length < 10) {
    logger.error('admin inicial: ADMIN_INICIAL_PASSWORD debe tener al menos 10 caracteres')
    return 'clave-corta'
  }
  if (await User.query().first()) return 'ya-hay-usuarios'

  await User.create({ username, nombre: username, password, rolId: 1, activo: true })
  logger.info(`admin inicial: administrador "${username}" creado`)
  return 'creado'
}
