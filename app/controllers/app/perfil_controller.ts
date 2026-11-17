import { changePasswordValidator } from '#validators/auth'
import hash from '@adonisjs/core/services/hash'
import { errors as vineErrors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'

export default class PerfilController {
  async show({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('rol')

    return inertia.render('admin/cuenta', {
      perfil: {
        username: user.username,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol.descripcion,
        miembroDesde: user.createdAt.toISO()!,
      },
    })
  }

  async updatePassword({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { currentPassword, password } = await request.validateUsing(changePasswordValidator)

    /**
     * La contraseña actual debe coincidir con el hash guardado. El error se
     * reporta con la misma forma que VineJS para que se muestre inline.
     */
    const valida = await hash.verify(user.password, currentPassword)
    if (!valida) {
      throw new vineErrors.E_VALIDATION_ERROR([
        {
          field: 'currentPassword',
          rule: 'currentPassword',
          message: 'La contraseña actual no es correcta',
        },
      ])
    }

    user.password = password
    await user.save()

    session.flash('success', 'Contraseña actualizada correctamente')
    return response.redirect().back()
  }
}
