/*
|--------------------------------------------------------------------------
| Tests del PDF de bases y condiciones en promociones
|--------------------------------------------------------------------------
|
| El PDF se sube antes por /api/uploads (spec basesPromocion) y el form
| del ABM asocia el id en pdfUploadId. Acá se cubre: asociación al crear,
| DTO del index (pdfUrl + pdfNombre), rechazo de un upload de otra spec,
| y que quitar el PDF borre el upload (fila + archivo).
|
| Corren contra la base de desarrollo: crean filas propias con un prefijo único y las
| borran al final — nunca truncan tablas.
|
*/

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'

import Promocion from '#models/promocion'
import Upload from '#models/upload'
import User from '#models/user'
import UploadService from '#services/upload_service'

const PREFIJO = `TestPdf-${Date.now()}`

/** Directorio de fixtures sintéticos (descartable) */
const FIXTURES = app.makePath('tmp/tests/fixtures-promo-pdf')

test.group('Admin / promociones con PDF de bases', (group) => {
  const service = new UploadService()
  let usuario: User

  /** Crea un upload PDF real (fila + archivo físico) con la spec pedida */
  async function crearPdf(nombre: string, spec: 'basesPromocion') {
    const ruta = join(FIXTURES, nombre)
    await writeFile(ruta, '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n')
    return service.guardarPdf({ rutaTemporal: ruta, nombreOriginal: nombre }, spec)
  }

  group.setup(async () => {
    await mkdir(FIXTURES, { recursive: true })
    usuario = await User.create({
      username: `test.promopdf.${Date.now()}`,
      nombre: 'Test Promo PDF',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })

    return async () => {
      const promos = await Promocion.query().where('titulo', 'like', `${PREFIJO}%`)
      for (const promo of promos) {
        for (const id of [promo.imagenUploadId, promo.pdfUploadId]) {
          if (id) await service.eliminar(id)
        }
        await promo.delete()
      }
      await usuario.delete()
      await rm(FIXTURES, { recursive: true, force: true })
    }
  })

  test('store asocia el PDF y el index expone pdfUrl + pdfNombre', async ({ client, assert }) => {
    const pdf = await crearPdf('bases-alfa.pdf', 'basesPromocion')

    const respuesta = await client
      .post('/app/promociones')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        titulo: `${PREFIJO} Alfa`,
        descripcion: 'Con bases y condiciones',
        url: null,
        vigenteDesde: null,
        vigenteHasta: null,
        activo: true,
        modal: false,
        pdfUploadId: pdf.id,
      })
    respuesta.assertStatus(302)

    const creada = await Promocion.findByOrFail('titulo', `${PREFIJO} Alfa`)
    assert.equal(creada.pdfUploadId, pdf.id)

    const index = await client
      .get(`/app/promociones?q=${PREFIJO} Alfa`)
      .loginAs(usuario)
      .withInertia()
    const registros = index.inertiaProps.registros as {
      data: { titulo: string; pdfUrl: string | null; pdfNombre: string | null }[]
    }
    assert.equal(registros.data[0].pdfUrl, `/api/file/public/${pdf.link}`)
    assert.equal(registros.data[0].pdfNombre, 'bases-alfa.pdf')
  })

  test('rechaza en pdfUploadId un upload de otra spec', async ({ client, assert }) => {
    // Un PDF válido pero subido con otra spec no puede asociarse al campo
    const ruta = join(FIXTURES, 'ajeno.pdf')
    await writeFile(ruta, '%PDF-1.4\n%%EOF\n')
    const ajeno = await Upload.create({
      link: 'a'.repeat(100),
      mime: 'application/pdf',
      size: 20,
      originalName: 'ajeno.pdf',
      spec: 'fotoPerfil',
    })

    const respuesta = await client
      .post('/app/promociones')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        titulo: `${PREFIJO} Beta`,
        descripcion: null,
        url: null,
        vigenteDesde: null,
        vigenteHasta: null,
        activo: true,
        modal: false,
        pdfUploadId: ajeno.id,
      })
    respuesta.assertStatus(302) // redirect back con errores flasheados

    assert.isNull(await Promocion.findBy('titulo', `${PREFIJO} Beta`))
    await ajeno.delete()
  })

  test('quitar el PDF (null) desasocia y borra el upload', async ({ client, assert }) => {
    const pdf = await crearPdf('bases-gamma.pdf', 'basesPromocion')
    const promo = await Promocion.create({
      titulo: `${PREFIJO} Gamma`,
      activo: true,
      modal: false,
      pdfUploadId: pdf.id,
    })

    const respuesta = await client
      .put(`/app/promociones/${promo.id}`)
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        titulo: `${PREFIJO} Gamma`,
        descripcion: null,
        url: null,
        vigenteDesde: null,
        vigenteHasta: null,
        activo: true,
        modal: false,
        pdfUploadId: null,
      })
    respuesta.assertStatus(302)

    await promo.refresh()
    assert.isNull(promo.pdfUploadId)
    // El upload quitado se borra (fila y archivo)
    assert.isNull(await Upload.find(pdf.id))
  })
})
