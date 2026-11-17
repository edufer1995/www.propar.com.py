/*
|--------------------------------------------------------------------------
| Tests de usuarios reales del admin (Etapa 5b)
|--------------------------------------------------------------------------
|
| Alta con contraseña temporal (hasheada con scrypt y utilizable para
| login), edición sin password, reset de contraseña, y las protecciones
| de no poder desactivarse/eliminarse a sí mismo.
|
*/

import { test } from '@japa/runner'
import hash from '@adonisjs/core/services/hash'

import User from '#models/user'

const PREFIJO = `test5b.usuarios.${Date.now()}`

test.group('Admin / usuarios reales', (group) => {
  let admin: User

  group.setup(async () => {
    admin = await User.create({
      username: `${PREFIJO}.admin`,
      nombre: 'Admin de test',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })

    return async () => {
      await User.query().where('username', 'like', `${PREFIJO}%`).delete()
    }
  })

  test('crear genera contraseña temporal utilizable y la flashea una vez', async ({
    client,
    assert,
  }) => {
    const respuesta = await client
      .post('/app/usuarios')
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)
      .json({
        username: `${PREFIJO}.nuevo`,
        nombre: 'Usuario Nuevo',
        email: `${PREFIJO}.nuevo@test.local`,
        rolId: 2,
      })

    respuesta.assertStatus(302)
    respuesta.assertFlashMessage('success', 'Usuario creado correctamente')

    const creado = await User.findByOrFail('username', `${PREFIJO}.nuevo`)
    assert.equal(creado.rolId, 2)
    assert.isTrue(creado.activo)

    /** La temporal viaja UNA vez por flash y coincide con el hash guardado */
    const flash = respuesta.flashMessages().passwordTemporal as {
      username: string
      password: string
    }
    assert.equal(flash.username, `${PREFIJO}.nuevo`)
    assert.lengthOf(flash.password, 12)
    assert.notEqual(creado.password, flash.password) // guardada hasheada
    assert.isTrue(await hash.verify(creado.password, flash.password))
  })

  test('la contraseña temporal permite iniciar sesión', async ({ client }) => {
    // Resetea para obtener una temporal fresca de un usuario conocido
    const usuario = await User.findByOrFail('username', `${PREFIJO}.nuevo`)
    const reset = await client
      .post(`/app/usuarios/${usuario.id}/reset-password`)
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)

    const flash = reset.flashMessages().passwordTemporal as { password: string }

    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .redirects(0)
      .json({ username: `${PREFIJO}.nuevo`, password: flash.password })

    login.assertStatus(302)
    login.assertHeader('location', '/app')
  })

  test('rechaza username duplicado', async ({ client, assert }) => {
    const antes = await User.query().count('* as total').firstOrFail()

    const respuesta = await client
      .post('/app/usuarios')
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)
      .json({
        username: `${PREFIJO}.nuevo`, // ya existe
        nombre: 'Duplicado',
        email: null,
        rolId: 1,
      })

    respuesta.assertStatus(302)
    const despues = await User.query().count('* as total').firstOrFail()
    assert.equal(Number(despues.$extras.total), Number(antes.$extras.total))
  })

  test('editar carga email y rol sin tocar la contraseña', async ({ client, assert }) => {
    const usuario = await User.findByOrFail('username', `${PREFIJO}.nuevo`)
    const hashAntes = usuario.password

    const respuesta = await client
      .put(`/app/usuarios/${usuario.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)
      .json({
        nombre: 'Usuario Editado',
        email: `${PREFIJO}.editado@test.local`,
        rolId: 3,
        activo: true,
      })

    respuesta.assertStatus(302)
    await usuario.refresh()
    assert.equal(usuario.nombre, 'Usuario Editado')
    assert.equal(usuario.email, `${PREFIJO}.editado@test.local`)
    assert.equal(usuario.rolId, 3)
    assert.equal(usuario.password, hashAntes)
  })

  test('no permite desactivarse a sí mismo', async ({ client, assert }) => {
    const respuesta = await client
      .put(`/app/usuarios/${admin.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)
      .json({ nombre: 'Admin de test', email: null, rolId: 1, activo: false })

    respuesta.assertStatus(302)
    await admin.refresh()
    assert.isTrue(admin.activo)
  })

  test('no permite eliminarse a sí mismo (individual ni masivo)', async ({ client, assert }) => {
    const individual = await client
      .delete(`/app/usuarios/${admin.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)
    individual.assertStatus(302)
    individual.assertFlashMessage('error', 'No podés eliminar tu propio usuario')

    const masivo = await client
      .post('/app/usuarios/destroy-masivo')
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)
      .json({ ids: [admin.id] })
    masivo.assertStatus(302)

    assert.isNotNull(await User.find(admin.id))
  })

  test('destroy elimina a otro usuario', async ({ client, assert }) => {
    const victima = await User.create({
      username: `${PREFIJO}.borrar`,
      nombre: 'Para borrar',
      password: 'secret-de-test',
      rolId: 2,
      activo: true,
    })

    const respuesta = await client
      .delete(`/app/usuarios/${victima.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)

    respuesta.assertStatus(302)
    assert.isNull(await User.find(victima.id))
  })
})
