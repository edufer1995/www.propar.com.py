/*
|--------------------------------------------------------------------------
| Tests de SEO técnico (Etapa 6)
|--------------------------------------------------------------------------
|
| robots.txt, sitemap.xml y SSR selectivo de las páginas públicas (el HTML
| debe llegar renderizado desde el server: title y contenido, no solo el
| div data-page).
|
*/

import { test } from '@japa/runner'

test.group('Público / SEO técnico', () => {
  test('robots.txt permite el sitio público y bloquea admin/auth/api', async ({
    client,
    assert,
  }) => {
    const respuesta = await client.get('/robots.txt')
    respuesta.assertStatus(200)
    assert.include(respuesta.header('content-type') ?? '', 'text/plain')
    assert.include(respuesta.text(), 'Disallow: /app')
    assert.include(respuesta.text(), 'Disallow: /auth')
    assert.include(respuesta.text(), 'Sitemap:')
  })

  test('sitemap.xml lista las rutas públicas', async ({ client, assert }) => {
    const respuesta = await client.get('/sitemap.xml')
    respuesta.assertStatus(200)
    assert.include(respuesta.header('content-type') ?? '', 'xml')
    for (const ruta of ['/loteamientos', '/quienes-somos', '/contacto']) {
      assert.include(respuesta.text(), `<loc>`)
      assert.include(respuesta.text(), ruta)
    }
    for (const ruta of ['/alquileres', '/parking', '/abas-guarda']) {
      assert.notInclude(respuesta.text(), ruta)
    }
  })

  test('las páginas públicas llegan con SSR (title renderizado en el HTML)', async ({
    client,
    assert,
  }) => {
    const casos: [string, string][] = [
      ['/', 'Lotes en cuotas en Paraguay - Propar Inmobiliaria'],
      ['/quienes-somos', 'Quiénes somos - Propar Inmobiliaria'],
      ['/loteamientos', 'Loteamientos en el mapa - Propar Inmobiliaria'],
    ]
    for (const [ruta, titulo] of casos) {
      const respuesta = await client.get(ruta)
      respuesta.assertStatus(200)
      assert.include(respuesta.text(), titulo, `${ruta} debería SSRear su <title>`)
      assert.include(respuesta.text(), 'meta name="description"', `${ruta} sin meta description`)
    }
  })

  test('el login sigue client-only (sin SSR)', async ({ client, assert }) => {
    const respuesta = await client.get('/auth/login')
    respuesta.assertStatus(200)
    /** Si el form llegara en el HTML significaría que auth/* se SSReó. */
    assert.notInclude(respuesta.text(), 'type="password"')
  })
})
