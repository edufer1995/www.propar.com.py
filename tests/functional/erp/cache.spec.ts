/*
|--------------------------------------------------------------------------
| Tests del decorator de cache del ERP
|--------------------------------------------------------------------------
|
| Usa un repositorio contador (stub) para verificar qué llamadas llegan
| al repositorio interno, con TTLs de milisegundos para probar expiración.
|
*/

import { setTimeout as esperar } from 'node:timers/promises'
import { test } from '@japa/runner'

import CachedLotesErpRepository from '#repositories/erp/cached_lotes_erp_repository'
import LotesErpRepository, {
  type DistritoResumen,
  type FiltroFracciones,
  type FraccionResumen,
  type LoteErp,
} from '#repositories/erp/lotes_erp_repository'

/**
 * Stub que cuenta cuántas veces se invoca cada método.
 */
class RepositorioContador extends LotesErpRepository {
  llamadas = { buscarFracciones: 0, lotesPorFraccion: 0, precioLote: 0, distritos: 0 }

  async buscarFracciones(_filtro: FiltroFracciones = {}): Promise<FraccionResumen[]> {
    this.llamadas.buscarFracciones++
    return []
  }

  async lotesPorFraccion(_fraccionCodigo: number): Promise<LoteErp[]> {
    this.llamadas.lotesPorFraccion++
    return []
  }

  async precioLote(_f: number, _m: number, _l: number): Promise<LoteErp | null> {
    this.llamadas.precioLote++
    return null
  }

  async distritos(): Promise<DistritoResumen[]> {
    this.llamadas.distritos++
    return []
  }
}

test.group('ERP cache', () => {
  test('distritos y buscarFracciones sin filtros se cachean', async ({ assert }) => {
    const interno = new RepositorioContador()
    const cacheado = new CachedLotesErpRepository(interno)

    await cacheado.distritos()
    await cacheado.distritos()
    await cacheado.buscarFracciones()
    await cacheado.buscarFracciones({})

    assert.equal(interno.llamadas.distritos, 1)
    assert.equal(interno.llamadas.buscarFracciones, 1)
  })

  test('buscarFracciones con filtros NO se cachea', async ({ assert }) => {
    const interno = new RepositorioContador()
    const cacheado = new CachedLotesErpRepository(interno)

    await cacheado.buscarFracciones({ texto: 'luque' })
    await cacheado.buscarFracciones({ texto: 'luque' })

    assert.equal(interno.llamadas.buscarFracciones, 2)
  })

  test('lotesPorFraccion y precioLote se cachean por argumentos', async ({ assert }) => {
    const interno = new RepositorioContador()
    const cacheado = new CachedLotesErpRepository(interno)

    await cacheado.lotesPorFraccion(58)
    await cacheado.lotesPorFraccion(58)
    await cacheado.lotesPorFraccion(67) // clave distinta → nueva llamada

    await cacheado.precioLote(58, 1, 1)
    await cacheado.precioLote(58, 1, 1)
    await cacheado.precioLote(58, 1, 2) // clave distinta → nueva llamada

    assert.equal(interno.llamadas.lotesPorFraccion, 2)
    assert.equal(interno.llamadas.precioLote, 2)
  })

  test('las entradas expiran al vencer el TTL', async ({ assert }) => {
    const interno = new RepositorioContador()
    const cacheado = new CachedLotesErpRepository(interno, { cortoMs: 30, largoMs: 30 })

    await cacheado.lotesPorFraccion(58)
    await cacheado.distritos()
    await esperar(50)
    await cacheado.lotesPorFraccion(58)
    await cacheado.distritos()

    assert.equal(interno.llamadas.lotesPorFraccion, 2)
    assert.equal(interno.llamadas.distritos, 2)
  })

  test('flush vacía el cache completo', async ({ assert }) => {
    const interno = new RepositorioContador()
    const cacheado = new CachedLotesErpRepository(interno)

    await cacheado.distritos()
    await cacheado.lotesPorFraccion(58)
    cacheado.flush()
    await cacheado.distritos()
    await cacheado.lotesPorFraccion(58)

    assert.equal(interno.llamadas.distritos, 2)
    assert.equal(interno.llamadas.lotesPorFraccion, 2)
  })
})
