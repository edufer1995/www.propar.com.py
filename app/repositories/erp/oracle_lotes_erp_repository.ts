/*
|--------------------------------------------------------------------------
| Implementación REAL del ERP (Oracle)
|--------------------------------------------------------------------------
|
| Consulta las mismas vistas que el sitio viejo, y para lo mismo que él:
|  - INMC017_V: listados y agregados de fracciones (el viejo la usa en la
|    lista, el home y su API) → buscarFracciones() y distritos()
|  - INMM011_V: detalle por terna fracción-manzana-lote (el viejo la usa
|    para armar el mapa, en getPrecioFraccion) → lotesPorFraccion() y
|    precioLote()
|
| Sobre LOT_ESTADO: la vista lo devuelve con relleno de espacios (CHAR), y
| ese relleno hacía que el estado no encontrara su color en `lotes_colores`
| (el lote salía gris "SIN DATOS"). Se recorta al leerlo, y las
| comparaciones contra 'LIBRE' van con TRIM para que los contadores de
| disponibles y la cuota mínima no dependan del relleno. El emparejamiento
| con el catálogo, además, tolera mayúsculas/tildes: ver #services/estados_lote.
|
| Diferencias intencionales respecto al sitio viejo:
|  - TODOS los valores van como bindings parametrizados (el viejo interpolaba
|    strings en andWhereRaw: inyección SQL).
|  - El filtro de texto agrupa sus dos LIKE con where(group => ...): el viejo
|    usaba orWhereRaw suelto, que rompía la precedencia del AND y devolvía
|    filas fuera del rango pedido.
|  - El typo real de la vista INMM011_V (columna CODDIGO_LOTE) queda
|    encapsulado acá: hacia afuera siempre es loteCodigo.
|
| Para ACTIVARLA hace falta:
|  1. npm install oracledb  (y el Oracle Instant Client en el host)
|  2. ORACLE_DRIVER=real + ORACLE_HOST/PORT/USER/PASSWORD/DB_NAME en .env
|  3. config/database.ts registra la conexión 'oracle' automáticamente
|     cuando ORACLE_DRIVER=real (con fake ni se declara, para no exigir
|     el paquete oracledb en el boot).
|
| Esta clase NO se instancia con ORACLE_DRIVER=fake: solo debe compilar.
|
*/

import db from '@adonisjs/lucid/services/db'

import LotesErpRepository, {
  type DistritoResumen,
  type FiltroFracciones,
  type FraccionResumen,
  type LoteErp,
} from '#repositories/erp/lotes_erp_repository'

/** Typo real de la vista INMM011_V — no corregirlo: así se llama la columna */
const COLUMNA_LOTE_INMM011 = 'CODDIGO_LOTE'

export default class OracleLotesErpRepository extends LotesErpRepository {
  /** Conexión registrada en config/database.ts solo con ORACLE_DRIVER=real */
  #oracle() {
    return db.connection('oracle')
  }

  async buscarFracciones(filtro: FiltroFracciones = {}): Promise<FraccionResumen[]> {
    const query = this.#oracle()
      .query()
      .select('PRO_NRO_FRACCION')
      // Una fracción puede venir con PRO_DESC distinto según el lote (la 84
      // tiene "LA QUINTA" y "LA QUINTA - RESERVA"): agrupar por descripción
      // partía la fracción en dos cards con los agregados repartidos. Se
      // agrupa SOLO por fracción y las columnas descriptivas se colapsan
      // con MAX (determinístico; con datos sanos hay un único valor).
      .max('PRO_DESC', 'PRO_DESC')
      .max('DISTRITO', 'DISTRITO')
      .max('DISTRITO_DESC', 'DISTRITO_DESC')
      // Disponibles = lotes LIBRES; COUNT(CASE...) evita una segunda pasada
      .count(db.raw(`CASE WHEN TRIM(LOT_ESTADO) = 'LIBRE' THEN 1 END`), 'DISPONIBLES')
      .min('IMPORTE_CUOTAS', 'CUOTA_MINIMA')
      .max('IMPORTE_CUOTAS', 'CUOTA_MAXIMA')
      .from('INMC017_V')

    if (filtro.fraccionDesde !== undefined) {
      query.where('PRO_NRO_FRACCION', '>=', filtro.fraccionDesde)
    }
    if (filtro.fraccionHasta !== undefined) {
      query.where('PRO_NRO_FRACCION', '<=', filtro.fraccionHasta)
    }
    if (filtro.cuotaDesde !== undefined) {
      query.where('IMPORTE_CUOTAS', '>=', filtro.cuotaDesde)
    }
    if (filtro.cuotaHasta !== undefined) {
      query.where('IMPORTE_CUOTAS', '<=', filtro.cuotaHasta)
    }
    if (filtro.distrito !== undefined) {
      query.where('DISTRITO', '=', filtro.distrito)
    }
    if (filtro.soloLibres) {
      query.whereRaw('TRIM(LOT_ESTADO) = ?', ['LIBRE'])
    }
    if (filtro.texto) {
      // Agrupado: (DISTRITO_DESC LIKE ? OR PRO_DESC LIKE ?) AND resto.
      // El sitio viejo dejaba el OR suelto y rompía los demás filtros.
      const patron = `%${filtro.texto.toUpperCase()}%`
      query.where((grupo) => {
        grupo
          .whereRaw('UPPER(DISTRITO_DESC) LIKE ?', [patron])
          .orWhereRaw('UPPER(PRO_DESC) LIKE ?', [patron])
      })
    }

    query.groupBy('PRO_NRO_FRACCION').orderBy('PRO_NRO_FRACCION', 'desc')

    const filas = await query

    return filas.map((fila: Record<string, unknown>) => ({
      codigo: Number(fila.PRO_NRO_FRACCION),
      descripcion: String(fila.PRO_DESC ?? ''),
      distritoCodigo: Number(fila.DISTRITO),
      distritoNombre: String(fila.DISTRITO_DESC ?? ''),
      disponibles: Number(fila.DISPONIBLES ?? 0),
      cuotaMinima: Number(fila.CUOTA_MINIMA ?? 0),
      cuotaMaxima: Number(fila.CUOTA_MAXIMA ?? 0),
    }))
  }

  /**
   * Detalle de los lotes de una fracción: MISMA vista que el sitio viejo
   * usa para armar el mapa (getPrecioFraccion → INMM011_V). Es la fuente
   * de la que salen estado, precios, cuotas y superficie de cada lote.
   *
   * Antes esto salía de INMC017_V, que es "lotes en venta": si esa vista
   * no incluye algún lote que sí está en nuestra geometría, ese lote se
   * dibuja como "SIN DATOS". INMM011_V es por terna fracción-manzana-lote
   * y es la que el sitio viejo viene usando sin problemas.
   *
   * Sin ORDER BY a propósito: el orden de salida lo fija la consulta de
   * geometría en PG (el resultado del ERP se usa solo como diccionario),
   * así que ordenar acá sería trabajo de Oracle al pedo — y evita un CAST
   * sobre columnas cuyo tipo real en esta vista no está confirmado.
   */
  async lotesPorFraccion(fraccionCodigo: number): Promise<LoteErp[]> {
    const filas = await this.#oracle()
      .query()
      .select(
        'CODIGO_FRACCION',
        'CODIGO_MANZANA',
        COLUMNA_LOTE_INMM011,
        'LOT_ESTADO',
        'LOT_SUPERFICIE',
        'LOTP_CANT',
        'LOTP_IMPORTE',
        'ENTREGA',
        'LOT_PRECIO_CREDITO',
        'LOT_PRECIO_CONTADO'
      )
      .from('INMM011_V')
      .where('CODIGO_FRACCION', '=', fraccionCodigo)

    return filas.map((fila: Record<string, unknown>) => ({
      fraccionCodigo: Number(fila.CODIGO_FRACCION),
      manzanaCodigo: Number(fila.CODIGO_MANZANA),
      loteCodigo: Number(fila[COLUMNA_LOTE_INMM011]),
      estado: String(fila.LOT_ESTADO ?? '').trim(),
      superficie: Math.round(Number(fila.LOT_SUPERFICIE ?? 0)),
      cantidadCuotas: Number(fila.LOTP_CANT ?? 0),
      importeCuota: Number(fila.LOTP_IMPORTE ?? 0),
      entrega: Number(fila.ENTREGA ?? 0),
      precioCredito: Number(fila.LOT_PRECIO_CREDITO ?? 0),
      precioContado: Number(fila.LOT_PRECIO_CONTADO ?? 0),
    }))
  }

  async precioLote(
    fraccionCodigo: number,
    manzanaCodigo: number,
    loteCodigo: number
  ): Promise<LoteErp | null> {
    const fila = await this.#oracle()
      .query()
      .from('INMM011_V')
      .where('CODIGO_FRACCION', '=', fraccionCodigo)
      .where('CODIGO_MANZANA', '=', manzanaCodigo)
      .where(COLUMNA_LOTE_INMM011, '=', loteCodigo)
      .first()

    if (!fila) return null

    return {
      fraccionCodigo: Number(fila.CODIGO_FRACCION),
      manzanaCodigo: Number(fila.CODIGO_MANZANA),
      loteCodigo: Number(fila[COLUMNA_LOTE_INMM011]),
      estado: String(fila.LOT_ESTADO ?? '').trim(),
      superficie: Math.round(Number(fila.LOT_SUPERFICIE ?? 0)),
      cantidadCuotas: Number(fila.LOTP_CANT ?? 0),
      importeCuota: Number(fila.LOTP_IMPORTE ?? 0),
      entrega: Number(fila.ENTREGA ?? 0),
      precioCredito: Number(fila.LOT_PRECIO_CREDITO ?? 0),
      precioContado: Number(fila.LOT_PRECIO_CONTADO ?? 0),
    }
  }

  async distritos(): Promise<DistritoResumen[]> {
    const filas = await this.#oracle()
      .query()
      .select('DISTRITO', 'DISTRITO_DESC')
      .countDistinct('PRO_NRO_FRACCION', 'FRACCIONES')
      .count(db.raw(`CASE WHEN TRIM(LOT_ESTADO) = 'LIBRE' THEN 1 END`), 'LOTES_LIBRES')
      .min(db.raw(`CASE WHEN TRIM(LOT_ESTADO) = 'LIBRE' THEN IMPORTE_CUOTAS END`), 'CUOTA_MINIMA')
      .from('INMC017_V')
      .groupBy('DISTRITO', 'DISTRITO_DESC')
      .orderBy('DISTRITO_DESC', 'asc')

    return filas.map((fila: Record<string, unknown>) => ({
      codigo: Number(fila.DISTRITO),
      nombre: String(fila.DISTRITO_DESC ?? ''),
      fracciones: Number(fila.FRACCIONES ?? 0),
      lotesLibres: Number(fila.LOTES_LIBRES ?? 0),
      cuotaMinima: Number(fila.CUOTA_MINIMA ?? 0),
    }))
  }
}
