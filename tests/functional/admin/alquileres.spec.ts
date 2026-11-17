/*
|--------------------------------------------------------------------------
| Tests de alquileres admin (Etapa 5b)
|--------------------------------------------------------------------------
|
| Galería imagenes[] (orden, validación de spec, borrado de huérfanas al
| quitar y al eliminar la fila), coordenadas {lat,lng} nullable y efecto
| en el mapa público /loteamientos (los alquileres viven ahí).
|
*/

import { randomBytes } from 'node:crypto'
import { test } from '@japa/runner'

import Alquiler from '#models/alquiler'
import Upload from '#models/upload'
import User from '#models/user'

const PREFIJO = `Test5b-alq-${Date.now()}`

function crearUpload(spec: string) {
  return Upload.create({
    link: randomBytes(50).toString('hex'),
    mime: 'image/png',
    spec,
  })
}

test.group('Admin / alquileres (galería + mapa)', (group) => {
  let usuario: User

  group.setup(async () => {
    usuario = await User.create({
      username: `test.alquileres.${Date.now()}`,
      nombre: 'Test Alquileres',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })

    return async () => {
      await Alquiler.query().where('direccion', 'like', `${PREFIJO}%`).delete()
      await usuario.delete()
    }
  })

  test('store con imagenes[] ordenadas y coordenadas', async ({ client, assert }) => {
    const [foto1, foto2] = await Promise.all([
      crearUpload('fotoAlquiler'),
      crearUpload('fotoAlquiler'),
    ])

    const respuesta = await client
      .post('/app/alquileres')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        direccion: `${PREFIJO} Av. España 1234`,
        ubicacion: 'Asunción',
        contacto: '+595 981 111 222',
        precioMensual: 2500000,
        precioGarantia: 2500000,
        habitaciones: 2,
        banos: 1,
        cocinas: 1,
        observaciones: null,
        expensas: true,
        balcon: false,
        activo: true,
        lat: -25.28,
        lng: -57.63,
        imagenesUploadIds: [foto2.id, foto1.id], // orden elegido por el admin
      })

    respuesta.assertStatus(302)

    const creado = await Alquiler.findByOrFail('direccion', `${PREFIJO} Av. España 1234`)
    assert.deepEqual(creado.imagenes, [foto2.id, foto1.id]) // respeta el orden
    assert.deepInclude(creado.coordenadas, { lat: -25.28, lng: -57.63 })
    assert.equal(creado.estado, 'A')
  })

  test('rechaza uploads de otra spec en la galería', async ({ client, assert }) => {
    const icono = await crearUpload('iconoRed')

    const respuesta = await client
      .post('/app/alquileres')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        direccion: `${PREFIJO} Spec mala`,
        ubicacion: null,
        contacto: null,
        precioMensual: null,
        precioGarantia: null,
        habitaciones: null,
        banos: null,
        cocinas: null,
        observaciones: null,
        expensas: false,
        balcon: false,
        activo: true,
        lat: null,
        lng: null,
        imagenesUploadIds: [icono.id],
      })

    respuesta.assertStatus(302)
    assert.isNull(await Alquiler.findBy('direccion', `${PREFIJO} Spec mala`))

    await icono.delete()
  })

  test('update que quita una foto borra el upload huérfano', async ({ client, assert }) => {
    const fila = await Alquiler.findByOrFail('direccion', `${PREFIJO} Av. España 1234`)
    const [quedaId, saleId] = fila.imagenes as number[]

    const respuesta = await client
      .put(`/app/alquileres/${fila.id}`)
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        direccion: `${PREFIJO} Av. España 1234`,
        ubicacion: 'Asunción',
        contacto: null,
        precioMensual: 2500000,
        precioGarantia: null,
        habitaciones: 2,
        banos: 1,
        cocinas: 1,
        observaciones: null,
        expensas: true,
        balcon: false,
        activo: true,
        lat: null,
        lng: null,
        imagenesUploadIds: [quedaId],
      })

    respuesta.assertStatus(302)
    await fila.refresh()
    assert.deepEqual(fila.imagenes, [quedaId])
    assert.isNull(fila.coordenadas) // quitar ubicación persiste null
    assert.isNull(await Upload.find(saleId)) // la huérfana se borró
    assert.isNotNull(await Upload.find(quedaId))
  })

  test('el mapa expone la galería del alquiler activo con ubicación', async ({
    client,
    assert,
  }) => {
    /* Sin coordenadas no se puede dibujar: se cargan como haría el ABM. */
    const fila = await Alquiler.findByOrFail('direccion', `${PREFIJO} Av. España 1234`)
    await Alquiler.query()
      .where('id', fila.id)
      .update({ coordenadas: JSON.stringify({ lat: -25.3, lng: -57.6 }) })

    const respuesta = await client.get('/loteamientos').withInertia()
    respuesta.assertStatus(200)

    const alquileres = respuesta.inertiaProps.alquileres as {
      direccion: string
      centro: { lat: number; lng: number }
      imagenes: string[]
    }[]
    const nuestro = alquileres.find((a) => a.direccion === `${PREFIJO} Av. España 1234`)
    assert.isDefined(nuestro)
    assert.equal(nuestro!.centro.lat, -25.3)
    assert.lengthOf(nuestro!.imagenes, 1)
    assert.match(nuestro!.imagenes[0], /^\/api\/file\/public\//)
  })

  test('destroy borra la fila y sus uploads', async ({ client, assert }) => {
    const fila = await Alquiler.findByOrFail('direccion', `${PREFIJO} Av. España 1234`)
    const ids = fila.imagenes as number[]

    const respuesta = await client
      .delete(`/app/alquileres/${fila.id}`)
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)

    respuesta.assertStatus(302)
    assert.isNull(await Alquiler.find(fila.id))
    for (const id of ids) {
      assert.isNull(await Upload.find(id))
    }
  })
})
