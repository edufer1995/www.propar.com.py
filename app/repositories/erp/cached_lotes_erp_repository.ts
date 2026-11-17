/*
|--------------------------------------------------------------------------
| Decorator de cache para la capa ERP
|--------------------------------------------------------------------------
|
| Envuelve cualquier LotesErpRepository y memoiza en un Map con expiración:
|  - distritos() y buscarFracciones() SIN filtros → TTL largo (5 min):
|    son los datos de combos/home, cambian poco.
|  - lotesPorFraccion() y precioLote() → TTL corto (60 s): precios y
|    estados que el ERP puede mover durante el día.
|  - buscarFracciones() CON filtros NO se cachea: la combinatoria de
|    filtros haría crecer el Map sin beneficio real.
|
| Los TTL se pueden inyectar por constructor (los tests usan TTLs de
| milisegundos). flush() vacía todo el cache.
|
*/

import LotesErpRepository, {
  type DistritoResumen,
  type FiltroFracciones,
  type FraccionResumen,
  type LoteErp,
} from '#repositories/erp/lotes_erp_repository'

interface EntradaCache {
  expira: number
  valor: unknown
}

export interface TtlsCache {
  /** distritos() y buscarFracciones() sin filtros */
  largoMs: number
  /** lotesPorFraccion() y precioLote() */
  cortoMs: number
}

export default class CachedLotesErpRepository extends LotesErpRepository {
  #interno: LotesErpRepository
  #ttls: TtlsCache
  #cache = new Map<string, EntradaCache>()

  constructor(interno: LotesErpRepository, ttls?: Partial<TtlsCache>) {
    super()
    this.#interno = interno
    this.#ttls = { largoMs: 5 * 60_000, cortoMs: 60_000, ...ttls }
  }

  /** Devuelve el valor cacheado vigente o ejecuta y guarda */
  async #recordar<T>(clave: string, ttlMs: number, producir: () => Promise<T>): Promise<T> {
    const entrada = this.#cache.get(clave)
    if (entrada && entrada.expira > Date.now()) {
      return entrada.valor as T
    }

    const valor = await producir()
    this.#cache.set(clave, { expira: Date.now() + ttlMs, valor })
    return valor
  }

  /** Vacía el cache completo (para tests y para invalidaciones manuales) */
  flush(): void {
    this.#cache.clear()
  }

  async buscarFracciones(filtro: FiltroFracciones = {}): Promise<FraccionResumen[]> {
    const tieneFiltros = Object.values(filtro).some((v) => v !== undefined)
    if (tieneFiltros) {
      return this.#interno.buscarFracciones(filtro)
    }
    return this.#recordar('buscarFracciones', this.#ttls.largoMs, () =>
      this.#interno.buscarFracciones()
    )
  }

  async lotesPorFraccion(fraccionCodigo: number): Promise<LoteErp[]> {
    return this.#recordar(`lotesPorFraccion:${fraccionCodigo}`, this.#ttls.cortoMs, () =>
      this.#interno.lotesPorFraccion(fraccionCodigo)
    )
  }

  async precioLote(
    fraccionCodigo: number,
    manzanaCodigo: number,
    loteCodigo: number
  ): Promise<LoteErp | null> {
    return this.#recordar(
      `precioLote:${fraccionCodigo}-${manzanaCodigo}-${loteCodigo}`,
      this.#ttls.cortoMs,
      () => this.#interno.precioLote(fraccionCodigo, manzanaCodigo, loteCodigo)
    )
  }

  async distritos(): Promise<DistritoResumen[]> {
    return this.#recordar('distritos', this.#ttls.largoMs, () => this.#interno.distritos())
  }
}
