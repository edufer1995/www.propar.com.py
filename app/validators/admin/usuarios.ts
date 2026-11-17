/*
|--------------------------------------------------------------------------
| Validators de usuarios reales del admin (tabla users)
|--------------------------------------------------------------------------
|
| La contraseña NO viaja en estos forms: al crear (o resetear) el server
| genera una temporal que se muestra una sola vez. La unicidad de
| username/email se verifica en el controller (mensaje propio en es).
|
*/

import vine from '@vinejs/vine'

export const crearUsuarioValidator = vine.create({
  username: vine
    .string()
    .trim()
    .minLength(3)
    .maxLength(60)
    .regex(/^[a-zA-Z0-9._-]+$/),
  nombre: vine.string().trim().minLength(3).maxLength(120),
  email: vine.string().trim().email().maxLength(254).nullable(),
  rolId: vine.number().withoutDecimals().positive(),
})

export const editarUsuarioValidator = vine.create({
  nombre: vine.string().trim().minLength(3).maxLength(120),
  email: vine.string().trim().email().maxLength(254).nullable(),
  rolId: vine.number().withoutDecimals().positive(),
  activo: vine.boolean(),
})
