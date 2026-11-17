/*
|--------------------------------------------------------------------------
| Tests de colores de estados (Etapa 5b)
|--------------------------------------------------------------------------
|
| Update en bloque de lotes_colores (transacción) con validación #rrggbb
| y efecto en la leyenda del mapa público /loteamientos.
|
*/

import { test } from '@japa/runner'

import LoteColor from '#models/lote_color'
import User from '#models/user'

test.group('Admin / colores de estados', (group) => {
  let usuario: User
  let fila: LoteColor
  let colorOriginal: string

  group.setup(async () => {
    usuario = await User.create({
      username: `test.colores.${Date.now()}`,
      nombre: 'Test Colores',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })

    fila = await LoteColor.query().orderBy('id', 'asc').firstOrFail()
    colorOriginal = fila.color

    return async () => {
      fila.color = colorOriginal
      await fila.save()
      await usuario.delete()
    }
  })

  test('update válido persiste y normaliza a mayúsculas', async ({ client, assert }) => {
    const respuesta = await client
      .post('/app/colores')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({ colores: [{ id: fila.id, color: '#a1b2c3' }] })

    respuesta.assertStatus(302)
    respuesta.assertFlashMessage('success', 'Colores actualizados correctamente')

    await fila.refresh()
    assert.equal(fila.color, '#A1B2C3')
  })

  test('el color nuevo llega a la leyenda del mapa público', async ({ client, assert }) => {
    const respuesta = await client.get('/loteamientos').withInertia()
    respuesta.assertStatus(200)

    const colores = respuesta.inertiaProps.colores as { estado: string; color: string }[]
    const nuestro = colores.find((c) => c.estado === fila.estado)
    assert.equal(nuestro?.color, '#A1B2C3')
  })

  test('rechaza un hex inválido sin tocar la base', async ({ client, assert }) => {
    const respuesta = await client
      .post('/app/colores')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({ colores: [{ id: fila.id, color: 'verde' }] })

    respuesta.assertStatus(302) // redirect back con errores flasheados
    await fila.refresh()
    assert.equal(fila.color, '#A1B2C3') // sigue el valor del test anterior
  })
})
