/*
|--------------------------------------------------------------------------
| Implementación REAL del ERP para Propar (Odoo 19, módulos de Criterium)
|--------------------------------------------------------------------------
|
| De dónde sale cada dato (modelos de Odoo, solo lectura):
|
|  - fraction.loteamiento → fracciones. `name` es el código (texto con
|    ceros: "033"), `name_fraction` el nombre comercial, `district_code`
|    la ciudad (texto libre) y `branch_id` la sucursal. Solo se toman las
|    de `situation = active`.
|  - loteamiento.lote → lotes. `name` es la terna FML "FFF/MMM/LLLL"
|    (ej. "236/003/0008"): es la clave con la que se cruza contra el plano
|    KMZ. Se parsea a enteros, así "033/004/0011" y la fracción 33,
|    manzana 4, lote 11 del plano son el mismo lote. `superficie` en m²,
|    `stage_id` el estado.
|  - lote.stage → estados. Ver estadoWeb(): el estado de Odoo se reduce a
|    LIBRE / RESERVADO / VENDIDO / NO DISPONIBLE, que son los que pinta el
|    mapa (colores en la tabla lotes_colores).
|  - pricelist.lote → precios por lote: contado (`cash_price`), cuota
|    (`month_price`) y cantidad de cuotas (`quota_quantity`), con vigencia
|    date_start/date_end. Un lote puede tener más de una lista (una promo
|    hasta fin de año y la del año siguiente): se usa la VIGENTE HOY en
|    Paraguay y, si hay dos vigentes a la vez, la que empezó más tarde.
|
| Odoo no tiene "entrega" ni "precio a crédito": entrega va en 0 y el
| precio a crédito es cuota × cantidad de cuotas.
|
| Configuración: ERP_DRIVER=odoo + ODOO_URL, ODOO_DB, ODOO_LOGIN y
| ODOO_API_KEY (la clave solo en el .env del servidor).
|
*/

import logger from '@adonisjs/core/services/logger'

import type OdooClient from '#repositories/erp/odoo_client'
import { type DominioOdoo } from '#repositories/erp/odoo_client'
import LotesErpRepository, {
  type DistritoResumen,
  type FiltroFracciones,
  type FraccionResumen,
  type LoteErp,
} from '#repositories/erp/lotes_erp_repository'

/* -------------------------------------------------------------------------
 | Filas tal como las devuelve Odoo (many2one = [id, nombre] | false)
 * ---------------------------------------------------------------------- */

type Many2one = [number, string] | false

export interface FraccionOdoo {
  id: number
  name: string
  name_fraction: string | false
  district_code: string | false
  branch_id: Many2one
}

export interface LoteOdoo {
  id: number
  name: string | false
  loteamiento_id: Many2one
  stage_id: Many2one
  superficie: number | false
}

export interface EtapaOdoo {
  id: number
  name: string
  disponible: boolean
  sale_state: boolean
  is_closed_state: boolean
}

export interface PrecioOdoo {
  id: number
  lote_id: Many2one
  cash_price: number | false
  month_price: number | false
  quota_quantity: number | false
  date_start: string | false
  date_end: string | false
}

/* -------------------------------------------------------------------------
 | Reglas de negocio puras (testeables sin Odoo)
 * ---------------------------------------------------------------------- */

export interface Fml {
  fraccion: number
  manzana: number
  lote: number
}

/**
 * Parsea la terna FML de `loteamiento.lote.name` ("236/003/0008").
 * Devuelve null si no tiene el formato esperado.
 */
export function parseFml(nombre: string | false | null | undefined): Fml | null {
  if (!nombre) return null
  const partes = /^\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(nombre)
  if (!partes) return null
  return { fraccion: Number(partes[1]), manzana: Number(partes[2]), lote: Number(partes[3]) }
}

export const ESTADOS_WEB = {
  libre: 'LIBRE',
  reservado: 'RESERVADO',
  vendido: 'VENDIDO',
  noDisponible: 'NO DISPONIBLE',
} as const

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Reduce el estado de Odoo a los cuatro que muestra la web:
 *  - LIBRE: etapas marcadas "Disponible" en Odoo (hoy solo "Libre").
 *  - RESERVADO: cualquier etapa con "reserv" en el nombre ("Reservado
 *    portal (24 h)", "Reserva del propietario", "Reservado por sucesión").
 *  - VENDIDO: "Vendido / En Proceso" (estado de venta) y "Cancelado"
 *    (etapa final: el lote ya está pagado).
 *  - NO DISPONIBLE: el resto (judicializado, bloqueado, anulado, fuera de
 *    administración, espacio público, plaza...).
 */
export function estadoWeb(etapa: EtapaOdoo | undefined): string {
  if (!etapa) return ESTADOS_WEB.noDisponible
  if (etapa.disponible) return ESTADOS_WEB.libre
  const nombre = sinTildes(etapa.name).toLowerCase()
  if (nombre.includes('reserv')) return ESTADOS_WEB.reservado
  if (etapa.sale_state || etapa.is_closed_state || nombre.includes('vendido')) {
    return ESTADOS_WEB.vendido
  }
  return ESTADOS_WEB.noDisponible
}

/** Fecha de hoy (YYYY-MM-DD) en Paraguay, que es como guarda Odoo las fechas */
export function hoyEnParaguay(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(ahora)
}

/**
 * Lista de precios vigente en `hoy` entre las de un lote: la que está
 * dentro de su vigencia y, si hay varias, la que empezó más tarde.
 */
export function precioVigente(precios: PrecioOdoo[], hoy: string): PrecioOdoo | null {
  let elegido: PrecioOdoo | null = null
  for (const precio of precios) {
    if (precio.date_start && precio.date_start > hoy) continue
    if (precio.date_end && precio.date_end < hoy) continue
    if (
      !elegido ||
      (precio.date_start || '') > (elegido.date_start || '') ||
      ((precio.date_start || '') === (elegido.date_start || '') && precio.id > elegido.id)
    ) {
      elegido = precio
    }
  }
  return elegido
}

/** Clave de un distrito (sin tildes, mayúsculas, espacios simples) */
function claveDistrito(nombre: string): string {
  return sinTildes(nombre).toUpperCase().replace(/\s+/g, ' ').trim()
}

/**
 * Código numérico ESTABLE de un distrito. Odoo guarda el distrito como
 * texto libre en la fracción ("Minga Guazu", "MINGA GUAZU"), sin código:
 * se deriva un hash FNV-1a de la clave normalizada, así el código no
 * cambia entre reinicios ni cuando se agregan fracciones nuevas.
 */
export function codigoDistrito(nombre: string): number {
  let hash = 0x811c9dc5
  for (const caracter of claveDistrito(nombre)) {
    hash ^= caracter.codePointAt(0)!
    hash = Math.imul(hash, 0x01000193)
  }
  /* Positivo y dentro de un integer de Postgres. */
  return (hash >>> 0) % 2_000_000_000
}

/** "MINGA GUAZU" → "Minga Guazu"; si ya viene con mayúsculas y minúsculas, se respeta */
function nombreVisible(nombre: string): string {
  const limpio = nombre.replace(/\s+/g, ' ').trim()
  if (limpio !== limpio.toUpperCase()) return limpio
  return limpio
    .toLowerCase()
    .replace(/(^|[\s(/-])(\p{L})/gu, (_, sep, letra) => sep + letra.toUpperCase())
}

/**
 * Limpia el texto libre de la ciudad: saca el padrón que a veces viene
 * pegado ("Cambyreta Padron N° 5311", "Hohenau (Padron N° 690)") y
 * expande "Pte" → "Presidente", para no partir un distrito en dos.
 */
export function limpiarDistrito(texto: string): string {
  return nombreVisible(texto)
    .replace(/\(?\s*padr[oó]n\b.*$/i, '')
    .replace(/^pte\.?\s+/i, 'Presidente ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Distrito de una fracción: la ciudad cargada o, si falta, la sucursal */
function distritoDe(fraccion: FraccionOdoo): string {
  const ciudad =
    typeof fraccion.district_code === 'string' ? limpiarDistrito(fraccion.district_code) : ''
  if (ciudad) return ciudad
  return fraccion.branch_id ? fraccion.branch_id[1] : 'Sin distrito'
}

/* -------------------------------------------------------------------------
 | Snapshot: todas las fracciones activas con sus lotes y precios vigentes
 * ---------------------------------------------------------------------- */

interface FraccionSnapshot {
  odooId: number
  codigo: number
  descripcion: string
  distritoCodigo: number
  distritoNombre: string
  lotes: LoteErp[]
}

export interface Snapshot {
  fracciones: Map<number, FraccionSnapshot>
  /** Lotes que Odoo devolvió con un `name` que no es FML (se descartan) */
  lotesSinFml: string[]
}

/**
 * Arma el snapshot a partir de las filas crudas de Odoo. Pura: los tests
 * la usan con datos armados a mano.
 */
export function armarSnapshot(
  datos: {
    fracciones: FraccionOdoo[]
    lotes: LoteOdoo[]
    etapas: EtapaOdoo[]
    precios: PrecioOdoo[]
  },
  hoy: string
): Snapshot {
  const etapas = new Map(datos.etapas.map((e) => [e.id, e]))

  const preciosPorLote = new Map<number, PrecioOdoo[]>()
  for (const precio of datos.precios) {
    if (!precio.lote_id) continue
    const lista = preciosPorLote.get(precio.lote_id[0]) ?? []
    lista.push(precio)
    preciosPorLote.set(precio.lote_id[0], lista)
  }

  /* El nombre visible del distrito: la primera variante con tildes o
     minúsculas que aparezca ("Encarnación" le gana a "ENCARNACION"). */
  const nombresDistrito = new Map<string, string>()
  for (const fraccion of datos.fracciones) {
    const original = distritoDe(fraccion)
    const clave = claveDistrito(original)
    const actual = nombresDistrito.get(clave)
    const tieneTildes = original !== sinTildes(original)
    if (!actual || (tieneTildes && actual === sinTildes(actual))) {
      nombresDistrito.set(clave, nombreVisible(original))
    }
  }

  const fracciones = new Map<number, FraccionSnapshot>()
  const porOdooId = new Map<number, FraccionSnapshot>()
  for (const fraccion of datos.fracciones) {
    const codigo = Number(fraccion.name)
    if (!Number.isInteger(codigo)) continue
    const distrito = distritoDe(fraccion)
    const snapshot: FraccionSnapshot = {
      odooId: fraccion.id,
      codigo,
      descripcion: (fraccion.name_fraction || `Fracción ${codigo}`).trim(),
      distritoCodigo: codigoDistrito(distrito),
      distritoNombre: nombresDistrito.get(claveDistrito(distrito)) ?? distrito,
      lotes: [],
    }
    fracciones.set(codigo, snapshot)
    porOdooId.set(fraccion.id, snapshot)
  }

  const lotesSinFml: string[] = []
  for (const lote of datos.lotes) {
    const fml = parseFml(lote.name)
    if (!fml) {
      lotesSinFml.push(`${lote.name || '(sin código)'} [id ${lote.id}]`)
      continue
    }
    const fraccion =
      (lote.loteamiento_id && porOdooId.get(lote.loteamiento_id[0])) || fracciones.get(fml.fraccion)
    if (!fraccion) continue

    const precio = precioVigente(preciosPorLote.get(lote.id) ?? [], hoy)
    const cuota = Number(precio?.month_price || 0)
    const cuotas = Number(precio?.quota_quantity || 0)

    fraccion.lotes.push({
      fraccionCodigo: fraccion.codigo,
      manzanaCodigo: fml.manzana,
      loteCodigo: fml.lote,
      estado: estadoWeb(lote.stage_id ? etapas.get(lote.stage_id[0]) : undefined),
      superficie: Math.round(Number(lote.superficie || 0)),
      cantidadCuotas: cuotas,
      importeCuota: cuota,
      entrega: 0,
      precioCredito: cuota * cuotas,
      precioContado: Number(precio?.cash_price || 0),
    })
  }

  for (const fraccion of fracciones.values()) {
    fraccion.lotes.sort((a, b) => a.manzanaCodigo - b.manzanaCodigo || a.loteCodigo - b.loteCodigo)
  }

  return { fracciones, lotesSinFml }
}

/* -------------------------------------------------------------------------
 | Repositorio
 * ---------------------------------------------------------------------- */

const CAMPOS_FRACCION = ['name', 'name_fraction', 'district_code', 'branch_id']
const CAMPOS_LOTE = ['name', 'loteamiento_id', 'stage_id', 'superficie']
const CAMPOS_ETAPA = ['name', 'disponible', 'sale_state', 'is_closed_state']
const CAMPOS_PRECIO = [
  'lote_id',
  'cash_price',
  'month_price',
  'quota_quantity',
  'date_start',
  'date_end',
]

/** Las etapas archivadas en Odoo igual pueden estar asignadas a lotes */
const CON_ARCHIVADOS = { active_test: false }

export default class OdooLotesErpRepository extends LotesErpRepository {
  #odoo: OdooClient
  #ttlSnapshotMs: number
  #snapshot: { expira: number; valor: Promise<Snapshot> } | null = null

  constructor(odoo: OdooClient, opciones: { ttlSnapshotMs?: number } = {}) {
    super()
    this.#odoo = odoo
    this.#ttlSnapshotMs = opciones.ttlSnapshotMs ?? 60_000
  }

  /** Dominio de precios vigentes hoy (el filtro fino lo hace precioVigente) */
  #dominioPrecios(hoy: string, dominioLote: DominioOdoo): DominioOdoo {
    return [
      ['active', '=', true],
      '|',
      ['date_start', '=', false],
      ['date_start', '<=', hoy],
      '|',
      ['date_end', '=', false],
      ['date_end', '>=', hoy],
      ...dominioLote,
    ]
  }

  async #cargar(dominioFracciones: DominioOdoo): Promise<Snapshot> {
    const hoy = hoyEnParaguay()
    const fracciones = await this.#odoo.searchReadTodo<FraccionOdoo>(
      'fraction.loteamiento',
      [['situation', '=', 'active'], ...dominioFracciones],
      CAMPOS_FRACCION
    )
    const ids = fracciones.map((f) => f.id)
    if (ids.length === 0) return { fracciones: new Map(), lotesSinFml: [] }

    const [lotes, etapas, precios] = await Promise.all([
      this.#odoo.searchReadTodo<LoteOdoo>(
        'loteamiento.lote',
        [['loteamiento_id', 'in', ids]],
        CAMPOS_LOTE
      ),
      this.#odoo.searchReadTodo<EtapaOdoo>('lote.stage', [], CAMPOS_ETAPA, {
        contexto: CON_ARCHIVADOS,
      }),
      this.#odoo.searchReadTodo<PrecioOdoo>(
        'pricelist.lote',
        this.#dominioPrecios(hoy, [['lote_id.loteamiento_id', 'in', ids]]),
        CAMPOS_PRECIO
      ),
    ])

    const snapshot = armarSnapshot({ fracciones, lotes, etapas, precios }, hoy)
    if (snapshot.lotesSinFml.length > 0) {
      logger.warn(
        { cantidad: snapshot.lotesSinFml.length, ejemplos: snapshot.lotesSinFml.slice(0, 10) },
        'Odoo: lotes con código que no es FML (FFF/MMM/LLLL), se ignoran'
      )
    }
    return snapshot
  }

  /** Snapshot completo, memoizado (y compartido entre llamadas concurrentes) */
  #snapshotCompleto(): Promise<Snapshot> {
    if (this.#snapshot && this.#snapshot.expira > Date.now()) return this.#snapshot.valor
    const valor = this.#cargar([])
    this.#snapshot = { expira: Date.now() + this.#ttlSnapshotMs, valor }
    valor.catch(() => {
      this.#snapshot = null
    })
    return valor
  }

  /** Vacía el snapshot (para forzar una lectura nueva de Odoo) */
  flush(): void {
    this.#snapshot = null
  }

  async buscarFracciones(filtro: FiltroFracciones = {}): Promise<FraccionResumen[]> {
    const { fracciones } = await this.#snapshotCompleto()
    const texto = filtro.texto ? sinTildes(filtro.texto).toUpperCase() : null
    const resultado: FraccionResumen[] = []

    for (const fraccion of fracciones.values()) {
      if (filtro.fraccionDesde !== undefined && fraccion.codigo < filtro.fraccionDesde) continue
      if (filtro.fraccionHasta !== undefined && fraccion.codigo > filtro.fraccionHasta) continue
      if (filtro.distrito !== undefined && fraccion.distritoCodigo !== filtro.distrito) continue
      if (
        texto &&
        !sinTildes(fraccion.descripcion).toUpperCase().includes(texto) &&
        !sinTildes(fraccion.distritoNombre).toUpperCase().includes(texto)
      ) {
        continue
      }

      const filtraCuota = filtro.cuotaDesde !== undefined || filtro.cuotaHasta !== undefined
      const lotes = fraccion.lotes.filter((lote) => {
        if (filtro.soloLibres && lote.estado !== ESTADOS_WEB.libre) return false
        if (filtraCuota && lote.importeCuota <= 0) return false
        if (filtro.cuotaDesde !== undefined && lote.importeCuota < filtro.cuotaDesde) return false
        if (filtro.cuotaHasta !== undefined && lote.importeCuota > filtro.cuotaHasta) return false
        return true
      })
      if (lotes.length === 0) continue

      const cuotas = lotes.map((l) => l.importeCuota).filter((c) => c > 0)
      resultado.push({
        codigo: fraccion.codigo,
        descripcion: fraccion.descripcion,
        distritoCodigo: fraccion.distritoCodigo,
        distritoNombre: fraccion.distritoNombre,
        disponibles: lotes.filter((l) => l.estado === ESTADOS_WEB.libre).length,
        cuotaMinima: cuotas.length ? Math.min(...cuotas) : 0,
        cuotaMaxima: cuotas.length ? Math.max(...cuotas) : 0,
      })
    }

    return resultado.sort((a, b) => b.codigo - a.codigo)
  }

  /**
   * Lotes de UNA fracción, leídos en el momento (no del snapshot): es lo
   * que alimenta el mapa y la validación de "lote libre" al pedir compra,
   * así que tiene que reflejar Odoo al instante (el decorator de cache
   * igual lo memoiza 60 s).
   */
  async lotesPorFraccion(fraccionCodigo: number): Promise<LoteErp[]> {
    /* El código de fracción en Odoo es texto con ceros ("033"): se busca
       por id a partir del snapshot, y si no está, por los dos formatos. */
    const snapshot = this.#snapshot ? await this.#snapshot.valor.catch(() => null) : null
    const conocida = snapshot?.fracciones.get(fraccionCodigo)
    const dominio: DominioOdoo = conocida
      ? [['id', '=', conocida.odooId]]
      : [['name', 'in', [String(fraccionCodigo), String(fraccionCodigo).padStart(3, '0')]]]

    const { fracciones } = await this.#cargar(dominio)
    return fracciones.get(fraccionCodigo)?.lotes ?? []
  }

  async precioLote(
    fraccionCodigo: number,
    manzanaCodigo: number,
    loteCodigo: number
  ): Promise<LoteErp | null> {
    const lotes = await this.lotesPorFraccion(fraccionCodigo)
    return (
      lotes.find((l) => l.manzanaCodigo === manzanaCodigo && l.loteCodigo === loteCodigo) ?? null
    )
  }

  async distritos(): Promise<DistritoResumen[]> {
    const { fracciones } = await this.#snapshotCompleto()
    const porCodigo = new Map<number, DistritoResumen>()

    for (const fraccion of fracciones.values()) {
      const distrito = porCodigo.get(fraccion.distritoCodigo) ?? {
        codigo: fraccion.distritoCodigo,
        nombre: fraccion.distritoNombre,
        fracciones: 0,
        lotesLibres: 0,
        cuotaMinima: 0,
      }
      distrito.fracciones++
      for (const lote of fraccion.lotes) {
        if (lote.estado !== ESTADOS_WEB.libre) continue
        distrito.lotesLibres++
        if (
          lote.importeCuota > 0 &&
          (distrito.cuotaMinima === 0 || lote.importeCuota < distrito.cuotaMinima)
        ) {
          distrito.cuotaMinima = lote.importeCuota
        }
      }
      porCodigo.set(distrito.codigo, distrito)
    }

    return [...porCodigo.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }
}
