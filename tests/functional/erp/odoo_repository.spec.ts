/*
|--------------------------------------------------------------------------
| Tests del repositorio Odoo (sin red)
|--------------------------------------------------------------------------
|
| Las reglas de negocio (FML, estados, precio vigente, distritos) son
| funciones puras y se prueban directo. El repositorio se prueba con un
| OdooClient falso que responde con filas armadas como las de Propar.
|
*/

import { test } from '@japa/runner'

import OdooClient, { OdooError, type DominioOdoo } from '#repositories/erp/odoo_client'
import OdooLotesErpRepository, {
  codigoDistrito,
  estadoWeb,
  limpiarDistrito,
  parseFml,
  precioVigente,
  type EtapaOdoo,
  type FraccionOdoo,
  type LoteOdoo,
  type PrecioOdoo,
} from '#repositories/erp/odoo_lotes_erp_repository'

const ETAPAS: EtapaOdoo[] = [
  { id: 13, name: 'Libre', disponible: true, sale_state: false, is_closed_state: false },
  {
    id: 23,
    name: 'Reservado portal (24 h)',
    disponible: false,
    sale_state: false,
    is_closed_state: false,
  },
  {
    id: 22,
    name: 'Reserva del propietario',
    disponible: false,
    sale_state: false,
    is_closed_state: false,
  },
  {
    id: 14,
    name: 'Vendido / En Proceso',
    disponible: false,
    sale_state: true,
    is_closed_state: false,
  },
  { id: 15, name: 'Cancelado', disponible: false, sale_state: false, is_closed_state: true },
  { id: 16, name: 'Judicializado', disponible: false, sale_state: false, is_closed_state: false },
]
const etapa = (id: number) => ETAPAS.find((e) => e.id === id)!

function precio(id: number, loteId: number, extra: Partial<PrecioOdoo>): PrecioOdoo {
  return {
    id,
    lote_id: [loteId, ''],
    cash_price: 10_000_000,
    month_price: 100_000,
    quota_quantity: 130,
    date_start: false,
    date_end: false,
    ...extra,
  }
}

const FRACCIONES: FraccionOdoo[] = [
  {
    id: 1,
    name: '033',
    name_fraction: 'VILLA CRISTINA',
    district_code: 'ENCARNACION',
    branch_id: [7, 'Encarnacion'],
  },
  {
    id: 2,
    name: '216',
    name_fraction: 'LA TRINIDAD',
    district_code: 'Encarnación',
    branch_id: [7, 'Encarnacion'],
  },
  {
    id: 3,
    name: '227',
    name_fraction: 'RESIDENCIAL 31',
    district_code: false,
    branch_id: [10, 'Ciudad del Este'],
  },
]

const LOTES: LoteOdoo[] = [
  {
    id: 11,
    name: '033/004/0011',
    loteamiento_id: [1, ''],
    stage_id: [13, 'Libre'],
    superficie: 360.4,
  },
  {
    id: 12,
    name: '033/004/0012',
    loteamiento_id: [1, ''],
    stage_id: [14, 'Vendido'],
    superficie: 361,
  },
  {
    id: 21,
    name: '216/001/0002',
    loteamiento_id: [2, ''],
    stage_id: [13, 'Libre'],
    superficie: 500,
  },
  {
    id: 22,
    name: '216/001/0003',
    loteamiento_id: [2, ''],
    stage_id: [23, 'Reservado'],
    superficie: 500,
  },
  {
    id: 31,
    name: '227/002/0008',
    loteamiento_id: [3, ''],
    stage_id: [13, 'Libre'],
    superficie: 450,
  },
  { id: 99, name: 'SIN-FML', loteamiento_id: [3, ''], stage_id: [13, 'Libre'], superficie: 1 },
]

const PRECIOS: PrecioOdoo[] = [
  precio(1, 11, { month_price: 300_000, cash_price: 20_000_000 }),
  precio(2, 21, { month_price: 1_980_000, quota_quantity: 130 }),
  precio(3, 31, { month_price: 620_000 }),
]

/** OdooClient que responde desde memoria y registra lo que le piden */
class OdooFalso extends OdooClient {
  pedidos: Array<{ modelo: string; dominio: DominioOdoo }> = []

  constructor() {
    super({ url: 'http://odoo.invalid', db: 'x', login: 'x', apiKey: 'x' })
  }

  async searchReadTodo<T>(modelo: string, dominio: DominioOdoo): Promise<T[]> {
    this.pedidos.push({ modelo, dominio })
    const filtroId = dominio.find((d) => Array.isArray(d) && d[0] === 'id') as
      [string, string, number] | undefined
    const tablas: Record<string, unknown[]> = {
      'fraction.loteamiento': filtroId
        ? FRACCIONES.filter((f) => f.id === filtroId[2])
        : FRACCIONES,
      'loteamiento.lote': LOTES,
      'lote.stage': ETAPAS,
      'pricelist.lote': PRECIOS,
    }
    return (tablas[modelo] ?? []) as T[]
  }
}

test.group('ERP Odoo / reglas', () => {
  test('parseFml convierte la terna con ceros a enteros', ({ assert }) => {
    assert.deepEqual(parseFml('033/004/0011'), { fraccion: 33, manzana: 4, lote: 11 })
    assert.deepEqual(parseFml(' 236 / 3 / 8 '), { fraccion: 236, manzana: 3, lote: 8 })
    assert.isNull(parseFml('236/A/0008'))
    assert.isNull(parseFml(false))
  })

  test('estadoWeb reduce las etapas de Odoo a los estados del mapa', ({ assert }) => {
    assert.equal(estadoWeb(etapa(13)), 'LIBRE')
    assert.equal(estadoWeb(etapa(23)), 'RESERVADO')
    assert.equal(estadoWeb(etapa(22)), 'RESERVADO')
    assert.equal(estadoWeb(etapa(14)), 'VENDIDO')
    assert.equal(estadoWeb(etapa(15)), 'VENDIDO')
    assert.equal(estadoWeb(etapa(16)), 'NO DISPONIBLE')
    assert.equal(estadoWeb(undefined), 'NO DISPONIBLE')
  })

  test('precioVigente elige la lista vigente y, entre dos, la más nueva', ({ assert }) => {
    const promo = precio(1, 1, { date_start: '2026-09-24', date_end: '2026-12-31' })
    const anual = precio(2, 1, { date_start: '2027-01-01', date_end: '2028-01-01' })
    assert.equal(precioVigente([promo, anual], '2026-11-17')?.id, 1)
    assert.equal(precioVigente([promo, anual], '2027-01-01')?.id, 2)
    assert.isNull(precioVigente([promo], '2027-02-01'))

    const solapada = precio(3, 1, { date_start: '2026-11-01', date_end: false })
    assert.equal(precioVigente([promo, solapada], '2026-11-17')?.id, 3)
  })

  test('los distritos escritos distinto comparten código', ({ assert }) => {
    assert.equal(codigoDistrito('MINGA GUAZU'), codigoDistrito('Minga Guazú'))
    assert.notEqual(codigoDistrito('Luque'), codigoDistrito('Limpio'))
    assert.equal(limpiarDistrito('Cambyreta Padron N° 5311'), 'Cambyreta')
    assert.equal(limpiarDistrito('Hohenau (Padron N° 690)'), 'Hohenau')
    assert.equal(limpiarDistrito('PTE FRANCO'), 'Presidente Franco')
  })
})

/** Códigos de las fracciones que devuelve buscarFracciones con ese filtro */
async function codigos(
  repo: OdooLotesErpRepository,
  filtro: Parameters<OdooLotesErpRepository['buscarFracciones']>[0]
) {
  const fracciones = await repo.buscarFracciones(filtro)
  return fracciones.map((f) => f.codigo)
}

test.group('ERP Odoo / repositorio', () => {
  test('lotesPorFraccion cruza estado y precio vigente por FML', async ({ assert }) => {
    const repo = new OdooLotesErpRepository(new OdooFalso())
    const lotes = await repo.lotesPorFraccion(33)

    assert.lengthOf(lotes, 2)
    assert.deepEqual(lotes[0], {
      fraccionCodigo: 33,
      manzanaCodigo: 4,
      loteCodigo: 11,
      estado: 'LIBRE',
      superficie: 360,
      cantidadCuotas: 130,
      importeCuota: 300_000,
      entrega: 0,
      precioCredito: 300_000 * 130,
      precioContado: 20_000_000,
    })
    assert.equal(lotes[1].estado, 'VENDIDO')
    assert.equal(lotes[1].importeCuota, 0)
  })

  test('precioLote encuentra un lote puntual o devuelve null', async ({ assert }) => {
    const repo = new OdooLotesErpRepository(new OdooFalso())
    const lote = await repo.precioLote(216, 1, 2)
    assert.equal(lote?.importeCuota, 1_980_000)
    assert.isNull(await repo.precioLote(216, 9, 9))
    assert.isNull(await repo.precioLote(999, 1, 1))
  })

  test('buscarFracciones agrega libres y cuotas, ordenado desc', async ({ assert }) => {
    const repo = new OdooLotesErpRepository(new OdooFalso())
    const fracciones = await repo.buscarFracciones()

    assert.deepEqual(
      fracciones.map((f) => f.codigo),
      [227, 216, 33]
    )
    const trinidad = fracciones.find((f) => f.codigo === 216)!
    assert.equal(trinidad.disponibles, 1)
    assert.equal(trinidad.cuotaMinima, 1_980_000)
    /* Sin ciudad cargada, el distrito es la sucursal. */
    assert.equal(fracciones.find((f) => f.codigo === 227)!.distritoNombre, 'Ciudad del Este')
    /* "ENCARNACION" y "Encarnación" son el mismo distrito, con tilde. */
    assert.equal(fracciones.find((f) => f.codigo === 33)!.distritoNombre, 'Encarnación')
  })

  test('buscarFracciones respeta texto, cuota y soloLibres', async ({ assert }) => {
    const repo = new OdooLotesErpRepository(new OdooFalso())
    assert.deepEqual(await codigos(repo, { texto: 'trinidad' }), [216])
    assert.deepEqual(await codigos(repo, { texto: 'encarnacion' }), [216, 33])
    assert.deepEqual(await codigos(repo, { cuotaHasta: 700_000 }), [227, 33])
    const distrito = codigoDistrito('Encarnación')
    assert.deepEqual(await codigos(repo, { distrito, soloLibres: true }), [216, 33])
  })

  test('distritos resume fracciones, libres y cuota mínima', async ({ assert }) => {
    const repo = new OdooLotesErpRepository(new OdooFalso())
    const distritos = await repo.distritos()
    assert.deepEqual(
      distritos.map((d) => [d.nombre, d.fracciones, d.lotesLibres, d.cuotaMinima]),
      [
        ['Ciudad del Este', 1, 1, 620_000],
        ['Encarnación', 2, 2, 300_000],
      ]
    )
  })

  test('el snapshot se reutiliza dentro del TTL', async ({ assert }) => {
    const odoo = new OdooFalso()
    const repo = new OdooLotesErpRepository(odoo)
    await repo.buscarFracciones()
    await repo.distritos()
    assert.lengthOf(
      odoo.pedidos.filter((p) => p.modelo === 'fraction.loteamiento'),
      1
    )
    repo.flush()
    await repo.distritos()
    assert.lengthOf(
      odoo.pedidos.filter((p) => p.modelo === 'fraction.loteamiento'),
      2
    )
  })
})

test.group('ERP Odoo / cliente', () => {
  test('bloquea cualquier método que no sea de lectura', async ({ assert }) => {
    const cliente = new OdooClient({ url: 'http://odoo.invalid', db: 'x', login: 'x', apiKey: 'x' })
    for (const metodo of ['write', 'create', 'unlink', 'action_confirm']) {
      const error = (await cliente
        .ejecutar('loteamiento.lote', metodo, [])
        .catch((e: unknown) => e)) as OdooError
      assert.instanceOf(error, OdooError)
      assert.equal(error.motivo, 'permiso')
    }
  })

  test('un host inalcanzable da un error de red legible', async ({ assert }) => {
    const cliente = new OdooClient({
      url: 'http://127.0.0.1:9',
      db: 'x',
      login: 'x',
      apiKey: 'clave-secreta',
      timeoutMs: 2000,
    })
    const error = (await cliente.uid().catch((e: unknown) => e)) as OdooError
    assert.instanceOf(error, OdooError)
    assert.oneOf(error.motivo, ['red', 'timeout'])
    assert.notInclude(error.message, 'clave-secreta')
  })
})
