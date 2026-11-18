/*
|--------------------------------------------------------------------------
| Preguntas frecuentes (admin + página pública) y formulario Deseo vender
|--------------------------------------------------------------------------
*/

import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'

import Lead from '#models/lead'
import User from '#models/user'
import PreguntaFrecuente from '#models/pregunta_frecuente'
import VenderNotification from '#mails/vender_notification'

const PREFIJO = '¿[test-preguntas]'
const TEL_PRUEBA = '0999000111'

test.group('Preguntas frecuentes', (group) => {
  let admin: User

  group.setup(async () => {
    admin = await User.create({
      username: `test.preguntas.${Date.now()}`,
      nombre: 'Test Preguntas',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })
    await PreguntaFrecuente.createMany([
      {
        categoria: 'cuotas',
        pregunta: `${PREFIJO} visible`,
        respuesta: 'Sí.',
        orden: 9000,
        activo: true,
      },
      {
        categoria: 'cuotas',
        pregunta: `${PREFIJO} oculta`,
        respuesta: 'No.',
        orden: 9001,
        activo: false,
      },
    ])
    return async () => {
      await PreguntaFrecuente.query().where('pregunta', 'like', `${PREFIJO}%`).delete()
      await admin.delete()
    }
  })

  test('la página pública muestra solo las activas, en orden', async ({ client, assert }) => {
    const respuesta = await client.get('/preguntas-frecuentes').withInertia()
    respuesta.assertStatus(200)

    const { preguntas, categorias } = respuesta.inertiaProps as {
      preguntas: { pregunta: string; orden?: number }[]
      categorias: { valor: string }[]
    }
    const textos = preguntas.map((p) => p.pregunta)
    assert.include(textos, `${PREFIJO} visible`)
    assert.notInclude(textos, `${PREFIJO} oculta`)
    assert.equal(textos.at(-1), `${PREFIJO} visible`)
    assert.include(
      categorias.map((c) => c.valor),
      'cuotas'
    )
  })

  test('el admin crea una pregunta con el motor CRUD', async ({ client, assert }) => {
    const respuesta = await client
      .post('/app/preguntas')
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)
      .json({
        categoria: 'titulos',
        pregunta: `${PREFIJO} nueva`,
        respuesta: 'Respuesta de prueba.',
        orden: 9002,
        activo: true,
      })
    respuesta.assertStatus(302)

    const creada = await PreguntaFrecuente.findBy('pregunta', `${PREFIJO} nueva`)
    assert.equal(creada?.categoria, 'titulos')
  })

  test('el admin rechaza una categoría inválida', async ({ client, assert }) => {
    await client
      .post('/app/preguntas')
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)
      .json({
        categoria: 'inventada',
        pregunta: `${PREFIJO} inválida`,
        respuesta: 'x',
        orden: 1,
        activo: true,
      })
    assert.isNull(await PreguntaFrecuente.findBy('pregunta', `${PREFIJO} inválida`))
  })
})

test.group('Deseo vender', (group) => {
  group.each.teardown(async () => {
    mail.restore()
    await Lead.query().where('telefono', TEL_PRUEBA).delete()
  })

  test('un envío válido guarda el lead "vender" y encola el aviso', async ({ client, assert }) => {
    const { mails } = mail.fake()

    const respuesta = await client.post('/deseo-vender').withCsrfToken().withInertia().form({
      ubicacion: 'https://maps.google.com/?q=-25.3,-57.6',
      tamano: '12 × 30 m',
      precio: 'Gs. 150.000.000',
      nombre: 'Prueba Vender',
      telefono: TEL_PRUEBA,
    })
    respuesta.assertStatus(200)

    const lead = await Lead.findByOrFail('telefono', TEL_PRUEBA)
    assert.equal(lead.tipo, 'vender')
    assert.include(lead.comentario ?? '', 'Tamaño: 12 × 30 m')
    assert.isNull(lead.email)
    assert.isNotNull(lead.mailEnviadoAt)
    mails.assertQueued(VenderNotification)
  })

  test('sin ubicación ni teléfono no guarda nada', async ({ client, assert }) => {
    mail.fake()
    const respuesta = await client
      .post('/deseo-vender')
      .withCsrfToken()
      .withInertia()
      .form({ tamano: '1 ha', nombre: 'Prueba Vender', telefono: '' })
    respuesta.assertStatus(200)

    const { errors } = respuesta.inertiaProps as { errors: Record<string, string> }
    assert.properties(errors, ['ubicacion', 'telefono'])
    assert.isNull(await Lead.findBy('nombre', 'Prueba Vender'))
  })
})
