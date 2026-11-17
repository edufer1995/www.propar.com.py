/*
|--------------------------------------------------------------------------
| Tests de las rutas de archivos (/api/file/public y /api/uploads)
|--------------------------------------------------------------------------
|
| Corren contra abas_v2: crean sus propias filas (upload de prueba, user
| de prueba) y las eliminan al final — nunca truncan tablas.
|
*/

import { randomBytes } from 'node:crypto'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import sharp from 'sharp'

import Upload from '#models/upload'
import User from '#models/user'
import UploadService from '#services/upload_service'

const FIXTURES = app.makePath('tmp/tests/fixtures-api')

test.group('GET /api/file/public/:link', (group) => {
  let sinArchivo: Upload

  group.setup(async () => {
    // Fila válida SIN archivo físico (mismo caso que los 186 uploads migrados)
    sinArchivo = await Upload.create({ link: randomBytes(50).toString('hex') })
    return async () => {
      await sinArchivo.delete()
    }
  })

  test('link válido sin archivo físico responde el placeholder con 200', async ({
    client,
    assert,
  }) => {
    const respuesta = await client.get(`/api/file/public/${sinArchivo.link}`)

    respuesta.assertStatus(200)
    respuesta.assertHeader('content-type', 'image/svg+xml')
    assert.include(respuesta.header('cache-control') ?? '', 'max-age=300')
  })

  test('link malformado responde 404 (matcher de la ruta)', async ({ client }) => {
    const respuesta = await client.get('/api/file/public/abc123')
    respuesta.assertStatus(404)
  })

  test('link bien formado pero inexistente responde 404', async ({ client }) => {
    const inexistente = 'f'.repeat(100)
    const respuesta = await client.get(`/api/file/public/${inexistente}`)
    respuesta.assertStatus(404)
  })
})

test.group('POST /api/uploads', (group) => {
  const service = new UploadService()
  let usuario: User
  let rutaIcono: string
  const subidos: number[] = []

  group.setup(async () => {
    await mkdir(FIXTURES, { recursive: true })

    // Icono cuadrado válido para la spec iconoRed
    rutaIcono = join(FIXTURES, 'icono.png')
    await sharp({
      create: { width: 128, height: 128, channels: 3, background: { r: 153, g: 205, b: 104 } },
    })
      .png()
      .toFile(rutaIcono)

    // Usuario propio del test (se borra al final)
    usuario = await User.create({
      username: `test.uploads.${Date.now()}`,
      nombre: 'Test Uploads',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })

    return async () => {
      for (const id of subidos) {
        await service.eliminar(id)
      }
      await usuario.delete()
      await rm(app.makePath('tmp/tests'), { recursive: true, force: true })
    }
  })

  test('sin sesión responde 401', async ({ client }) => {
    const respuesta = await client
      .post('/api/uploads')
      .withCsrfToken()
      .file('file', rutaIcono)
      .field('spec', 'iconoRed')

    respuesta.assertStatus(401)
  })

  test('con sesión sube la imagen y devuelve id, link y url', async ({ client, assert }) => {
    const respuesta = await client
      .post('/api/uploads')
      .loginAs(usuario)
      .withCsrfToken()
      .file('file', rutaIcono)
      .field('spec', 'iconoRed')

    respuesta.assertStatus(201)
    const cuerpo = respuesta.body()
    assert.isNumber(cuerpo.id)
    assert.match(cuerpo.link, /^[0-9a-f]{100}$/)
    assert.equal(cuerpo.url, `/api/file/public/${cuerpo.link}`)
    subidos.push(cuerpo.id)

    // El link recién creado sirve el archivo real (no el placeholder)
    const descarga = await client.get(cuerpo.url)
    descarga.assertStatus(200)
    descarga.assertHeader('content-type', 'image/png')
    assert.include(descarga.header('cache-control') ?? '', 'immutable')
  })

  test('con sesión pero spec desconocida responde 422', async ({ client }) => {
    const respuesta = await client
      .post('/api/uploads')
      .loginAs(usuario)
      .withCsrfToken()
      .file('file', rutaIcono)
      .field('spec', 'noExiste')

    respuesta.assertStatus(422)
  })

  test('con sesión pero imagen inválida responde 422 con mensaje en español', async ({
    client,
    assert,
  }) => {
    // 64×64: no llega al mínimo 128×128 de iconoRed
    const rutaChica = join(FIXTURES, 'icono-chico.png')
    await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toFile(rutaChica)

    const respuesta = await client
      .post('/api/uploads')
      .loginAs(usuario)
      .withCsrfToken()
      .accept('json')
      .file('file', rutaChica)
      .field('spec', 'iconoRed')

    respuesta.assertStatus(422)
    assert.include(JSON.stringify(respuesta.body()), 'mínimo')
  })
})
