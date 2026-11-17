/*
|--------------------------------------------------------------------------
| Tests de promociones del admin
|--------------------------------------------------------------------------
|
| El campo url termina como href en el home público, así que el validator
| solo acepta rutas internas ("/algo") o URLs http(s) absolutas y rechaza
| esquemas tipo "javascript:".
|
| Corren contra abas_v2: crean filas propias con un prefijo único y las
| borran al final — nunca truncan tablas.
|
*/

import { test } from '@japa/runner'

import Promocion from '#models/promocion'
import User from '#models/user'

/** Prefijo único de esta corrida (permite borrar exactamente lo creado) */
const PREFIJO = `TestPromoUrl-${Date.now()}`

test.group('Admin / promociones: validación de la url', (group) => {
  let usuario: User

  group.setup(async () => {
    usuario = await User.create({
      username: `test.promociones.${Date.now()}`,
      nombre: 'Test Promociones',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })

    return async () => {
      await Promocion.query().where('titulo', 'like', `${PREFIJO}%`).delete()
      await usuario.delete()
    }
  })

  /** Payload base válido del store (sin imagen: el campo es opcional) */
  const payload = (titulo: string, url: string | null) => ({
    titulo,
    descripcion: null,
    url,
    vigenteDesde: null,
    vigenteHasta: null,
    activo: true,
    modal: false,
  })

  test('rechaza una url con esquema javascript:', async ({ client, assert }) => {
    const respuesta = await client
      .post('/app/promociones')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json(payload(`${PREFIJO} XSS`, 'javascript:alert(1)'))

    respuesta.assertStatus(302) // redirect back con el error flasheado
    assert.isNull(await Promocion.findBy('titulo', `${PREFIJO} XSS`))
  })

  test('rechaza una url protocol-relative (//dominio)', async ({ client, assert }) => {
    const respuesta = await client
      .post('/app/promociones')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json(payload(`${PREFIJO} Relativa`, '//evil.com'))

    respuesta.assertStatus(302)
    assert.isNull(await Promocion.findBy('titulo', `${PREFIJO} Relativa`))
  })

  test('acepta una ruta interna', async ({ client, assert }) => {
    const respuesta = await client
      .post('/app/promociones')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json(payload(`${PREFIJO} Interna`, '/loteamientos'))

    respuesta.assertStatus(302)

    const creada = await Promocion.findBy('titulo', `${PREFIJO} Interna`)
    assert.isNotNull(creada)
    assert.equal(creada!.url, '/loteamientos')
  })

  test('acepta una url https absoluta', async ({ client, assert }) => {
    const respuesta = await client
      .post('/app/promociones')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json(payload(`${PREFIJO} Externa`, 'https://ejemplo.com'))

    respuesta.assertStatus(302)

    const creada = await Promocion.findBy('titulo', `${PREFIJO} Externa`)
    assert.isNotNull(creada)
    assert.equal(creada!.url, 'https://ejemplo.com')
  })
})
