/*
|--------------------------------------------------------------------------
| Validación en cliente de los .geojson de planos (admin)
|--------------------------------------------------------------------------
|
| Espejo de las reglas del server (PlanosImportService): FeatureCollection
| de Polygons con properties.MZ (manzanas y lotes), properties.LT (lotes)
| y centroide WKT "POINT(lng lat)" opcional en properties.centroid.
|
| La validación de cliente es UX (mensajes inmediatos + preview antes de
| guardar): el server re-valida todo al importar.
|
*/

export type TipoArchivoPlano = 'fraccion' | 'manzanas' | 'lotes'

export interface PuntoLatLng {
  lat: number
  lng: number
}

export interface FeaturePlanoCliente {
  centro: PuntoLatLng
  /** Anillos GeoJSON [[lng, lat], …] tal como vienen del archivo */
  anillos: [number, number][][]
  mz: number | null
  lt: number | null
}

export const PESO_MAXIMO_GEOJSON = 2 * 1024 * 1024

const NOMBRE_POR_TIPO: Record<TipoArchivoPlano, string> = {
  fraccion: 'fracción',
  manzanas: 'manzanas',
  lotes: 'lotes',
}

function esLatLngValido(punto: PuntoLatLng): boolean {
  return (
    Number.isFinite(punto.lat) &&
    Number.isFinite(punto.lng) &&
    Math.abs(punto.lat) <= 90 &&
    Math.abs(punto.lng) <= 180
  )
}

function parseCentroidWkt(valor: unknown): PuntoLatLng | null {
  if (typeof valor !== 'string') return null
  const match = valor.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i)
  if (!match) return null
  const punto = { lng: Number(match[1]), lat: Number(match[2]) }
  return esLatLngValido(punto) ? punto : null
}

function centroDeAnillo(anillo: [number, number][]): PuntoLatLng {
  const suma = anillo.reduce(
    (acumulado, [lng, lat]) => ({ lat: acumulado.lat + lat, lng: acumulado.lng + lng }),
    { lat: 0, lng: 0 }
  )
  return { lat: suma.lat / anillo.length, lng: suma.lng / anillo.length }
}

function enteroPositivo(valor: unknown): number | null {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * Valida y normaliza un .geojson del plano. Lanza Error con mensaje en
 * español listo para mostrarse inline.
 */
export function parsearGeoJsonPlano(
  contenido: string,
  tipo: TipoArchivoPlano
): FeaturePlanoCliente[] {
  const nombre = NOMBRE_POR_TIPO[tipo]

  let crudo: unknown
  try {
    crudo = JSON.parse(contenido)
  } catch {
    throw new Error(`El archivo de ${nombre} no es un JSON válido`)
  }

  const coleccion = crudo as { type?: unknown; features?: unknown }
  if (coleccion?.type !== 'FeatureCollection' || !Array.isArray(coleccion.features)) {
    throw new Error(`El archivo de ${nombre} debe ser un FeatureCollection GeoJSON`)
  }
  if (coleccion.features.length === 0) {
    throw new Error(`El archivo de ${nombre} no tiene features`)
  }

  const resultado: FeaturePlanoCliente[] = []

  for (const [indice, crudoFeature] of coleccion.features.entries()) {
    const feature = crudoFeature as {
      geometry?: { type?: unknown; coordinates?: unknown }
      properties?: Record<string, unknown>
    }
    const posicion = `feature ${indice + 1}`

    if (feature?.geometry?.type !== 'Polygon' || !Array.isArray(feature.geometry.coordinates)) {
      throw new Error(`La ${posicion} de ${nombre} no tiene una geometría Polygon`)
    }

    const anillos: [number, number][][] = []
    for (const anilloCrudo of feature.geometry.coordinates) {
      if (!Array.isArray(anilloCrudo) || anilloCrudo.length < 3) {
        throw new Error(`La ${posicion} de ${nombre} tiene un anillo con menos de 3 vértices`)
      }
      const anillo: [number, number][] = []
      for (const par of anilloCrudo) {
        if (!Array.isArray(par) || par.length < 2) {
          throw new Error(`La ${posicion} de ${nombre} tiene coordenadas mal formadas`)
        }
        const punto = { lng: Number(par[0]), lat: Number(par[1]) }
        if (!esLatLngValido(punto)) {
          throw new Error(`La ${posicion} de ${nombre} tiene coordenadas fuera de rango`)
        }
        anillo.push([punto.lng, punto.lat])
      }
      anillos.push(anillo)
    }

    const propiedades = feature.properties ?? {}
    const mz = enteroPositivo(propiedades.MZ)
    const lt = enteroPositivo(propiedades.LT)

    if (tipo !== 'fraccion' && mz === null) {
      throw new Error(`La ${posicion} de ${nombre} no tiene properties.MZ (número de manzana)`)
    }
    if (tipo === 'lotes' && lt === null) {
      throw new Error(`La ${posicion} de ${nombre} no tiene properties.LT (número de lote)`)
    }

    const centro = parseCentroidWkt(propiedades.centroid) ?? centroDeAnillo(anillos[0])
    resultado.push({ centro, anillos, mz, lt })
  }

  if (tipo === 'fraccion' && resultado.length !== 1) {
    throw new Error(
      `El archivo de fracción debe tener exactamente 1 feature (tiene ${resultado.length})`
    )
  }

  return resultado
}

/** Color de preview (aún sin datos del ERP) */
const COLOR_PREVIEW_LOTE = '#99CD68'

/**
 * Arma el FeatureCollection de previsualización (mismo shape que el
 * detalle público) con lo parseado de los 3 archivos, SIN persistir.
 */
export function geojsonDePreview(
  fraccion: FeaturePlanoCliente[],
  manzanas: FeaturePlanoCliente[],
  lotes: FeaturePlanoCliente[]
) {
  const features = [
    ...fraccion.map((f) => ({
      type: 'Feature' as const,
      properties: { tipo: 'fraccion' },
      geometry: { type: 'Polygon' as const, coordinates: f.anillos },
    })),
    ...manzanas.map((m) => ({
      type: 'Feature' as const,
      properties: { tipo: 'manzana', codigo: m.mz, centro: m.centro },
      geometry: { type: 'Polygon' as const, coordinates: m.anillos },
    })),
    ...lotes.map((l) => ({
      type: 'Feature' as const,
      properties: {
        tipo: 'lote',
        fml: `${l.mz}-${l.lt}`,
        color: COLOR_PREVIEW_LOTE,
        centro: l.centro,
      },
      geometry: { type: 'Polygon' as const, coordinates: l.anillos },
    })),
  ]

  return { type: 'FeatureCollection' as const, features }
}
