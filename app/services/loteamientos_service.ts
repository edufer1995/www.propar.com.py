/*
|--------------------------------------------------------------------------
| Servicio de la pantalla /loteamientos (Etapa 4b)
|--------------------------------------------------------------------------
|
| Une las dos fuentes de datos del mapa:
|  - PostgreSQL: geometrías (fracciones, manzanas, lotes, lotes_colores)
|  - ERP (LotesErpRepository): datos comerciales por lote (estado, precios)
|
| El detalle de una fracción se resuelve con 3 queries SQL fijas
| (fracción+manzanas con join, lotes, colores) + 1 llamada al ERP, y se
| une en memoria por la terna f|m|l. Reemplaza el N+1 del sitio viejo
| (1 + 532 + 7.778 queries).
|
*/

import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'

import { claveEstado } from '#services/estados_lote'

import LoteColor from '#models/lote_color'
import Fraccion from '#models/fraccion'
import Upload from '#models/upload'
import LotesErpRepository, {
  type FiltroFracciones,
  type LoteErp,
} from '#repositories/erp/lotes_erp_repository'

export interface PuntoLatLng {
  lat: number
  lng: number
}

/** Fracción del listado/mapa: resumen comercial del ERP + centro de PG. */
export interface FraccionMapa {
  codigo: number
  descripcion: string
  distritoCodigo: number
  distritoNombre: string
  disponibles: number
  cuotaMinima: number
  centro: PuntoLatLng
  /** Primera foto de la galería (card de la tira), si tiene */
  portadaUrl: string | null
  /** Fotos + videos cargados (para mostrar el acceso a la galería) */
  totalMedios: number
}

/** Anillo GeoJSON: [[lng, lat], ...] cerrado (primer punto == último). */
export type AnilloGeoJson = [number, number][]

export interface PropiedadesLote {
  tipo: 'lote'
  /** Clave visible F-M-L, ej. "81-1-7" */
  fml: string
  fraccionCodigo: number
  manzanaCodigo: number
  loteCodigo: number
  /** Estado del ERP; null si el ERP no conoce el lote */
  estado: string | null
  /** Color hex según lotes_colores (gris si no hay estado) */
  color: string
  superficie: number | null
  cuotas: number | null
  importeCuota: number | null
  precioCredito: number | null
  centro: PuntoLatLng | null
}

export interface PropiedadesManzana {
  tipo: 'manzana'
  codigo: number
  centro: PuntoLatLng | null
}

export interface FeatureLoteamiento {
  type: 'Feature'
  properties: PropiedadesLote | PropiedadesManzana
  geometry: { type: 'Polygon'; coordinates: AnilloGeoJson[] }
}

export interface DetalleFraccion {
  fraccion: {
    codigo: number
    descripcion: string
    centro: PuntoLatLng | null
    /** URLs de la galería (lightbox del mapa) */
    medios: { fotos: string[]; videos: string[] }
  }
  /** Centros de manzana para los overlays de código (banda de zoom >= 16) */
  manzanas: { codigo: number; centro: PuntoLatLng | null }[]
  /** FeatureCollection listo para map.data.addGeoJson (manzanas + lotes) */
  geojson: { type: 'FeatureCollection'; features: FeatureLoteamiento[] }
}

const COLOR_SIN_ESTADO = '#808080'

/**
 * Estados que el ERP mandó y no están en `lotes_colores`. Se avisa una
 * sola vez por estado (por proceso) para no inundar el log: es el
 * diagnóstico de por qué un lote sale gris — el texto exacto que manda el
 * ERP queda registrado y se puede dar de alta en /app/colores.
 */
const estadosAvisados = new Set<string>()

/**
 * Fracciones ya avisadas: un log por fracción y por proceso.
 */
const fraccionesAvisadas = new Set<number>()

/**
 * "SIN DATOS" en el mapa no es un problema de colores: es un lote que
 * existe en nuestra geometría y que el ERP no devolvió para esa fracción.
 * Puede ser que el ERP no lo tenga cargado (una plaza o un edificio
 * público pueden no estar como lote), o
 * que la terna manzana|lote no coincida. Se registra el recuento para
 * poder distinguirlo del cruce de colores, que es otro problema.
 */
function avisarLotesSinErp(fraccion: number, sinErp: number, enGeometria: number, delErp: number) {
  if (sinErp === 0 || fraccionesAvisadas.has(fraccion)) return
  fraccionesAvisadas.add(fraccion)
  logger.warn(
    { fraccion, sinErp, enGeometria, delErp },
    'Lotes sin dato del ERP: se dibujan como SIN DATOS. Revisar si la vista del ERP los incluye.'
  )
}

function avisarEstadoSinColor(estado: string) {
  const clave = claveEstado(estado)
  if (estadosAvisados.has(clave)) return
  estadosAvisados.add(clave)
  logger.warn(
    { estado, clave },
    'Estado de lote sin color en lotes_colores: el lote se pinta gris. Darlo de alta en /app/colores.'
  )
}

/** Convierte los anillos guardados en PG ([[{lat,lng}]]) a GeoJSON cerrado. */
function anillosGeoJson(coordeLados: unknown): AnilloGeoJson[] {
  if (!Array.isArray(coordeLados)) return []

  const anillos: AnilloGeoJson[] = []
  for (const anillo of coordeLados) {
    if (!Array.isArray(anillo) || anillo.length < 3) continue
    const puntos: AnilloGeoJson = anillo
      .filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p) => [p.lng, p.lat] as [number, number])
    if (puntos.length < 3) continue

    // GeoJSON exige el anillo cerrado
    const [primero] = puntos
    const ultimo = puntos[puntos.length - 1]
    if (primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) puntos.push([...primero])
    anillos.push(puntos)
  }
  return anillos
}

function centroDe(valor: unknown): PuntoLatLng | null {
  const v = valor as { lat?: unknown; lng?: unknown } | null
  if (!v || typeof v.lat !== 'number' || typeof v.lng !== 'number') return null
  return { lat: v.lat, lng: v.lng }
}

@inject()
export default class LoteamientosService {
  constructor(private erp: LotesErpRepository) {}

  /**
   * Fracciones que cumplen el filtro (ERP) unidas con su centro (PG).
   * Fracciones sin coordenadas quedan fuera del mapa.
   *
   * SIN soloLibres a propósito: igual que el sitio viejo, el mapa muestra
   * también las fracciones sin lotes LIBRES (vendidas, reservadas, etc.).
   * `disponibles` sí cuenta solo los LIBRES, así la card puede decir
   * "sin lotes libres" cuando da 0.
   */
  async fraccionesFiltradas(filtro: FiltroFracciones): Promise<FraccionMapa[]> {
    const [resumen, filas] = await Promise.all([
      this.erp.buscarFracciones({ ...filtro }),
      Fraccion.query().select('codigo', 'coordeCentro', 'imagenes', 'videos'),
    ])

    const centros = new Map(filas.map((f) => [f.codigo, centroDe(f.coordeCentro)]))

    /* Portadas: primer id de imagen por fracción, resueltos en UN lote. */
    const medios = new Map(
      filas.map((f) => {
        const imagenes = Array.isArray(f.imagenes) ? (f.imagenes as number[]) : []
        const videos = Array.isArray(f.videos) ? (f.videos as number[]) : []
        return [
          f.codigo,
          { portadaId: imagenes[0] ?? null, total: imagenes.length + videos.length },
        ]
      })
    )
    const portadaIds = [...medios.values()]
      .map((m) => m.portadaId)
      .filter((id): id is number => id !== null)
    const uploads = portadaIds.length ? await Upload.findMany([...new Set(portadaIds)]) : []
    const urls = new Map(uploads.map((u) => [u.id, `/api/file/public/${u.link}`]))

    const resultado: FraccionMapa[] = []
    for (const f of resumen) {
      const centro = centros.get(f.codigo)
      if (!centro) continue
      const medio = medios.get(f.codigo)
      resultado.push({
        codigo: f.codigo,
        descripcion: f.descripcion,
        distritoCodigo: f.distritoCodigo,
        distritoNombre: f.distritoNombre,
        disponibles: f.disponibles,
        cuotaMinima: f.cuotaMinima,
        centro,
        portadaUrl: medio?.portadaId ? (urls.get(medio.portadaId) ?? null) : null,
        totalMedios: medio?.total ?? 0,
      })
    }
    return resultado
  }

  /**
   * Detalle de una fracción: geometrías (3 queries fijas) + comercial
   * (1 llamada ERP), unidos en memoria por manzana|lote.
   * Devuelve null si la fracción no existe en PG.
   */
  async detalleFraccion(codigo: number): Promise<DetalleFraccion | null> {
    // Query 1: fracción + sus manzanas en un solo join (left: una fracción
    // sin manzanas igual devuelve su fila).
    const filas = await db
      .from('fracciones')
      .leftJoin('manzanas', 'manzanas.fraccion_id', 'fracciones.id')
      .where('fracciones.codigo', codigo)
      .select(
        'fracciones.descripcion as fraccionDescripcion',
        'fracciones.coorde_centro as fraccionCentro',
        'fracciones.imagenes as fraccionImagenes',
        'fracciones.videos as fraccionVideos',
        'manzanas.codigo as manzanaCodigo',
        'manzanas.coorde_centro as manzanaCentro',
        'manzanas.coorde_lados as manzanaLados'
      )
      .orderBy('manzanas.codigo', 'asc')

    if (filas.length === 0) return null

    // Query 2: todos los lotes de la fracción (índice por fraccion_codigo).
    const lotes = await db
      .from('lotes')
      .where('fraccion_codigo', codigo)
      .select('manzana_codigo as manzanaCodigo', 'codigo', 'coorde_centro', 'coorde_lados')
      .orderBy('manzana_codigo', 'asc')
      .orderBy('codigo', 'asc')

    /**
     * Query 3: catálogo de colores por estado. Se indexa por la clave
     * normalizada (ver #services/estados_lote): el ERP y esta tabla son
     * sistemas distintos y escriben el mismo estado con diferencias de
     * relleno, mayúsculas, tildes y espaciado.
     */
    const colores = await LoteColor.query().select('estado', 'color')
    const catalogoPorClave = new Map(colores.map((c) => [claveEstado(c.estado), c]))

    // 1 llamada al ERP con todos los lotes de la fracción.
    const lotesErp = await this.erp.lotesPorFraccion(codigo)
    const erpPorClave = new Map<string, LoteErp>(
      lotesErp.map((l) => [`${l.manzanaCodigo}|${l.loteCodigo}`, l])
    )

    /* Lotes que están en la geometría pero el ERP no devolvió: son los que
       terminan en "SIN DATOS" (ver #avisarLotesSinErp). */
    let sinErp = 0

    const features: FeatureLoteamiento[] = []
    const manzanas: DetalleFraccion['manzanas'] = []

    for (const fila of filas) {
      if (fila.manzanaCodigo === null) continue
      const centro = centroDe(fila.manzanaCentro)
      manzanas.push({ codigo: Number(fila.manzanaCodigo), centro })

      const anillos = anillosGeoJson(fila.manzanaLados)
      if (anillos.length === 0) continue
      features.push({
        type: 'Feature',
        properties: { tipo: 'manzana', codigo: Number(fila.manzanaCodigo), centro },
        geometry: { type: 'Polygon', coordinates: anillos },
      })
    }

    for (const lote of lotes) {
      const anillos = anillosGeoJson(lote.coorde_lados)
      if (anillos.length === 0) continue

      const erp = erpPorClave.get(`${lote.manzanaCodigo}|${lote.codigo}`)
      if (!erp) sinErp++

      /**
       * El ERP puede mandar '' (no solo null). Ese caso es "sin datos";
       * si manda algo que el catálogo no tiene, se muestra el texto tal
       * cual en gris (así el estado desconocido se VE, en vez de quedar
       * como un chip vacío) y se avisa por log una única vez.
       */
      const bruto = erp?.estado?.trim() ?? ''
      const enCatalogo = bruto ? catalogoPorClave.get(claveEstado(bruto)) : undefined
      if (bruto && !enCatalogo) avisarEstadoSinColor(bruto)
      /* Se muestra la escritura del catálogo: la leyenda y las cards coinciden. */
      const estado = enCatalogo?.estado ?? (bruto || null)

      features.push({
        type: 'Feature',
        properties: {
          tipo: 'lote',
          fml: `${codigo}-${lote.manzanaCodigo}-${lote.codigo}`,
          fraccionCodigo: codigo,
          manzanaCodigo: Number(lote.manzanaCodigo),
          loteCodigo: Number(lote.codigo),
          estado,
          color: enCatalogo?.color ?? COLOR_SIN_ESTADO,
          superficie: erp?.superficie ?? null,
          cuotas: erp?.cantidadCuotas ?? null,
          importeCuota: erp?.importeCuota ?? null,
          precioCredito: erp?.precioCredito ?? null,
          centro: centroDe(lote.coorde_centro),
        },
        geometry: { type: 'Polygon', coordinates: anillos },
      })
    }

    avisarLotesSinErp(codigo, sinErp, lotes.length, lotesErp.length)

    /* Medios de la galería: ids ordenados → URLs públicas, en UN lote. */
    const idsFotos: number[] = Array.isArray(filas[0].fraccionImagenes)
      ? filas[0].fraccionImagenes
      : []
    const idsVideos: number[] = Array.isArray(filas[0].fraccionVideos)
      ? filas[0].fraccionVideos
      : []
    const idsMedios = [...new Set([...idsFotos, ...idsVideos])]
    const uploads = idsMedios.length ? await Upload.findMany(idsMedios) : []
    const urlPorId = new Map(uploads.map((u) => [u.id, `/api/file/public/${u.link}`]))
    const aUrls = (ids: number[]) =>
      ids.map((id) => urlPorId.get(id)).filter((u): u is string => Boolean(u))

    return {
      fraccion: {
        codigo,
        descripcion: String(filas[0].fraccionDescripcion ?? `Fracción ${codigo}`),
        centro: centroDe(filas[0].fraccionCentro),
        medios: { fotos: aUrls(idsFotos), videos: aUrls(idsVideos) },
      },
      manzanas,
      geojson: { type: 'FeatureCollection', features },
    }
  }
}
