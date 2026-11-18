/*
|--------------------------------------------------------------------------
| Tests del motor CRUD del admin (Etapa 5a)
|--------------------------------------------------------------------------
|
| Usa sucursales como recurso piloto: index con paginación/orden/búsqueda,
| store válido e inválido, export CSV con filtros, destroy masivo. Además:
| leads es solo lectura (store → 404) y los campos imagen rechazan uploads
| de otra spec.
|
| Corren contra la base de desarrollo: crean filas propias con un prefijo único y las
| borran al final — nunca truncan tablas.
|
*/

import { randomBytes } from 'node:crypto'
import { test } from '@japa/runner'

import Lead from '#models/lead'
import Carrusel from '#models/carrusel'
import Sucursal from '#models/sucursal'
import Upload from '#models/upload'
import User from '#models/user'

/** Prefijo único de esta corrida (permite borrar exactamente lo creado) */
const PREFIJO = `Test5a-${Date.now()}`

test.group('Admin / motor CRUD (sucursales piloto)', (group) => {
  let usuario: User

  group.setup(async () => {
    usuario = await User.create({
      username: `test.recursos.${Date.now()}`,
      nombre: 'Test Recursos',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })

    await Sucursal.createMany([
      {
        titulo: `${PREFIJO} Alfa`,
        coordenadas: { lat: -25.1, lng: -57.1 },
        telefonos: '+595 21 111 111',
        horarios: 'L a V de 8 a 17',
        estado: 'A',
      },
      {
        titulo: `${PREFIJO} Beta`,
        coordenadas: { lat: -25.2, lng: -57.2 },
        telefonos: '+595 21 222 222',
        horarios: 'L a V de 8 a 17',
        estado: 'A',
      },
      {
        titulo: `${PREFIJO} Gamma`,
        coordenadas: { lat: -25.3, lng: -57.3 },
        telefonos: '+595 21 333 333',
        horarios: 'L a V de 8 a 17',
        estado: 'E',
      },
    ])

    return async () => {
      await Sucursal.query().where('titulo', 'like', `${PREFIJO}%`).delete()
      await usuario.delete()
    }
  })

  test('index requiere sesión (redirige al login)', async ({ client }) => {
    const respuesta = await client.get('/app/sucursales').redirects(0)
    respuesta.assertStatus(302)
    respuesta.assertHeader('location', '/auth/login')
  })

  test('index pagina, busca y ordena server-side', async ({ client, assert }) => {
    const respuesta = await client
      .get(`/app/sucursales?q=${PREFIJO}&sort=titulo&order=desc&perPage=25`)
      .loginAs(usuario)
      .withInertia()

    respuesta.assertStatus(200)
    respuesta.assertInertiaComponent('admin/recursos/sucursales')

    const registros = respuesta.inertiaProps.registros as {
      data: { titulo: string; activo: boolean }[]
      meta: { total: number; pagina: number; porPagina: number; ultimaPagina: number }
    }

    assert.equal(registros.meta.total, 3)
    assert.equal(registros.meta.pagina, 1)
    assert.lengthOf(registros.data, 3)
    // Orden desc por título: Gamma, Beta, Alfa
    assert.equal(registros.data[0].titulo, `${PREFIJO} Gamma`)
    assert.equal(registros.data[2].titulo, `${PREFIJO} Alfa`)
    // El DTO expone el toggle como boolean
    assert.isFalse(registros.data[0].activo)
  })

  test('index con búsqueda más fina y paginación', async ({ client, assert }) => {
    const respuesta = await client
      .get(`/app/sucursales?q=${PREFIJO} Beta`)
      .loginAs(usuario)
      .withInertia()

    const registros = respuesta.inertiaProps.registros as {
      data: { titulo: string }[]
      meta: { total: number }
    }
    assert.equal(registros.meta.total, 1)
    assert.equal(registros.data[0].titulo, `${PREFIJO} Beta`)
  })

  test('store válido crea la sucursal y redirige con flash', async ({ client, assert }) => {
    const respuesta = await client
      .post('/app/sucursales')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        titulo: `${PREFIJO} Nueva`,
        lat: -25.44,
        lng: -57.55,
        horarios: 'L a S de 8 a 12',
        telefonos: '+595 21 999 999',
        activo: true,
      })

    respuesta.assertStatus(302)

    const creada = await Sucursal.findBy('titulo', `${PREFIJO} Nueva`)
    assert.isNotNull(creada)
    assert.equal(creada!.estado, 'A')
    assert.deepInclude(creada!.coordenadas, { lat: -25.44, lng: -57.55 })
  })

  test('store inválido no crea nada (validación VineJS)', async ({ client, assert }) => {
    const antes = await Sucursal.query().where('titulo', 'like', `${PREFIJO}%`).count('* as total')

    const respuesta = await client
      .post('/app/sucursales')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        // titulo ausente y lat fuera de rango
        lat: -300,
        lng: -57.55,
        activo: true,
      })

    respuesta.assertStatus(302) // redirect back con errores flasheados

    const despues = await Sucursal.query()
      .where('titulo', 'like', `${PREFIJO}%`)
      .count('* as total')
    assert.equal(despues[0].$extras.total, antes[0].$extras.total)
  })

  test('update modifica y refleja el toggle de estado', async ({ client, assert }) => {
    const fila = await Sucursal.findByOrFail('titulo', `${PREFIJO} Alfa`)

    const respuesta = await client
      .put(`/app/sucursales/${fila.id}`)
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        titulo: `${PREFIJO} Alfa editada`,
        lat: -25.9,
        lng: -57.9,
        horarios: null,
        telefonos: null,
        activo: false,
      })

    respuesta.assertStatus(302)

    await fila.refresh()
    assert.equal(fila.titulo, `${PREFIJO} Alfa editada`)
    assert.equal(fila.estado, 'E')

    // La vuelve a dejar como estaba para el resto de los tests
    fila.merge({ titulo: `${PREFIJO} Alfa`, estado: 'A' })
    await fila.save()
  })

  test('export CSV respeta los filtros y nombra el archivo con fecha', async ({
    client,
    assert,
  }) => {
    const respuesta = await client.get(`/app/sucursales/export?q=${PREFIJO} Beta`).loginAs(usuario)

    respuesta.assertStatus(200)
    assert.include(respuesta.header('content-type') ?? '', 'text/csv')
    assert.match(
      respuesta.header('content-disposition') ?? '',
      /attachment; filename="sucursales_\d{4}-\d{2}-\d{2}\.csv"/
    )

    const cuerpo = respuesta.text()
    assert.include(cuerpo, 'Título') // encabezados
    assert.include(cuerpo, `${PREFIJO} Beta`)
    assert.notInclude(cuerpo, `${PREFIJO} Gamma`) // filtrada fuera
  })

  test('destroy masivo elimina exactamente los ids enviados', async ({ client, assert }) => {
    const masivas = await Sucursal.createMany([
      { titulo: `${PREFIJO} Masiva 1`, coordenadas: { lat: -25, lng: -57 }, estado: 'E' },
      { titulo: `${PREFIJO} Masiva 2`, coordenadas: { lat: -25, lng: -57 }, estado: 'E' },
    ])

    const respuesta = await client
      .post('/app/sucursales/destroy-masivo')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({ ids: masivas.map((s) => s.id) })

    respuesta.assertStatus(302)

    const quedan = await Sucursal.query().where('titulo', 'like', `${PREFIJO} Masiva%`)
    assert.lengthOf(quedan, 0)
    // Las demás filas del test siguen intactas
    assert.isNotNull(await Sucursal.findBy('titulo', `${PREFIJO} Beta`))
  })

  test('destroy masivo sin ids responde con error de validación', async ({ client }) => {
    const respuesta = await client
      .post('/app/sucursales/destroy-masivo')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({ ids: [] })

    respuesta.assertStatus(302) // redirect back con el error flasheado
  })
})

test.group('Admin / leads es solo lectura', (group) => {
  let usuario: User
  let lead: Lead

  group.setup(async () => {
    usuario = await User.create({
      username: `test.leads.${Date.now()}`,
      nombre: 'Test Leads',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })

    lead = await Lead.create({
      tipo: 'contacto',
      nombre: `${PREFIJO} Lead`,
      telefono: '+595 981 000 000',
      email: 'lead@test.local',
      asunto: 'Consulta de test',
    })

    return async () => {
      await Lead.query().where('nombre', 'like', `${PREFIJO}%`).delete()
      await usuario.delete()
    }
  })

  test('POST /app/leads no existe (404): no se crean leads desde el admin', async ({ client }) => {
    const respuesta = await client
      .post('/app/leads')
      .loginAs(usuario)
      .withCsrfToken()
      .json({ nombre: 'x', telefono: 'y', tipo: 'contacto' })

    respuesta.assertStatus(404)
  })

  test('PUT /app/leads/:id tampoco existe (404)', async ({ client }) => {
    const respuesta = await client
      .put(`/app/leads/${lead.id}`)
      .loginAs(usuario)
      .withCsrfToken()
      .json({ nombre: 'x' })

    respuesta.assertStatus(404)
  })

  test('el index filtra por tipo y expone las opciones del filtro', async ({ client, assert }) => {
    const conFiltro = await client
      .get(`/app/leads?tipo=contacto&q=${PREFIJO}`)
      .loginAs(usuario)
      .withInertia()

    const registros = conFiltro.inertiaProps.registros as {
      data: { nombre: string }[]
      meta: { total: number }
    }
    assert.equal(registros.meta.total, 1)
    assert.equal(registros.data[0].nombre, `${PREFIJO} Lead`)

    const sinMatch = await client
      .get(`/app/leads?tipo=compra&q=${PREFIJO}`)
      .loginAs(usuario)
      .withInertia()
    assert.equal((sinMatch.inertiaProps.registros as { meta: { total: number } }).meta.total, 0)

    assert.isArray(conFiltro.inertiaProps.tiposLead)
  })

  test('export CSV de leads respeta el filtro por tipo', async ({ client, assert }) => {
    const respuesta = await client
      .get(`/app/leads/export?tipo=compra&q=${PREFIJO}`)
      .loginAs(usuario)

    respuesta.assertStatus(200)
    assert.notInclude(respuesta.text(), `${PREFIJO} Lead`) // es tipo contacto
  })
})

test.group('Admin / campos imagen del motor', (group) => {
  let usuario: User
  let uploadIcono: Upload

  group.setup(async () => {
    usuario = await User.create({
      username: `test.imagenes.${Date.now()}`,
      nombre: 'Test Imagenes',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })

    // Upload validado con spec iconoRed (sin archivo físico: no hace falta acá)
    uploadIcono = await Upload.create({
      link: randomBytes(50).toString('hex'),
      mime: 'image/png',
      spec: 'iconoRed',
    })

    return async () => {
      await Carrusel.query().where('titulo', 'like', `${PREFIJO}%`).delete()
      await Upload.query().where('id', uploadIcono.id).delete()
      await usuario.delete()
    }
  })

  test('rechaza un upload cuya spec no coincide con la del campo', async ({ client, assert }) => {
    const respuesta = await client
      .post('/app/carruseles')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        titulo: `${PREFIJO} Carrusel spec mala`,
        subtitulo: null,
        descripcion: null,
        fraccionCodigo: null,
        activo: true,
        // Upload real pero de spec iconoRed: el campo exige spec carrusel
        imagenUploadId: uploadIcono.id,
      })

    respuesta.assertStatus(302)
    assert.isNull(await Carrusel.findBy('titulo', `${PREFIJO} Carrusel spec mala`))
  })

  test('rechaza un id de upload inexistente', async ({ client, assert }) => {
    const respuesta = await client
      .post('/app/carruseles')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        titulo: `${PREFIJO} Carrusel sin upload`,
        activo: true,
        imagenUploadId: 99999999,
      })

    respuesta.assertStatus(302)
    assert.isNull(await Carrusel.findBy('titulo', `${PREFIJO} Carrusel sin upload`))
  })
})
