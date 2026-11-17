/*
|--------------------------------------------------------------------------
| Tests de /loteamientos (Etapa 4b)
|--------------------------------------------------------------------------
|
| Corren contra abas_v2 con el ERP fake (determinístico por seed): la
| página Inertia, el detalle GeoJSON de una fracción (incluido el techo
| de queries SQL que reemplaza el N+1 del sitio viejo) y el flujo de
| compra (lead + snapshot + mail + rate limit). El mailer se fakea.
|
*/

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'

import Lead from '#models/lead'
import LoteColor from '#models/lote_color'
import LotesErpRepository, { type LoteErp } from '#repositories/erp/lotes_erp_repository'
import PurchaseRequestNotification from '#mails/purchase_request_notification'

const NOMBRE_PRUEBA = 'Prueba Funcional 4b'

/** Fracción con lotes en ambos estados (dataset fake determinístico). */
const FRACCION = 120

let loteLibre: LoteErp
let loteVendido: LoteErp

test.group('Loteamientos — página', () => {
  test('responde 200 con la página Inertia y sus props', async ({ client, assert }) => {
    const respuesta = await client.get('/loteamientos').withInertia()
    respuesta.assertStatus(200)
    respuesta.assertInertiaComponent('public/loteamientos')

    const props = respuesta.inertiaProps as {
      fracciones: { codigo: number; centro: { lat: number; lng: number } }[]
      distritos: unknown[]
      colores: { estado: string; color: string }[]
      contadores: { fracciones: number; lotesDisponibles: number }
      filtros: Record<string, string>
    }

    assert.isAbove(props.fracciones.length, 0)
    assert.equal(props.contadores.fracciones, props.fracciones.length)
    assert.isAbove(props.contadores.lotesDisponibles, 0)
    assert.isAbove(props.distritos.length, 0)
    assert.isAbove(props.colores.length, 0)
    // Toda fracción del mapa trae coordenadas
    for (const f of props.fracciones) {
      assert.isNumber(f.centro.lat)
      assert.isNumber(f.centro.lng)
    }
  })

  test('?distrito= se ecoa en filtros sin filtrar server-side', async ({ client, assert }) => {
    /**
     * El filtrado es client-side sobre la lista completa: el server manda
     * SIEMPRE todas las fracciones y el parámetro del deep-link (SearchBox
     * del home) viaja en `filtros` como estado inicial de los chips.
     */
    const respuesta = await client.get('/loteamientos?distrito=2').withInertia()
    respuesta.assertStatus(200)

    const props = respuesta.inertiaProps as {
      fracciones: { distritoCodigo: number }[]
      filtros: { distrito: string }
    }
    assert.equal(props.filtros.distrito, '2')
    assert.isAbove(props.fracciones.length, 0)
    const distritos = new Set(props.fracciones.map((f) => f.distritoCodigo))
    assert.isAbove(distritos.size, 1)
  })

  test('filtros inválidos en la query string no rompen la página', async ({ client }) => {
    const respuesta = await client.get('/loteamientos?rango=99&distrito=abc').withInertia()
    respuesta.assertStatus(200)
    respuesta.assertInertiaComponent('public/loteamientos')
  })
})

test.group('Loteamientos — detalle de fracción', () => {
  test('devuelve el GeoJSON con datos comerciales y colores', async ({ client, assert }) => {
    const respuesta = await client.get(`/loteamientos/fracciones/${FRACCION}/detalle`)
    respuesta.assertStatus(200)

    const cuerpo = respuesta.body() as {
      fraccion: { codigo: number; descripcion: string; centro: unknown }
      manzanas: { codigo: number }[]
      geojson: {
        type: string
        features: {
          type: string
          properties: Record<string, unknown>
          geometry: { type: string; coordinates: [number, number][][] }
        }[]
      }
    }

    assert.equal(cuerpo.fraccion.codigo, FRACCION)
    assert.equal(cuerpo.geojson.type, 'FeatureCollection')
    assert.isAbove(cuerpo.manzanas.length, 0)

    const lotes = cuerpo.geojson.features.filter((f) => f.properties.tipo === 'lote')
    assert.isAbove(lotes.length, 0)

    const colores = await LoteColor.query().select('estado', 'color')
    const colorPorEstado = new Map(colores.map((c) => [c.estado, c.color]))

    for (const lote of lotes.slice(0, 25)) {
      // Properties del contrato para addGeoJson
      for (const clave of [
        'fml',
        'estado',
        'color',
        'superficie',
        'cuotas',
        'importeCuota',
        'precioCredito',
        'centro',
      ]) {
        assert.property(lote.properties, clave)
      }
      // El color sale del catálogo lotes_colores según el estado
      const estado = lote.properties.estado as string | null
      if (estado && colorPorEstado.has(estado)) {
        assert.equal(lote.properties.color, colorPorEstado.get(estado))
      }
      // Anillo GeoJSON cerrado (primer punto == último)
      const anillo = lote.geometry.coordinates[0]
      assert.deepEqual(anillo[0], anillo[anillo.length - 1])
    }
  })

  test('resuelve el detalle con 3 queries SQL o menos (sin N+1)', async ({ client, assert }) => {
    // Primer hit para que el ERP fake genere su dataset (queries propias)
    await client.get(`/loteamientos/fracciones/${FRACCION}/detalle`)

    const knex = db.connection().getWriteClient()
    let cantidad = 0
    const contar = () => cantidad++
    knex.on('query', contar)
    try {
      const respuesta = await client.get(`/loteamientos/fracciones/${FRACCION}/detalle`)
      respuesta.assertStatus(200)
    } finally {
      knex.off('query', contar)
    }

    assert.isAtMost(cantidad, 3)
  })

  test('404 para una fracción inexistente', async ({ client }) => {
    const respuesta = await client.get('/loteamientos/fracciones/99999/detalle')
    respuesta.assertStatus(404)
  })
})

test.group('Loteamientos — comprar', (group) => {
  group.setup(async () => {
    const erp = await app.container.make(LotesErpRepository)
    const lotes = await erp.lotesPorFraccion(FRACCION)
    loteLibre = lotes.find((l) => l.estado === 'LIBRE')!
    loteVendido = lotes.find((l) => l.estado === 'VENDIDO')!
  })

  group.each.teardown(async () => {
    mail.restore()
    await Lead.query().where('nombre', NOMBRE_PRUEBA).delete()
  })

  const datosValidos = () => ({
    nombre: NOMBRE_PRUEBA,
    telefono: '0981123456',
    comentario: 'Solicitud generada por el test funcional.',
    fraccion: loteLibre.fraccionCodigo,
    manzana: loteLibre.manzanaCodigo,
    lote: loteLibre.loteCodigo,
  })

  test('una solicitud válida persiste el lead con snapshot y encola el mail', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()

    const respuesta = await client
      .post('/loteamientos/comprar')
      .withCsrfToken()
      .accept('json')
      .json(datosValidos())

    respuesta.assertStatus(200)

    const lead = await Lead.findByOrFail('nombre', NOMBRE_PRUEBA)
    assert.equal(lead.tipo, 'compra')
    assert.equal(lead.fraccionCodigo, loteLibre.fraccionCodigo)
    assert.equal(lead.manzanaCodigo, loteLibre.manzanaCodigo)
    assert.equal(lead.loteCodigo, loteLibre.loteCodigo)
    assert.isNotNull(lead.mailEnviadoAt)

    // El snapshot se toma del ERP server-side, nunca del payload
    assert.equal(lead.precioSnapshot.estado, 'LIBRE')
    assert.equal(lead.precioSnapshot.importeCuota, loteLibre.importeCuota)
    assert.equal(lead.precioSnapshot.precioCredito, loteLibre.precioCredito)
    assert.equal(lead.precioSnapshot.precioContado, loteLibre.precioContado)
    assert.property(lead.precioSnapshot, 'capturadoAt')

    mails.assertQueued(PurchaseRequestNotification)
  })

  test('un lote no LIBRE devuelve 422 y no crea lead', async ({ client, assert }) => {
    mail.fake()

    const respuesta = await client
      .post('/loteamientos/comprar')
      .withCsrfToken()
      .accept('json')
      .json({
        ...datosValidos(),
        manzana: loteVendido.manzanaCodigo,
        lote: loteVendido.loteCodigo,
      })

    respuesta.assertStatus(422)
    assert.include(JSON.stringify(respuesta.body()), 'ya no está disponible')

    const lead = await Lead.findBy('nombre', NOMBRE_PRUEBA)
    assert.isNull(lead)
  })

  test('datos inválidos devuelven 422 de validación', async ({ client, assert }) => {
    mail.fake()

    const respuesta = await client
      .post('/loteamientos/comprar')
      .withCsrfToken()
      .accept('json')
      .json({ ...datosValidos(), nombre: 'Al', telefono: '1' })

    respuesta.assertStatus(422)

    const lead = await Lead.findBy('nombre', 'Al')
    assert.isNull(lead)
  })

  test('la sexta solicitud del mismo minuto queda bloqueada por rate limit', async ({
    client,
    assert,
  }) => {
    const { mails } = mail.fake()

    // Los tres tests anteriores ya consumieron 3 del cupo de 5 por minuto.
    for (let i = 0; i < 2; i++) {
      await client.post('/loteamientos/comprar').withCsrfToken().accept('json').json(datosValidos())
    }

    const bloqueada = await client
      .post('/loteamientos/comprar')
      .withCsrfToken()
      .accept('json')
      .json(datosValidos())

    bloqueada.assertStatus(429)

    // La solicitud bloqueada no crea lead: siguen siendo los 2 del bucle
    const cantidad = await Lead.query()
      .where('nombre', NOMBRE_PRUEBA)
      .count('* as total')
      .firstOrFail()
    assert.equal(Number(cantidad.$extras.total), 2)

    mails.assertQueuedCount(PurchaseRequestNotification, 2)
  })
})
