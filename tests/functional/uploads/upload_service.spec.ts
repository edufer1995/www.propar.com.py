/*
|--------------------------------------------------------------------------
| Tests del UploadService
|--------------------------------------------------------------------------
|
| Genera imágenes sintéticas con sharp y verifica la validación por magic
| bytes, peso, dimensiones y proporción, más el guardado/borrado físico.
| Los archivos van a ./tmp/tests (ver UPLOADS_PATH en .env.test).
|
*/

import { randomBytes } from 'node:crypto'
import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import sharp from 'sharp'

import Upload from '#models/upload'
import UploadService, { ErrorDeImagen } from '#services/upload_service'

/** Directorio de fixtures sintéticos (descartable) */
const FIXTURES = app.makePath('tmp/tests/fixtures')

/** Crea un PNG sólido de las dimensiones pedidas y devuelve su ruta */
async function crearPng(nombre: string, ancho: number, alto: number): Promise<string> {
  const ruta = join(FIXTURES, nombre)
  await sharp({
    create: { width: ancho, height: alto, channels: 3, background: { r: 77, g: 130, b: 193 } },
  })
    .png()
    .toFile(ruta)
  return ruta
}

async function existe(ruta: string): Promise<boolean> {
  try {
    await access(ruta)
    return true
  } catch {
    return false
  }
}

/** Espera que guardar() rechace con ErrorDeImagen y devuelve el mensaje */
async function esperarError(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa
  } catch (error) {
    if (error instanceof ErrorDeImagen) return error.message
    throw error
  }
  throw new Error('Se esperaba un ErrorDeImagen y la operación fue aceptada')
}

test.group('UploadService', (group) => {
  const service = new UploadService()
  const creados: number[] = []

  group.setup(async () => {
    await mkdir(FIXTURES, { recursive: true })
    return async () => {
      // Limpieza total: filas creadas + archivos de fixtures y uploads
      for (const id of creados) {
        await service.eliminar(id)
      }
      await rm(app.makePath('tmp/tests'), { recursive: true, force: true })
    }
  })

  test('guarda una imagen válida: fila, link de 100 hex y archivo físico', async ({ assert }) => {
    const ruta = await crearPng('carrusel-valido.png', 1920, 800)

    const upload = await service.guardar(
      { rutaTemporal: ruta, nombreOriginal: 'portada.png' },
      'carrusel'
    )
    creados.push(upload.id)

    assert.match(upload.link, /^[0-9a-f]{100}$/)
    assert.equal(upload.mime, 'image/png')
    assert.equal(upload.originalName, 'portada.png')
    assert.isAbove(upload.size ?? 0, 0)

    // Archivo físico <id>.png en UPLOADS_PATH
    const fisica = service.rutaFisica(upload)
    assert.isNotNull(fisica)
    assert.isTrue(await existe(fisica!))

    // Fila persistida
    const fila = await Upload.findBy('link', upload.link)
    assert.exists(fila)
  })

  test('rechaza un archivo que no es imagen aunque se llame .png', async ({ assert }) => {
    // Texto plano renombrado: los magic bytes lo delatan
    const ruta = join(FIXTURES, 'trucho.png')
    await writeFile(ruta, 'esto no es una imagen, es un txt renombrado')

    const mensaje = await esperarError(
      service.guardar({ rutaTemporal: ruta, nombreOriginal: 'trucho.png' }, 'carrusel')
    )
    assert.include(mensaje, 'no es una imagen válida')
  })

  test('rechaza un formato real no permitido (TIFF renombrado a .png)', async ({ assert }) => {
    const ruta = join(FIXTURES, 'disfrazado.png')
    await sharp({
      create: { width: 1920, height: 800, channels: 3, background: { r: 10, g: 10, b: 10 } },
    })
      .tiff()
      .toFile(ruta)

    const mensaje = await esperarError(
      service.guardar({ rutaTemporal: ruta, nombreOriginal: 'disfrazado.png' }, 'carrusel')
    )
    assert.include(mensaje, 'PNG, JPG o WebP')
  })

  test('rechaza una imagen más chica que el mínimo de la spec', async ({ assert }) => {
    const ruta = await crearPng('chica.png', 400, 200)

    const mensaje = await esperarError(
      service.guardar({ rutaTemporal: ruta, nombreOriginal: 'chica.png' }, 'carrusel')
    )
    assert.include(mensaje, 'mínimo es 1920×800')
  })

  test('rechaza una imagen que supera el peso máximo', async ({ assert }) => {
    // Ruido aleatorio: PNG incompresible que supera el 1 MB de iconoRed
    const ruta = join(FIXTURES, 'pesada.png')
    await sharp(randomBytes(900 * 900 * 3), {
      raw: { width: 900, height: 900, channels: 3 },
    })
      .png({ compressionLevel: 0 })
      .toFile(ruta)

    const mensaje = await esperarError(
      service.guardar({ rutaTemporal: ruta, nombreOriginal: 'pesada.png' }, 'iconoRed')
    )
    assert.include(mensaje, 'peso máximo')
  })

  test('rechaza una imagen con proporción incorrecta', async ({ assert }) => {
    // Cumple mínimos del carrusel (1920×800) pero es vertical, no apaisada
    const vertical = await crearPng('vertical.png', 1920, 2000)
    const mensajeApaisada = await esperarError(
      service.guardar({ rutaTemporal: vertical, nombreOriginal: 'vertical.png' }, 'carrusel')
    )
    assert.include(mensajeApaisada, 'apaisada')

    // fotoPerfil exige cuadrada
    const rectangular = await crearPng('rectangular.png', 400, 300)
    const mensajeCuadrada = await esperarError(
      service.guardar(
        { rutaTemporal: rectangular, nombreOriginal: 'rectangular.png' },
        'fotoPerfil'
      )
    )
    assert.include(mensajeCuadrada, 'cuadrada')
  })

  test('guarda un PDF válido: fila con mime y spec, archivo físico .pdf', async ({ assert }) => {
    const ruta = join(FIXTURES, 'bases.pdf')
    await writeFile(ruta, '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n')

    const upload = await service.guardarPdf(
      { rutaTemporal: ruta, nombreOriginal: 'bases-y-condiciones.pdf' },
      'basesPromocion'
    )
    creados.push(upload.id)

    assert.match(upload.link, /^[0-9a-f]{100}$/)
    assert.equal(upload.mime, 'application/pdf')
    assert.equal(upload.spec, 'basesPromocion')
    assert.equal(upload.originalName, 'bases-y-condiciones.pdf')

    const fisica = service.rutaFisica(upload)!
    assert.isTrue(fisica.endsWith(`${upload.id}.pdf`))
    assert.isTrue(await existe(fisica))
  })

  test('rechaza un archivo que no es PDF aunque se llame .pdf', async ({ assert }) => {
    // Los magic bytes ("%PDF-") lo delatan
    const ruta = join(FIXTURES, 'trucho.pdf')
    await writeFile(ruta, 'esto no es un pdf, es un txt renombrado')

    const mensaje = await esperarError(
      service.guardarPdf({ rutaTemporal: ruta, nombreOriginal: 'trucho.pdf' }, 'basesPromocion')
    )
    assert.include(mensaje, 'no es un PDF válido')
  })

  test('rechaza un PDF que supera el peso máximo', async ({ assert }) => {
    // 11 MB de ruido con cabecera válida: supera los 10 MB de basesPromocion
    const ruta = join(FIXTURES, 'pesado.pdf')
    await writeFile(ruta, Buffer.concat([Buffer.from('%PDF-1.4\n'), randomBytes(11 * 1024 * 1024)]))

    const mensaje = await esperarError(
      service.guardarPdf({ rutaTemporal: ruta, nombreOriginal: 'pesado.pdf' }, 'basesPromocion')
    )
    assert.include(mensaje, 'peso máximo')
  })

  test('eliminar borra el archivo físico y la fila', async ({ assert }) => {
    const ruta = await crearPng('perfil.png', 256, 256)
    const upload = await service.guardar(
      { rutaTemporal: ruta, nombreOriginal: 'perfil.png' },
      'fotoPerfil'
    )
    const fisica = service.rutaFisica(upload)!
    assert.isTrue(await existe(fisica))

    await service.eliminar(upload.id)

    assert.isFalse(await existe(fisica))
    assert.isNull(await Upload.find(upload.id))
  })
})
