/*
|--------------------------------------------------------------------------
| Tests del sitio público (Etapa 4a)
|--------------------------------------------------------------------------
|
| Corren contra la base de desarrollo: las páginas leen datos reales; el formulario de
| contacto crea leads de prueba que se eliminan al final. El mailer se
| fakea (nunca se toca el SMTP real).
|
*/

import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'

import Lead from '#models/lead'
import ContactNotification from '#mails/contact_notification'

const CORREO_PRUEBA = 'test-etapa4a@prueba.local'

const DATOS_VALIDOS = {
  nombre: 'Prueba',
  apellido: 'Funcional',
  telefono: '0981123456',
  correo: CORREO_PRUEBA,
  asunto: 'vender-propiedad',
  consulta: 'Consulta generada por el test funcional del sitio público.',
}

test.group('Sitio público — páginas', () => {
  test('responde 200 con la página Inertia correcta: {pagina}')
    .with([
      { url: '/', componente: 'public/home' },
      { url: '/quienes-somos', componente: 'public/quienes_somos' },
      { url: '/contacto', componente: 'public/contacto' },
      { url: '/loteamientos', componente: 'public/loteamientos' },
    ])
    .run(async ({ client }, { url, componente }) => {
      const respuesta = await client.get(url).withInertia()
      respuesta.assertStatus(200)
      respuesta.assertInertiaComponent(componente)
    })

  test('el home comparte los rangos de cuota idénticos al sitio viejo', async ({
    client,
    assert,
  }) => {
    const respuesta = await client.get('/').withInertia()
    respuesta.assertStatus(200)

    const props = respuesta.inertiaProps as { rangosCuota: { valor: string; etiqueta: string }[] }
    assert.deepEqual(
      props.rangosCuota.map((r) => r.valor),
      ['1', '2', '3', '4', '5', '6']
    )
    assert.equal(props.rangosCuota[0].etiqueta, 'Menor a 200.000 Gs')
    assert.equal(props.rangosCuota[5].etiqueta, 'Mayor a 1.000.000 Gs')
  })

  test('las páginas de Abas (alquileres, parking, abas-guarda) no existen', async ({ client }) => {
    for (const url of ['/alquileres', '/parking', '/abas-guarda']) {
      const pagina = await client.get(url)
      pagina.assertStatus(404)
    }
  })

  test('/propiedades redirige 301 a /loteamientos conservando la query', async ({
    client,
    assert,
  }) => {
    const respuesta = await client.get('/propiedades?texto=sendero&rango=2').redirects(0)
    respuesta.assertStatus(301)
    const destino = respuesta.header('location') ?? ''
    assert.include(destino, '/loteamientos')
    assert.include(destino, 'texto=sendero')
    assert.include(destino, 'rango=2')
  })
})

test.group('Sitio público — contacto', (group) => {
  group.each.teardown(async () => {
    mail.restore()
    await Lead.query().where('email', CORREO_PRUEBA).delete()
  })

  test('un envío válido persiste el lead y encola el mail', async ({ client, assert }) => {
    const { mails } = mail.fake()

    const respuesta = await client
      .post('/contacto')
      .withCsrfToken()
      .withInertia()
      .form(DATOS_VALIDOS)

    respuesta.assertStatus(200)

    const lead = await Lead.findByOrFail('email', CORREO_PRUEBA)
    assert.equal(lead.tipo, 'vender')
    assert.equal(lead.nombre, 'Prueba Funcional')
    assert.equal(lead.asunto, 'Interesado en vender una propiedad')
    assert.isNotNull(lead.mailEnviadoAt)

    mails.assertQueued(ContactNotification)
  })

  test('datos inválidos devuelven errores de validación en español', async ({ client, assert }) => {
    mail.fake()

    const respuesta = await client
      .post('/contacto')
      .withCsrfToken()
      .withInertia()
      .form({ ...DATOS_VALIDOS, correo: 'no-es-un-mail', nombre: 'Al' })

    respuesta.assertStatus(200)

    const props = respuesta.inertiaProps as { errors: Record<string, string> }
    assert.equal(props.errors.correo, 'Ingresá un correo electrónico válido')
    assert.include(props.errors.nombre, 'al menos 3 caracteres')

    const lead = await Lead.findBy('email', 'no-es-un-mail')
    assert.isNull(lead)
  })

  test('el sexto envío del mismo minuto queda bloqueado por rate limit', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()

    // Los dos tests anteriores ya consumieron 2 del cupo de 5 por minuto.
    for (let i = 0; i < 3; i++) {
      await client.post('/contacto').withCsrfToken().withInertia().form(DATOS_VALIDOS)
    }

    const bloqueado = await client
      .post('/contacto')
      .withCsrfToken()
      .withInertia()
      .form(DATOS_VALIDOS)
    bloqueado.assertStatus(200)

    // El envío bloqueado no crea lead: siguen siendo los 3 del bucle.
    const cantidad = await Lead.query()
      .where('email', CORREO_PRUEBA)
      .count('* as total')
      .firstOrFail()
    assert.equal(Number(cantidad.$extras.total), 3)

    mails.assertQueuedCount(ContactNotification, 3)
  })
})
