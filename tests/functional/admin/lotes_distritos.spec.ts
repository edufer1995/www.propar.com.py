/*
|--------------------------------------------------------------------------
| Tests de los tiles "Lotes por distrito" (agregar / quitar dinámico)
|--------------------------------------------------------------------------
|
| El admin decide cuántos tiles hay: store crea, destroy elimina (y borra
| el upload asociado), y el home muestra SOLO los distritos elegidos.
|
*/

import { test } from '@japa/runner'

import LoteDistrito from '#models/lote_distrito'
import User from '#models/user'

test.group('Admin / lotes por distrito', (group) => {
  let usuario: User

  group.setup(async () => {
    usuario = await User.create({
      username: `test.distritos.${Date.now()}`,
      nombre: 'Test Distritos',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })

    return async () => {
      await usuario.delete()
    }
  })

  test('store agrega un tile nuevo', async ({ client, assert }) => {
    const antes = await LoteDistrito.query().count('* as total').firstOrFail()

    const respuesta = await client
      .post('/app/lotes-por-distrito')
      .loginAs(usuario)
      .withCsrfToken()
      .withInertia()
      .form({ distritoCodigo: 424242 })

    respuesta.assertStatus(200)

    const despues = await LoteDistrito.query().count('* as total').firstOrFail()
    assert.equal(Number(despues.$extras.total), Number(antes.$extras.total) + 1)

    await LoteDistrito.query().where('distrito_codigo', 424242).delete()
  })

  test('store rechaza un distrito repetido con error de validación', async ({ client, assert }) => {
    const existente = await LoteDistrito.query().firstOrFail()

    const respuesta = await client
      .post('/app/lotes-por-distrito')
      .loginAs(usuario)
      .withCsrfToken()
      .withInertia()
      .form({ distritoCodigo: existente.distritoCodigo })

    respuesta.assertStatus(200)
    assert.property(respuesta.inertiaProps.errors ?? {}, 'distritoCodigo')

    const repetidos = await LoteDistrito.query()
      .where('distrito_codigo', existente.distritoCodigo)
      .count('* as total')
      .firstOrFail()
    assert.equal(Number(repetidos.$extras.total), 1)
  })

  test('destroy quita el tile', async ({ client, assert }) => {
    const tile = await LoteDistrito.create({ distritoCodigo: 424243 })

    const respuesta = await client
      .delete(`/app/lotes-por-distrito/${tile.id}`)
      .loginAs(usuario)
      .withCsrfToken()
      .withInertia()

    respuesta.assertStatus(200)
    assert.isNull(await LoteDistrito.find(tile.id))
  })

  test('el home solo muestra los distritos elegidos en el admin', async ({ client, assert }) => {
    const tiles = await LoteDistrito.query()

    const respuesta = await client.get('/').withInertia()
    respuesta.assertStatus(200)

    const distritos = respuesta.inertiaProps.distritos as { codigo: number }[]
    const codigosTiles = new Set(tiles.map((t) => t.distritoCodigo))
    for (const d of distritos) {
      assert.isTrue(codigosTiles.has(d.codigo))
    }
  })
})
