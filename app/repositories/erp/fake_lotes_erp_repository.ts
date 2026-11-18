/*
|--------------------------------------------------------------------------
| Implementación FAKE del ERP
|--------------------------------------------------------------------------
|
| Genera un dataset EN MEMORIA a partir de los datos de la base de la web
| (fracciones, lotes y lotes_colores migrados por el ETL) y les inventa
| lo que solo vive en el ERP: estado, superficie, cuotas y precios.
|
| Es DETERMINÍSTICO: usa un PRNG (mulberry32) con seed fija y recorre los
| registros en orden estable, así dos instancias — o dos boots — producen
| exactamente el mismo dataset. Eso permite desarrollar y testear el
| frontend sin ERP y sin sorpresas entre recargas.
|
*/

import db from '@adonisjs/lucid/services/db'

import LotesErpRepository, {
  type DistritoResumen,
  type FiltroFracciones,
  type FraccionResumen,
  type LoteErp,
} from '#repositories/erp/lotes_erp_repository'

/** Seed fija: el dataset debe ser idéntico entre instancias y reinicios */
const SEED = 20260825

/** Distritos paraguayos plausibles para el dataset fake */
const DISTRITOS_FAKE = [
  { codigo: 1, nombre: 'Luque' },
  { codigo: 2, nombre: 'Areguá' },
  { codigo: 3, nombre: 'Capiatá' },
  { codigo: 4, nombre: 'Itauguá' },
  { codigo: 5, nombre: 'San Bernardino' },
] as const

/**
 * PRNG mulberry32: rápido, sin dependencias y reproducible.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Entero aleatorio en [min, max] inclusive */
function enteroEntre(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1))
}

/** Redondeo a miles (los importes del ERP vienen redondos) */
function aMiles(valor: number): number {
  return Math.round(valor / 1000) * 1000
}

interface FraccionFake {
  codigo: number
  descripcion: string
  distritoCodigo: number
  distritoNombre: string
}

interface Dataset {
  fracciones: Map<number, FraccionFake>
  lotes: LoteErp[]
}

export default class FakeLotesErpRepository extends LotesErpRepository {
  /** Dataset memoizado: se genera una sola vez al primer uso */
  #dataset: Promise<Dataset> | null = null

  /**
   * Construye el dataset leyendo los códigos cargados en la base y generando
   * estados/precios con el PRNG en orden estable.
   */
  async #generar(): Promise<Dataset> {
    const rand = mulberry32(SEED)

    // Fracciones reales, en orden estable por código
    const filasFracciones = await db
      .from('fracciones')
      .select('codigo', 'descripcion')
      .orderBy('codigo', 'asc')

    // Estados reales desde lotes_colores, en orden estable
    const filasColores = await db.from('lotes_colores').select('estado').orderBy('id', 'asc')
    const estados: string[] = filasColores.map((c) => String(c.estado))
    const estadosNoLibres = estados.filter((e) => e !== 'LIBRE')

    // Cada fracción se asigna a un distrito inventado (determinístico)
    const fracciones = new Map<number, FraccionFake>()
    for (const fila of filasFracciones) {
      const distrito = DISTRITOS_FAKE[enteroEntre(rand, 0, DISTRITOS_FAKE.length - 1)]
      fracciones.set(Number(fila.codigo), {
        codigo: Number(fila.codigo),
        descripcion: String(fila.descripcion ?? `Fracción ${fila.codigo}`),
        distritoCodigo: distrito.codigo,
        distritoNombre: distrito.nombre,
      })
    }

    // Lotes reales (códigos FML), en orden estable
    const filasLotes = await db
      .from('lotes')
      .select('fraccion_codigo', 'manzana_codigo', 'codigo')
      .orderBy('fraccion_codigo', 'asc')
      .orderBy('manzana_codigo', 'asc')
      .orderBy('codigo', 'asc')

    const lotes: LoteErp[] = []
    for (const fila of filasLotes) {
      // ~55% LIBRE, el resto repartido entre los demás estados del catálogo
      const estado =
        rand() < 0.55 ? 'LIBRE' : estadosNoLibres[enteroEntre(rand, 0, estadosNoLibres.length - 1)]

      const superficie = enteroEntre(rand, 250, 600)
      const cantidadCuotas = enteroEntre(rand, 60, 180)
      const importeCuota = aMiles(enteroEntre(rand, 250_000, 2_500_000))
      const precioCredito = cantidadCuotas * importeCuota
      const precioContado = aMiles(precioCredito * 0.7)
      const entrega = aMiles(precioCredito * 0.1)

      lotes.push({
        fraccionCodigo: Number(fila.fraccion_codigo),
        manzanaCodigo: Number(fila.manzana_codigo),
        loteCodigo: Number(fila.codigo),
        estado,
        superficie,
        cantidadCuotas,
        importeCuota,
        entrega,
        precioCredito,
        precioContado,
      })
    }

    return { fracciones, lotes }
  }

  async #obtenerDataset(): Promise<Dataset> {
    if (!this.#dataset) {
      this.#dataset = this.#generar()
    }
    return this.#dataset
  }

  async buscarFracciones(filtro: FiltroFracciones = {}): Promise<FraccionResumen[]> {
    const { fracciones, lotes } = await this.#obtenerDataset()

    const texto = filtro.texto?.trim().toLowerCase()

    // Filtro a nivel fracción (rango, distrito y texto — texto agrupado con OR interno)
    const fraccionCumple = (f: FraccionFake): boolean => {
      if (filtro.fraccionDesde !== undefined && f.codigo < filtro.fraccionDesde) return false
      if (filtro.fraccionHasta !== undefined && f.codigo > filtro.fraccionHasta) return false
      if (filtro.distrito !== undefined && f.distritoCodigo !== filtro.distrito) return false
      if (texto) {
        const enDistrito = f.distritoNombre.toLowerCase().includes(texto)
        const enDescripcion = f.descripcion.toLowerCase().includes(texto)
        if (!enDistrito && !enDescripcion) return false
      }
      return true
    }

    // Filtro a nivel lote (rango de cuota inclusive y estado)
    const loteCumple = (l: LoteErp): boolean => {
      if (filtro.cuotaDesde !== undefined && l.importeCuota < filtro.cuotaDesde) return false
      if (filtro.cuotaHasta !== undefined && l.importeCuota > filtro.cuotaHasta) return false
      if (filtro.soloLibres && l.estado !== 'LIBRE') return false
      return true
    }

    const resumen = new Map<number, FraccionResumen>()
    for (const lote of lotes) {
      const fraccion = fracciones.get(lote.fraccionCodigo)
      if (!fraccion || !fraccionCumple(fraccion) || !loteCumple(lote)) continue

      let actual = resumen.get(fraccion.codigo)
      if (!actual) {
        actual = {
          codigo: fraccion.codigo,
          descripcion: fraccion.descripcion,
          distritoCodigo: fraccion.distritoCodigo,
          distritoNombre: fraccion.distritoNombre,
          disponibles: 0,
          cuotaMinima: Number.POSITIVE_INFINITY,
          cuotaMaxima: 0,
        }
        resumen.set(fraccion.codigo, actual)
      }

      if (lote.estado === 'LIBRE') actual.disponibles++
      actual.cuotaMinima = Math.min(actual.cuotaMinima, lote.importeCuota)
      actual.cuotaMaxima = Math.max(actual.cuotaMaxima, lote.importeCuota)
    }

    // Orden por código descendente, igual que el sitio viejo
    return [...resumen.values()].sort((a, b) => b.codigo - a.codigo)
  }

  async lotesPorFraccion(fraccionCodigo: number): Promise<LoteErp[]> {
    const { lotes } = await this.#obtenerDataset()

    return lotes
      .filter((l) => l.fraccionCodigo === fraccionCodigo)
      .sort((a, b) => a.manzanaCodigo - b.manzanaCodigo || a.loteCodigo - b.loteCodigo)
  }

  async precioLote(
    fraccionCodigo: number,
    manzanaCodigo: number,
    loteCodigo: number
  ): Promise<LoteErp | null> {
    const { lotes } = await this.#obtenerDataset()

    const lote = lotes.find(
      (l) =>
        l.fraccionCodigo === fraccionCodigo &&
        l.manzanaCodigo === manzanaCodigo &&
        l.loteCodigo === loteCodigo
    )
    return lote ?? null
  }

  async distritos(): Promise<DistritoResumen[]> {
    const { fracciones, lotes } = await this.#obtenerDataset()

    const resumen = new Map<number, DistritoResumen>()

    for (const fraccion of fracciones.values()) {
      let distrito = resumen.get(fraccion.distritoCodigo)
      if (!distrito) {
        distrito = {
          codigo: fraccion.distritoCodigo,
          nombre: fraccion.distritoNombre,
          fracciones: 0,
          lotesLibres: 0,
          cuotaMinima: Number.POSITIVE_INFINITY,
        }
        resumen.set(fraccion.distritoCodigo, distrito)
      }
      distrito.fracciones++
    }

    for (const lote of lotes) {
      if (lote.estado !== 'LIBRE') continue
      const fraccion = fracciones.get(lote.fraccionCodigo)
      if (!fraccion) continue
      const distrito = resumen.get(fraccion.distritoCodigo)
      if (!distrito) continue
      distrito.lotesLibres++
      distrito.cuotaMinima = Math.min(distrito.cuotaMinima, lote.importeCuota)
    }

    return [...resumen.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }
}
