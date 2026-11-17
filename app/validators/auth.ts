import vine from '@vinejs/vine'

/**
 * Reglas compartidas.
 */
const nuevaPassword = () =>
  vine.string().minLength(8).maxLength(72).confirmed({
    confirmationField: 'passwordConfirmation',
  })

/**
 * Login: acepta username o email como identificador.
 */
export const loginValidator = vine.create({
  username: vine.string().trim(),
  password: vine.string(),
  remember: vine.boolean().optional(),
})

/**
 * Olvidé mi contraseña: solo pide el email.
 */
export const forgotPasswordValidator = vine.create({
  email: vine.string().trim().email().maxLength(254),
})

/**
 * Restablecer contraseña vía token (el token viaja por la URL).
 */
export const resetPasswordValidator = vine.create({
  password: nuevaPassword(),
  passwordConfirmation: vine.string(),
})

/**
 * Cambio de contraseña estando logueado (perfil).
 */
export const changePasswordValidator = vine.create({
  currentPassword: vine.string(),
  password: nuevaPassword(),
  passwordConfirmation: vine.string(),
})
