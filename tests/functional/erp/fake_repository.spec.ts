/*
|--------------------------------------------------------------------------
| Tests del ERP fake
|--------------------------------------------------------------------------
|
| Verifican que el dataset en memoria sea determinístico, que los filtros
| respeten la semántica del sitio viejo y que los precios generados sean
| coherentes entre sí. Solo LEE de abas_v2 (códigos reales migrados).
|
*/

import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'

import FakeLotesErpRepository from '#repositories/erp/fake_lotes_erp_repository'

test.group('ERP fake — dataset', () => {
  test('dos instancias generan exactamente el mismo dataset', async ({ assert }) => {
    const repoA = new FakeLotesErpRepository()
    const repoB = new FakeLotesErpRepository()

    assert.deepEqual(await repoA.distritos(), await repoB.distritos())
    assert.deepEqual(await repoA.buscarFracciones(), await repoB.buscarFracciones())
    assert.deepEqual(await repoA.lotesPorFraccion(58), await repoB.lotesPorFraccion(58))
  })

  test('los valores generados respetan los rangos definidos', async ({ assert }) => {
    const repo = new FakeLotesErpRepository()
    const lotes = await repo.lotesPorFraccion(58)

    assert.isAbove(lotes.length, 0)
    for (const lote of lotes) {
      assert.isAtLeast(lote.superficie, 250)
      assert.isAtMost(lote.superficie, 600)
      assert.isAtLeast(lote.cantidadCuotas, 60)
      assert.isAtMost(lote.cantidadCuotas, 180)
      assert.isAtLeast(lote.importeCuota, 250_000)
      assert.isAtMost(lote.importeCuota, 2_500_000)
      // Importes redondeados a miles
      assert.equal(lote.importeCuota % 1000, 0)
      assert.equal(lote.precioContado % 1000, 0)
      assert.equal(lote.entrega % 1000, 0)
    }
  })

  test('los precios son coherentes entre sí', async ({ assert }) => {
    const repo = new FakeLotesErpRepository()
    const lotes = await repo.lotesPorFraccion(67)

    assert.isAbove(lotes.length, 0)
    for (const lote of lotes) {
      // Crédito = cuotas × importe; contado ~70%; entrega ~10%
      assert.equal(lote.precioCredito, lote.cantidadCuotas * lote.importeCuota)
      assert.approximately(lote.precioContado, lote.precioCredito * 0.7, 500)
      assert.approximately(lote.entrega, lote.precioCredito * 0.1, 500)
      assert.isBelow(lote.precioContado, lote.precioCredito)
    }
  })

  test('lotesPorFraccion ordena por manzana y lote ascendente', async ({ assert }) => {
    const repo = new FakeLotesErpRepository()
    const lotes = await repo.lotesPorFraccion(68)

    for (let i = 1; i < lotes.length; i++) {
      const anterior = lotes[i - 1]
      const actual = lotes[i]
      const bienOrdenado =
        anterior.manzanaCodigo < actual.manzanaCodigo ||
        (anterior.manzanaCodigo === actual.manzanaCodigo && anterior.loteCodigo < actual.loteCodigo)
      assert.isTrue(bienOrdenado, `desorden en índice ${i}`)
    }
  })
})

test.group('ERP fake — filtros', () => {
  test('rango de fracción es inclusive y ordena descendente', async ({ assert }) => {
    const repo = new FakeLotesErpRepository()
    const resultado = await repo.buscarFracciones({ fraccionDesde: 60, fraccionHasta: 70 })

    assert.isAbove(resultado.length, 0)
    for (const fraccion of resultado) {
      assert.isAtLeast(fraccion.codigo, 60)
      assert.isAtMost(fraccion.codigo, 70)
    }
    // Bordes inclusive (60 y 70 existen en abas_v2)
    assert.include(
      resultado.map((f) => f.codigo),
      60
    )
    assert.include(
      resultado.map((f) => f.codigo),
      70
    )
    // Orden descendente como el sitio viejo
    const codigos = resultado.map((f) => f.codigo)
    assert.deepEqual(
      codigos,
      [...codigos].sort((a, b) => b - a)
    )
  })

  test('rango de cuota es inclusive sobre el importe de la cuota', async ({ assert }) => {
    const repo = new FakeLotesErpRepository()
    const [unLote] = await repo.lotesPorFraccion(58)

    // Rango exacto en el importe de un lote conocido: su fracción debe aparecer
    const resultado = await repo.buscarFracciones({
      cuotaDesde: unLote.importeCuota,
      cuotaHasta: unLote.importeCuota,
    })

    const fraccion = resultado.find((f) => f.codigo === 58)
    assert.exists(fraccion)
    assert.equal(fraccion!.cuotaMinima, unLote.importeCuota)
    assert.equal(fraccion!.cuotaMaxima, unLote.importeCuota)
  })

  test('texto busca en distrito y descripción, case-insensitive', async ({ assert }) => {
    const repo = new FakeLotesErpRepository()

    const enMinusculas = await repo.buscarFracciones({ texto: 'luque' })
    const enMayusculas = await repo.buscarFracciones({ texto: 'LUQUE' })

    assert.isAbove(enMinusculas.length, 0)
    assert.deepEqual(enMinusculas, enMayusculas)
    for (const fraccion of enMinusculas) {
      const matchea =
        fraccion.distritoNombre.toLowerCase().includes('luque') ||
        fraccion.descripcion.toLowerCase().includes('luque')
      assert.isTrue(matchea, `fracción ${fraccion.codigo} no matchea el texto`)
    }
  })

  test('filtro por distrito devuelve solo fracciones de ese distrito', async ({ assert }) => {
    const repo = new FakeLotesErpRepository()
    const distritos = await repo.distritos()
    const elegido = distritos[0]

    const resultado = await repo.buscarFracciones({ distrito: elegido.codigo })

    assert.equal(resultado.length, elegido.fracciones)
    for (const fraccion of resultado) {
      assert.equal(fraccion.distritoCodigo, elegido.codigo)
      assert.equal(fraccion.distritoNombre, elegido.nombre)
    }
  })

  test('soloLibres considera únicamente lotes LIBRES', async ({ assert }) => {
    const repo = new FakeLotesErpRepository()
    const resultado = await repo.buscarFracciones({ soloLibres: true })

    assert.isAbove(resultado.length, 0)
    for (const fraccion of resultado) {
      const todos = await repo.lotesPorFraccion(fraccion.codigo)
      const libres = todos.filter((l) => l.estado === 'LIBRE')
      assert.equal(fraccion.disponibles, libres.length)
      assert.equal(fraccion.cuotaMinima, Math.min(...libres.map((l) => l.importeCuota)))
      assert.equal(fraccion.cuotaMaxima, Math.max(...libres.map((l) => l.importeCuota)))
    }
  })
})

test.group('ERP fake — precioLote y distritos', () => {
  test('precioLote devuelve el mismo lote que lotesPorFraccion', async ({ assert }) => {
    const repo = new FakeLotesErpRepository()
    const [unLote] = await repo.lotesPorFraccion(58)

    const precio = await repo.precioLote(
      unLote.fraccionCodigo,
      unLote.manzanaCodigo,
      unLote.loteCodigo
    )
    assert.deepEqual(precio, unLote)
  })

  test('precioLote devuelve null para una terna inexistente', async ({ assert }) => {
    const repo = new FakeLotesErpRepository()
    assert.isNull(await repo.precioLote(99999, 1, 1))
  })

  test('distritos es consistente con el resto del dataset', async ({ assert }) => {
    const repo = new FakeLotesErpRepository()
    const distritos = await repo.distritos()
    const fracciones = await repo.buscarFracciones()

    // Todas las fracciones quedan repartidas entre los distritos fake
    // (sin hardcodear el total: depende de los datos importados por el ETL)
    assert.equal(
      distritos.reduce((suma, d) => suma + d.fracciones, 0),
      fracciones.length
    )

    // Los lotes LIBRES por distrito suman lo mismo que por fracción
    assert.equal(
      distritos.reduce((suma, d) => suma + d.lotesLibres, 0),
      fracciones.reduce((suma, f) => suma + f.disponibles, 0)
    )

    // ~55% de los lotes deben ser LIBRES (tolerancia amplia; el total
    // depende de los datos importados por el ETL, no se hardcodea)
    const [{ total }] = await db.from('lotes').count('* as total')
    const totalLibres = distritos.reduce((suma, d) => suma + d.lotesLibres, 0)
    assert.approximately(totalLibres / Number(total), 0.55, 0.05)

    // Orden alfabético por nombre
    const nombres = distritos.map((d) => d.nombre)
    assert.deepEqual(
      nombres,
      [...nombres].sort((a, b) => a.localeCompare(b, 'es'))
    )
  })
})
