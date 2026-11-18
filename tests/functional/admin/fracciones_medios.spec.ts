/*
|--------------------------------------------------------------------------
| Tests de medios de fracciones (Etapa medios)
|--------------------------------------------------------------------------
|
| Cubre el camino completo: validación de video MP4 en UploadService,
| edición de galerías desde el admin de fracciones (solo medios, sin
| crear/eliminar), y la salida pública (portada en la lista + medios en
| el detalle + range requests del archivo).
|
*/

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import sharp from 'sharp'

import User from '#models/user'
import Upload from '#models/upload'
import Fraccion from '#models/fraccion'
import UploadService, { ErrorDeImagen } from '#services/upload_service'

const FIXTURES = app.makePath('tmp/tests/fixtures')

/** MP4 mínimo válido para la validación por magic bytes (caja ftyp). */
function bytesMp4(): Buffer {
  return Buffer.concat([
    Buffer.from([0, 0, 0, 32]),
    Buffer.from('ftypisom'),
    Buffer.from([0, 0, 2, 0]),
    Buffer.from('isomiso2avc1mp41'),
    Buffer.alloc(2048),
  ])
}

test.group('Fracciones — medios (admin + público)', (group) => {
  const service = new UploadService()
  let usuario: User
  let fraccion: Fraccion
  let mediosOriginales: { imagenes: unknown; videos: unknown }
  const uploadsCreados: number[] = []

  group.setup(async () => {
    await mkdir(FIXTURES, { recursive: true })
    usuario = await User.create({
      username: `test.fracciones.${Date.now()}`,
      nombre: 'Test Fracciones',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })
    /**
     * SIEMPRE una fracción SIN medios: el update del motor borra los
     * uploads que salen de la galería, así que usar una fila con medios
     * reales los destruiría (pasó con la fracción 41 en desarrollo).
     */
    fraccion = await Fraccion.query()
      .whereRaw(`imagenes = '[]'::jsonb`)
      .whereRaw(`videos = '[]'::jsonb`)
      .orderBy('codigo', 'asc')
      .firstOrFail()
    mediosOriginales = { imagenes: fraccion.imagenes, videos: fraccion.videos }

    return async () => {
      await Fraccion.query()
        .where('id', fraccion.id)
        .update({
          imagenes: JSON.stringify(mediosOriginales.imagenes ?? []),
          videos: JSON.stringify(mediosOriginales.videos ?? []),
        })
      for (const id of uploadsCreados) await service.eliminar(id)
      await usuario.delete()
    }
  })

  test('guardarVideo acepta un MP4 válido y sirve con range requests', async ({
    assert,
    client,
  }) => {
    const ruta = join(FIXTURES, 'video-ok.mp4')
    await writeFile(ruta, bytesMp4())

    const upload = await service.guardarVideo(
      { rutaTemporal: ruta, nombreOriginal: 'video-ok.mp4' },
      'videoFraccion'
    )
    uploadsCreados.push(upload.id)

    assert.equal(upload.mime, 'video/mp4')
    assert.equal(upload.spec, 'videoFraccion')

    /* El archivo se sirve entero y por rangos (seek del reproductor). */
    const entera = await client.get(`/api/file/public/${upload.link}`)
    entera.assertStatus(200)
    assert.equal(entera.header('accept-ranges'), 'bytes')

    const parcial = await client.get(`/api/file/public/${upload.link}`).header('Range', 'bytes=4-7')
    parcial.assertStatus(206)
    assert.equal(parcial.header('content-length'), '4')
    assert.match(String(parcial.header('content-range')), /^bytes 4-7\/\d+$/)
  })

  test('guardarVideo rechaza un archivo que no es MP4', async ({ assert }) => {
    const ruta = join(FIXTURES, 'video-falso.mp4')
    await writeFile(ruta, Buffer.from('no soy un mp4 de verdad, solo texto'))

    try {
      await service.guardarVideo(
        { rutaTemporal: ruta, nombreOriginal: 'video-falso.mp4' },
        'videoFraccion'
      )
      assert.fail('Se esperaba un ErrorDeImagen')
    } catch (error) {
      assert.instanceOf(error, ErrorDeImagen)
    }
  })

  test('el update del admin asocia galerías y el público las expone', async ({
    assert,
    client,
  }) => {
    /* Foto de la galería (spec fotoFraccion) + video, como sube el admin. */
    const rutaFoto = join(FIXTURES, 'foto-fraccion.png')
    await sharp({
      create: { width: 1280, height: 720, channels: 3, background: { r: 66, g: 113, b: 174 } },
    })
      .png()
      .toFile(rutaFoto)
    const foto = await service.guardar(
      { rutaTemporal: rutaFoto, nombreOriginal: 'foto.png' },
      'fotoFraccion'
    )
    uploadsCreados.push(foto.id)

    const rutaVideo = join(FIXTURES, 'video-galeria.mp4')
    await writeFile(rutaVideo, bytesMp4())
    const video = await service.guardarVideo(
      { rutaTemporal: rutaVideo, nombreOriginal: 'video.mp4' },
      'videoFraccion'
    )
    uploadsCreados.push(video.id)

    const respuesta = await client
      .put(`/app/fracciones/${fraccion.id}`)
      .loginAs(usuario)
      .withCsrfToken()
      .withInertia()
      .json({ imagenesUploadIds: [foto.id], videosUploadIds: [video.id] })
    respuesta.assertStatus(200)

    /* Lista pública: portada + total de medios en la card. */
    const pagina = await client.get('/loteamientos').withInertia()
    const props = pagina.inertiaProps as {
      fracciones: { codigo: number; portadaUrl: string | null; totalMedios: number }[]
    }
    const enMapa = props.fracciones.find((f) => f.codigo === fraccion.codigo)
    assert.exists(enMapa)
    assert.equal(enMapa!.totalMedios, 2)
    assert.equal(enMapa!.portadaUrl, `/api/file/public/${foto.link}`)

    /* Detalle público: URLs de la galería para el lightbox. */
    const detalle = await client.get(`/loteamientos/fracciones/${fraccion.codigo}/detalle`)
    detalle.assertStatus(200)
    const cuerpo = detalle.body() as {
      fraccion: { medios: { fotos: string[]; videos: string[] } }
    }
    assert.deepEqual(cuerpo.fraccion.medios.fotos, [`/api/file/public/${foto.link}`])
    assert.deepEqual(cuerpo.fraccion.medios.videos, [`/api/file/public/${video.link}`])
  })

  test('una galería con spec equivocada se rechaza con 422', async ({ client }) => {
    /* Un upload de otra spec (fotoInstitucional) no puede colarse como foto de fracción. */
    const rutaFoto = join(FIXTURES, 'foto-ajena.png')
    await sharp({
      create: { width: 1280, height: 800, channels: 3, background: { r: 20, g: 60, b: 20 } },
    })
      .png()
      .toFile(rutaFoto)
    const ajena = await new UploadService().guardar(
      { rutaTemporal: rutaFoto, nombreOriginal: 'ajena.png' },
      'fotoInstitucional'
    )
    uploadsCreados.push(ajena.id)

    const respuesta = await client
      .put(`/app/fracciones/${fraccion.id}`)
      .loginAs(usuario)
      .withCsrfToken()
      .accept('json')
      .json({ imagenesUploadIds: [ajena.id] })
    respuesta.assertStatus(422)
  })

  test('no existen rutas para crear ni eliminar fracciones', async ({ client }) => {
    const alta = await client.post('/app/fracciones').loginAs(usuario).withCsrfToken().json({})
    alta.assertStatus(404)

    const baja = await client
      .delete(`/app/fracciones/${fraccion.id}`)
      .loginAs(usuario)
      .withCsrfToken()
    baja.assertStatus(404)
  })
})

test.group('Fracciones — preservación de medios en el ETL', () => {
  test('los uploads de medios sobreviven con su id (archivo físico <id>.ext)', async ({
    assert,
  }) => {
    /*
     * Smoke de la invariante que sostiene la preservación: el nombre del
     * archivo físico deriva del id del upload, así que restaurar la fila
     * con el MISMO id mantiene el archivo servible.
     */
    const service = new UploadService()
    const upload = new Upload()
    upload.id = 987654
    upload.mime = 'video/mp4'
    assert.match(String(service.rutaFisica(upload)), /987654\.mp4$/)
  })
})
