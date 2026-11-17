import { randomInt } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'

import Rol from '#models/rol'
import User from '#models/user'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'
import { errorDeCampo } from '#controllers/admin/concerns/imagenes_recurso'
import { crearUsuarioValidator, editarUsuarioValidator } from '#validators/admin/usuarios'

/**
 * Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para contraseñas
 * temporales legibles que se dictan por teléfono.
 */
const ALFABETO_PASSWORD = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generarPasswordTemporal(largo = 12): string {
  let resultado = ''
  for (let i = 0; i < largo; i++) {
    resultado += ALFABETO_PASSWORD[randomInt(ALFABETO_PASSWORD.length)]
  }
  return resultado
}

/**
 * Usuarios reales del admin (tabla users). Acá se cargan los EMAILS que
 * faltan de la migración (35/36 sin email) para que funcione "olvidé mi
 * contraseña". Las contraseñas nunca se editan a mano: al crear o
 * resetear se genera una temporal que se muestra UNA sola vez
 * (flash passwordTemporal → modal con botón copiar).
 */
export default class UsuariosController extends RecursoController<User> {
  protected config: ConfigRecurso = {
    modelo: User,
    pagina: 'admin/recursos/usuarios',
    recurso: 'usuarios',
    nombre: 'Usuario',
    genero: 'm',
    busquedaEn: ['username', 'nombre', 'email'],
    ordenables: {
      id: 'id',
      username: 'username',
      nombre: 'nombre',
      email: 'email',
      activo: 'activo',
    },
    ordenDefault: { sort: 'id', order: 'asc' },
    precargar: ['rol'],
  }

  protected async propsExtra() {
    const roles = await Rol.query().orderBy('nivel', 'asc')
    return {
      roles: roles.map((r) => ({ id: r.id, descripcion: r.descripcion })),
    }
  }

  protected serializar(fila: User) {
    return {
      id: fila.id,
      username: fila.username,
      nombre: fila.nombre,
      email: fila.email,
      rolId: fila.rolId,
      rol: fila.rol?.descripcion ?? null,
      activo: fila.activo,
      creado: fila.createdAt.toISO(),
    }
  }

  /** Solo lo usa update (store está sobrescrito): valida la edición. */
  protected async validar(ctx: HttpContext) {
    const datos = await ctx.request.validateUsing(editarUsuarioValidator)
    const id = Number(ctx.params.id)

    await this.#verificarEmailLibre(datos.email ?? null, id)
    await this.#verificarRol(datos.rolId)

    if (ctx.auth.user?.id === id && !datos.activo) {
      throw errorDeCampo('activo', 'No podés desactivar tu propio usuario')
    }

    return {
      nombre: datos.nombre,
      email: datos.email ?? null,
      rolId: datos.rolId,
      activo: datos.activo,
    }
  }

  /**
   * Alta con contraseña temporal generada en el server. El hash lo hace
   * el modelo (withAuthFinder + scrypt) al guardar; el texto plano viaja
   * una única vez por flash.
   */
  async store(ctx: HttpContext) {
    const datos = await ctx.request.validateUsing(crearUsuarioValidator)

    const usernameEnUso = await User.findBy('username', datos.username)
    if (usernameEnUso) {
      throw errorDeCampo('username', 'Ese nombre de usuario ya está en uso')
    }
    await this.#verificarEmailLibre(datos.email ?? null, null)
    await this.#verificarRol(datos.rolId)

    const password = generarPasswordTemporal()

    const usuario = await User.create({
      username: datos.username,
      nombre: datos.nombre,
      email: datos.email ?? null,
      rolId: datos.rolId,
      activo: true,
      password,
    })

    ctx.session.flash('success', 'Usuario creado correctamente')
    ctx.session.flash('passwordTemporal', { username: usuario.username, password })
    return ctx.response.redirect().back()
  }

  /** Resetea la contraseña de un usuario: nueva temporal visible UNA vez. */
  async resetPassword(ctx: HttpContext) {
    const usuario = await User.findOrFail(ctx.params.id)

    const password = generarPasswordTemporal()
    usuario.password = password
    await usuario.save()

    ctx.session.flash('success', `Contraseña de ${usuario.username} restablecida`)
    ctx.session.flash('passwordTemporal', { username: usuario.username, password })
    return ctx.response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    if (ctx.auth.user?.id === Number(ctx.params.id)) {
      ctx.session.flash('error', 'No podés eliminar tu propio usuario')
      return ctx.response.redirect().back()
    }
    return super.destroy(ctx)
  }

  async destroyMasivo(ctx: HttpContext) {
    const ids = (ctx.request.input('ids') ?? []) as unknown[]
    if (Array.isArray(ids) && ids.some((id) => Number(id) === ctx.auth.user?.id)) {
      ctx.session.flash('error', 'La selección incluye tu propio usuario: no se eliminó nada')
      return ctx.response.redirect().back()
    }
    return super.destroyMasivo(ctx)
  }

  protected csv() {
    return {
      encabezados: ['ID', 'Usuario', 'Nombre', 'Email', 'Rol', 'Activo', 'Creado'],
      fila: (fila: User) => [
        fila.id,
        fila.username,
        fila.nombre,
        fila.email,
        fila.rol?.descripcion ?? null,
        fila.activo ? 'Sí' : 'No',
        fila.createdAt.setZone('America/Asuncion').toFormat('dd/MM/yyyy'),
      ],
    }
  }

  /** email UNIQUE (nullable): rechaza si otro usuario ya lo tiene */
  async #verificarEmailLibre(email: string | null, idActual: number | null) {
    if (!email) return
    const consulta = User.query().where('email', email)
    if (idActual) consulta.whereNot('id', idActual)
    if (await consulta.first()) {
      throw errorDeCampo('email', 'Ese email ya está asignado a otro usuario')
    }
  }

  async #verificarRol(rolId: number) {
    if (!(await Rol.find(rolId))) {
      throw errorDeCampo('rolId', 'El rol seleccionado no existe')
    }
  }
}
