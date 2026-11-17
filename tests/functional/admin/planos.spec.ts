/*
|--------------------------------------------------------------------------
| Tests de planos (Etapa 5b)
|--------------------------------------------------------------------------
|
| Importación de un plano sintético (3 .geojson con el formato real del
| sitio viejo: centroid WKT + MZ/LT), rechazo de estructura inválida y de
| código duplicado, y eliminación en cascada (fracción → manzanas → lotes).
|
| Usa un código de fracción alto (990+) que no existe en los datos del ETL.
|
*/

import { test } from '@japa/runner'

import Fraccion from '#models/fraccion'
import Lote from '#models/lote'
import Manzana from '#models/manzana'
import User from '#models/user'

/** Anillo cuadrado chico alrededor de un punto (cerrado) */
function anillo(lat: number, lng: number, delta = 0.0005): [number, number][] {
  return [
    [lng - delta, lat - delta],
    [lng + delta, lat - delta],
    [lng + delta, lat + delta],
    [lng - delta, lat + delta],
    [lng - delta, lat - delta],
  ]
}

function feature(lat: number, lng: number, properties: Record<string, unknown>) {
  return {
    type: 'Feature',
    properties: { centroid: `POINT(${lng} ${lat})`, ...properties },
    geometry: { type: 'Polygon', coordinates: [anillo(lat, lng)] },
  }
}

function coleccion(features: unknown[]) {
  return JSON.stringify({ type: 'FeatureCollection', features })
}

/** GeoJSON sintético válido: 1 fracción, 2 manzanas, 3 lotes */
function planoSintetico() {
  const base = { lat: -25.31, lng: -57.43 }
  return {
    fraccion: coleccion([feature(base.lat, base.lng, {})]),
    manzanas: coleccion([
      feature(base.lat, base.lng, { MZ: 1 }),
      feature(base.lat + 0.002, base.lng, { MZ: 2 }),
    ]),
    lotes: coleccion([
      feature(base.lat, base.lng, { MZ: 1, LT: 1 }),
      feature(base.lat, base.lng + 0.001, { MZ: 1, LT: 2 }),
      feature(base.lat + 0.002, base.lng, { MZ: 2, LT: 1 }),
    ]),
  }
}

test.group('Admin / planos (importación GeoJSON)', (group) => {
  let usuario: User
  const CODIGO = 990
  const CODIGO_INVALIDO = 991
  const CODIGO_CASCADA = 992

  group.setup(async () => {
    usuario = await User.create({
      username: `test.planos.${Date.now()}`,
      nombre: 'Test Planos',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })

    return async () => {
      await Fraccion.query().whereIn('codigo', [CODIGO, CODIGO_INVALIDO, CODIGO_CASCADA]).delete()
      await usuario.delete()
    }
  })

  test('importa un plano válido (fracción + manzanas + lotes en transacción)', async ({
    client,
    assert,
  }) => {
    const plano = planoSintetico()

    const respuesta = await client
      .post('/app/planos')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .field('descripcion', 'Fracción sintética de test')
      .field('codigo', String(CODIGO))
      .file('archivoFraccion', Buffer.from(plano.fraccion), { filename: 'fraccion.geojson' })
      .file('archivoManzanas', Buffer.from(plano.manzanas), { filename: 'manzanas.geojson' })
      .file('archivoLotes', Buffer.from(plano.lotes), { filename: 'lotes.geojson' })

    respuesta.assertStatus(302)

    const fraccion = await Fraccion.findByOrFail('codigo', CODIGO)
    assert.equal(fraccion.descripcion, 'Fracción sintética de test')
    assert.equal(fraccion.estado, 'A')
    // centro con el formato jsonb del ETL: {lat, lng} numéricos
    assert.approximately(Number(fraccion.coordeCentro?.lat), -25.31, 0.001)
    assert.approximately(Number(fraccion.coordeCentro?.lng), -57.43, 0.001)
    // lados: anillos [[{lat,lng}, …]]
    assert.isArray(fraccion.coordeLados)
    assert.isArray(fraccion.coordeLados[0])
    assert.property(fraccion.coordeLados[0][0], 'lat')

    const manzanas = await Manzana.query().where('fraccion_id', fraccion.id)
    assert.lengthOf(manzanas, 2)

    const lotes = await Lote.query().where('fraccion_codigo', CODIGO)
    assert.lengthOf(lotes, 3)
    // FK resuelta: el lote 2-1 apunta a la manzana con código 2
    const manzanaDos = manzanas.find((m) => m.codigo === 2)!
    const loteManzanaDos = lotes.find((l) => l.manzanaCodigo === 2)!
    assert.equal(loteManzanaDos.manzanaId, manzanaDos.id)
  })

  test('el detalle público sirve la fracción importada', async ({ client, assert }) => {
    const respuesta = await client.get(`/loteamientos/fracciones/${CODIGO}/detalle`)
    respuesta.assertStatus(200)

    const cuerpo = respuesta.body() as {
      fraccion: { codigo: number }
      geojson: { features: { properties: { tipo: string } }[] }
    }
    assert.equal(cuerpo.fraccion.codigo, CODIGO)
    const lotes = cuerpo.geojson.features.filter((f) => f.properties.tipo === 'lote')
    assert.lengthOf(lotes, 3)
  })

  test('rechaza código duplicado sin tocar la base', async ({ client, assert }) => {
    const plano = planoSintetico()

    const respuesta = await client
      .post('/app/planos')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .field('descripcion', 'Duplicada')
      .field('codigo', String(CODIGO))
      .file('archivoFraccion', Buffer.from(plano.fraccion), { filename: 'fraccion.geojson' })
      .file('archivoManzanas', Buffer.from(plano.manzanas), { filename: 'manzanas.geojson' })
      .file('archivoLotes', Buffer.from(plano.lotes), { filename: 'lotes.geojson' })

    respuesta.assertStatus(302) // redirect back con el error flasheado

    const filas = await Fraccion.query().where('codigo', CODIGO)
    assert.lengthOf(filas, 1)
    assert.equal(filas[0].descripcion, 'Fracción sintética de test')
  })

  test('rechaza estructura inválida (lote sin MZ) y no importa nada', async ({
    client,
    assert,
  }) => {
    const plano = planoSintetico()
    const lotesRotos = coleccion([feature(-25.31, -57.43, { LT: 1 })]) // sin MZ

    const respuesta = await client
      .post('/app/planos')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .field('descripcion', 'Rota')
      .field('codigo', String(CODIGO_INVALIDO))
      .file('archivoFraccion', Buffer.from(plano.fraccion), { filename: 'fraccion.geojson' })
      .file('archivoManzanas', Buffer.from(plano.manzanas), { filename: 'manzanas.geojson' })
      .file('archivoLotes', Buffer.from(lotesRotos), { filename: 'lotes.geojson' })

    respuesta.assertStatus(302)
    assert.isNull(await Fraccion.findBy('codigo', CODIGO_INVALIDO))
  })

  test('rechaza un archivo que no es JSON', async ({ client, assert }) => {
    const plano = planoSintetico()

    const respuesta = await client
      .post('/app/planos')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .field('descripcion', 'Rota')
      .field('codigo', String(CODIGO_INVALIDO))
      .file('archivoFraccion', Buffer.from('esto no es json'), { filename: 'fraccion.geojson' })
      .file('archivoManzanas', Buffer.from(plano.manzanas), { filename: 'manzanas.geojson' })
      .file('archivoLotes', Buffer.from(plano.lotes), { filename: 'lotes.geojson' })

    respuesta.assertStatus(302)
    assert.isNull(await Fraccion.findBy('codigo', CODIGO_INVALIDO))
  })

  test('update solo toca descripción/estado', async ({ client, assert }) => {
    const fraccion = await Fraccion.findByOrFail('codigo', CODIGO)

    const respuesta = await client
      .put(`/app/planos/${fraccion.id}`)
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({ descripcion: 'Sintética renombrada', activo: false })

    respuesta.assertStatus(302)
    await fraccion.refresh()
    assert.equal(fraccion.descripcion, 'Sintética renombrada')
    assert.equal(fraccion.estado, 'E')

    // Las geometrías quedaron intactas
    const lotes = await Lote.query().where('fraccion_codigo', CODIGO)
    assert.lengthOf(lotes, 3)
  })

  test('destroy elimina en cascada manzanas y lotes', async ({ client, assert }) => {
    // Importa una fracción propia para este test
    const plano = planoSintetico()
    await client
      .post('/app/planos')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .field('descripcion', 'Para cascada')
      .field('codigo', String(CODIGO_CASCADA))
      .file('archivoFraccion', Buffer.from(plano.fraccion), { filename: 'fraccion.geojson' })
      .file('archivoManzanas', Buffer.from(plano.manzanas), { filename: 'manzanas.geojson' })
      .file('archivoLotes', Buffer.from(plano.lotes), { filename: 'lotes.geojson' })

    const fraccion = await Fraccion.findByOrFail('codigo', CODIGO_CASCADA)
    const manzanas = await Manzana.query().where('fraccion_id', fraccion.id)
    const manzanaIds = manzanas.map((m) => m.id)
    assert.isNotEmpty(manzanaIds)

    const respuesta = await client
      .delete(`/app/planos/${fraccion.id}`)
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)

    respuesta.assertStatus(302)
    assert.isNull(await Fraccion.findBy('codigo', CODIGO_CASCADA))
    assert.lengthOf(await Manzana.query().whereIn('id', manzanaIds), 0)
    assert.lengthOf(await Lote.query().where('fraccion_codigo', CODIGO_CASCADA), 0)
  })
})
