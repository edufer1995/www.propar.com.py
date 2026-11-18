/*
|--------------------------------------------------------------------------
| Contrato de la capa ERP (lotes)
|--------------------------------------------------------------------------
|
| Abstrae de dónde salen los datos comerciales de los lotes (estado,
| precios, superficie). Los DTOs exponen números crudos en camelCase:
| el formato de moneda ("Gs. 1.250.000") lo aplica el frontend.
|
| Implementaciones:
|  - FakeLotesErpRepository:   dataset determinístico en memoria (desarrollo)
|  - OdooLotesErpRepository:   Odoo de Propar (fraction.loteamiento,
|                               loteamiento.lote, pricelist.lote)
|  - CachedLotesErpRepository: decorator con cache en memoria
|
| El provider #providers/erp_provider bindea esta clase abstracta en el
| container según ERP_DRIVER, así los controladores la reciben con @inject.
|
*/

/**
 * Filtros de búsqueda de fracciones. Semántica idéntica al sitio viejo:
 *  - texto: busca en la descripción de la fracción Y en el nombre del
 *    distrito (substring, case-insensitive). Se agrupa con OR interno
 *    (corrige el bug del orWhereRaw sin agrupar del sitio viejo).
 *  - fraccionDesde/fraccionHasta y cuotaDesde/cuotaHasta: rangos inclusive.
 *  - distrito: igualdad por código.
 *  - soloLibres: considera únicamente lotes con estado LIBRE.
 */
export interface FiltroFracciones {
  texto?: string
  distrito?: number
  fraccionDesde?: number
  fraccionHasta?: number
  cuotaDesde?: number
  cuotaHasta?: number
  soloLibres?: boolean
}

/**
 * Resumen de una fracción para listados y mapa.
 */
export interface FraccionResumen {
  codigo: number
  descripcion: string
  distritoCodigo: number
  distritoNombre: string
  /** Cantidad de lotes en estado LIBRE que cumplen el filtro */
  disponibles: number
  /** Cuota mensual mínima entre los lotes que cumplen el filtro */
  cuotaMinima: number
  /** Cuota mensual máxima entre los lotes que cumplen el filtro */
  cuotaMaxima: number
}

/**
 * Detalle de un lote tal como lo entrega el ERP.
 */
export interface LoteErp {
  fraccionCodigo: number
  manzanaCodigo: number
  loteCodigo: number
  /** Estado del ERP (LIBRE, VENDIDO, RESERVADO, ...) — matchea lotes_colores.estado */
  estado: string
  /** Superficie en m² (entero) */
  superficie: number
  cantidadCuotas: number
  importeCuota: number
  entrega: number
  precioCredito: number
  precioContado: number
}

/**
 * Resumen por distrito (combos de filtros y bloque "lotes por distrito" del home).
 */
export interface DistritoResumen {
  codigo: number
  nombre: string
  /** Cantidad de fracciones del distrito */
  fracciones: number
  /** Cantidad de lotes en estado LIBRE */
  lotesLibres: number
  /** Cuota mensual mínima entre los lotes LIBRES del distrito */
  cuotaMinima: number
}

/**
 * Contrato de acceso a datos de lotes del ERP.
 */
export default abstract class LotesErpRepository {
  /**
   * Busca fracciones que tengan al menos un lote que cumpla el filtro,
   * ordenadas por código descendente (igual que el sitio viejo).
   */
  abstract buscarFracciones(filtro?: FiltroFracciones): Promise<FraccionResumen[]>

  /**
   * Todos los lotes de una fracción, ordenados por manzana y lote ascendente.
   */
  abstract lotesPorFraccion(fraccionCodigo: number): Promise<LoteErp[]>

  /**
   * Precio de un lote puntual por su terna fracción-manzana-lote.
   * Devuelve null si el ERP no lo conoce.
   */
  abstract precioLote(
    fraccionCodigo: number,
    manzanaCodigo: number,
    loteCodigo: number
  ): Promise<LoteErp | null>

  /**
   * Resumen por distrito, ordenado por nombre ascendente.
   */
  abstract distritos(): Promise<DistritoResumen[]>
}
