/// <reference types="google.maps" />

/**
 * Tipos del mapa de loteamientos: espejo de lo que devuelve el backend
 * (LoteamientosService / LoteamientosController).
 */

export type PuntoLatLng = {
  lat: number
  lng: number
}

export type FraccionMapa = {
  codigo: number
  descripcion: string
  distritoCodigo: number
  distritoNombre: string
  disponibles: number
  cuotaMinima: number
  centro: PuntoLatLng
  /** Primera foto de la galería (portada de la card), si tiene */
  portadaUrl: string | null
  /** Fotos + videos cargados (habilita el acceso a la galería) */
  totalMedios: number
}

export type PropiedadesLote = {
  tipo: 'lote'
  fml: string
  fraccionCodigo: number
  manzanaCodigo: number
  loteCodigo: number
  estado: string | null
  color: string
  superficie: number | null
  cuotas: number | null
  importeCuota: number | null
  precioCredito: number | null
  precioContado: number | null
  centro: PuntoLatLng | null
}

export type PropiedadesManzana = {
  tipo: 'manzana'
  codigo: number
  centro: PuntoLatLng | null
}

export type FeatureLoteamiento = {
  type: 'Feature'
  properties: PropiedadesLote | PropiedadesManzana
  geometry: { type: 'Polygon'; coordinates: [number, number][][] }
}

export type DetalleFraccion = {
  fraccion: {
    codigo: number
    descripcion: string
    centro: PuntoLatLng | null
    medios: { fotos: string[]; videos: string[] }
  }
  manzanas: { codigo: number; centro: PuntoLatLng | null }[]
  geojson: { type: 'FeatureCollection'; features: FeatureLoteamiento[] }
}

/** Features de lote del detalle, en el orden del backend (manzana, lote). */
export function lotesDelDetalle(
  detalle: DetalleFraccion
): (FeatureLoteamiento & { properties: PropiedadesLote })[] {
  return detalle.geojson.features.filter(
    (f): f is FeatureLoteamiento & { properties: PropiedadesLote } => f.properties.tipo === 'lote'
  )
}

export type OpcionDistrito = {
  codigo: number
  nombre: string
}

export type ColorEstado = {
  estado: string
  color: string
}

export type FiltrosLoteamientos = {
  texto: string
  rango: string
  distrito: string
  fraccion: string
}
