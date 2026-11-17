/*
|--------------------------------------------------------------------------
| Tests de autorización por rol (Etapa 6)
|--------------------------------------------------------------------------
|
| Política (ver start/routes.ts): nivel 1 = todo; nivel 2 = contenido del
| sitio sin secciones sensibles (Leads / Usuarios / Usuarios App); niveles
| 3 y 4 = solo dashboard y perfil.
|
*/

import { test } from '@japa/runner'

import User from '#models/user'

test.group('Admin / autorización por rol', (group) => {
  let admin: User
  let vendedor: User
  let cargaContactos: User

  group.setup(async () => {
    const marca = Date.now()
    admin = await User.create({
      username: `test.rol1.${marca}`,
      nombre: 'Test Rol Admin',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })
    vendedor = await User.create({
      username: `test.rol2.${marca}`,
      nombre: 'Test Rol Vendedor',
      password: 'secret-de-test',
      rolId: 2,
      activo: true,
    })
    cargaContactos = await User.create({
      username: `test.rol3.${marca}`,
      nombre: 'Test Rol Carga',
      password: 'secret-de-test',
      rolId: 3,
      activo: true,
    })

    return async () => {
      await admin.delete()
      await vendedor.delete()
      await cargaContactos.delete()
    }
  })

  test('el administrador (nivel 1) accede a las secciones sensibles', async ({ client }) => {
    const usuarios = await client.get('/app/usuarios').loginAs(admin).withInertia()
    usuarios.assertStatus(200)
    usuarios.assertInertiaComponent('admin/recursos/usuarios')

    const leads = await client.get('/app/leads').loginAs(admin).withInertia()
    leads.assertStatus(200)
  })

  test('el vendedor (nivel 2) accede al contenido pero no a lo sensible', async ({ client }) => {
    const sucursales = await client.get('/app/sucursales').loginAs(vendedor).withInertia()
    sucursales.assertStatus(200)

    const usuarios = await client.get('/app/usuarios').loginAs(vendedor).redirects(0)
    usuarios.assertStatus(302)
    usuarios.assertHeader('location', '/app')

    const leads = await client.get('/app/leads').loginAs(vendedor).redirects(0)
    leads.assertStatus(302)
    leads.assertHeader('location', '/app')

    const usuariosApp = await client.get('/app/usuarios-app').loginAs(vendedor).redirects(0)
    usuariosApp.assertStatus(302)
    usuariosApp.assertHeader('location', '/app')
  })

  test('los roles de la app móvil (nivel 3+) solo ven dashboard y perfil', async ({ client }) => {
    const dashboard = await client.get('/app').loginAs(cargaContactos).withInertia()
    dashboard.assertStatus(200)

    const perfil = await client.get('/app/perfil').loginAs(cargaContactos).withInertia()
    perfil.assertStatus(200)

    const sucursales = await client.get('/app/sucursales').loginAs(cargaContactos).redirects(0)
    sucursales.assertStatus(302)
    sucursales.assertHeader('location', '/app')

    const usuarios = await client.get('/app/usuarios').loginAs(cargaContactos).redirects(0)
    usuarios.assertStatus(302)
    usuarios.assertHeader('location', '/app')
  })

  test('subir imágenes exige rol de contenido (nivel <= 2)', async ({ client }) => {
    const respuesta = await client
      .post('/api/uploads')
      .loginAs(cargaContactos)
      .withCsrfToken()
      .redirects(0)
    respuesta.assertStatus(302)
    respuesta.assertHeader('location', '/app')
  })
})
