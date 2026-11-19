import { test } from '@japa/runner'
import JSZip from 'jszip'

import {
  leerKml,
  numeroDeLote,
  numeroDeManzana,
  parsearKmlPlano,
} from '#services/kmz_plano_service'
import { kmlSintetico } from '#tests/helpers/kml_sintetico'

test.group('KMZ/KML de planos', () => {
  test('números de manzana: enteros, romanos y letras', ({ assert }) => {
    assert.equal(numeroDeManzana('002'), 2)
    assert.equal(numeroDeManzana('II'), 2)
    assert.equal(numeroDeManzana('xiv'), 14)
    assert.equal(numeroDeManzana('B'), 2)
    assert.isNull(numeroDeManzana('PLAZA'))
    assert.equal(numeroDeLote('15'), 15)
    assert.isNull(numeroDeLote('10-A'))
  })

  test('arma fracción, manzanas y lotes de un KML válido', ({ assert }) => {
    const r = parsearKmlPlano(kmlSintetico())
    assert.deepEqual(r.errores, [])
    assert.isNotNull(r.fraccion)
    assert.deepEqual(
      r.manzanas.map((m) => m.mz),
      [1, 2]
    )
    assert.sameMembers(
      r.lotes.map((l) => `${l.mz}-${l.lt}`),
      ['1-1', '1-2', '2-1']
    )
    assert.property(r.lotes[0].lados[0][0], 'lat')
  })

  test('avisa capas ajenas y plazas sin bloquear', ({ assert }) => {
    const r = parsearKmlPlano(kmlSintetico({ extras: true }))
    assert.deepEqual(r.errores, [])
    assert.lengthOf(r.lotes, 3)
    assert.isTrue(r.avisos.some((a) => a.includes('CALLES')))
    assert.isTrue(r.avisos.some((a) => /plaza/i.test(a)))
  })

  test('detalla los errores: sin contorno y lote sin número', ({ assert }) => {
    const r = parsearKmlPlano(kmlSintetico({ sinPoligono: true, loteSinNumero: true }))
    assert.isTrue(r.errores.some((e) => e.includes('POLIGONO')))
    assert.isTrue(r.errores.some((e) => e.includes('LOTE_TEXT')))
  })

  test('rechaza un XML roto', ({ assert }) => {
    const r = parsearKmlPlano('esto no es xml')
    assert.isNotEmpty(r.errores)
  })

  test('lee el KML de adentro de un KMZ', async ({ assert }) => {
    const zip = new JSZip()
    zip.file('doc.kml', kmlSintetico())
    const kmz = await zip.generateAsync({ type: 'nodebuffer' })
    const leido = await leerKml(kmz, 'plano.kmz')
    assert.property(leido, 'kml')

    const roto = await leerKml(Buffer.from('no es zip'), 'plano.kmz')
    assert.property(roto, 'error')
  })
})
