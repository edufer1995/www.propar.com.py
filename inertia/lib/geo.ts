/**
 * Helpers de geometría del mapa de loteamientos. Portados 1:1 de
 * getDistance/getMedio del sitio viejo (layout.js), sin formato: acá se
 * devuelven números crudos y el texto lo arma quien muestra.
 */

export interface PuntoLatLng {
  lat: number
  lng: number
}

/** Radio terrestre en km (mismo valor que el sitio viejo). */
const RADIO_TIERRA_KM = 6378.137

function rad(x: number): number {
  return (x * Math.PI) / 180
}

/** Distancia haversine entre dos puntos, en metros. */
export function distanciaMetros(a: PuntoLatLng, b: PuntoLatLng): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  // El viejo redondeaba a 3 decimales en km antes de pasar a metros.
  return Number((RADIO_TIERRA_KM * c).toFixed(3)) * 1000
}

/** Punto medio (promedio simple, igual que el sitio viejo). */
export function puntoMedio(a: PuntoLatLng, b: PuntoLatLng): PuntoLatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }
}

/**
 * Lados de un anillo GeoJSON ([[lng, lat], ...] cerrado): para cada lado
 * devuelve el punto medio y la distancia en metros (etiquetas de medidas
 * al hacer hover sobre un lote).
 */
export function ladosDeAnillo(
  anillo: [number, number][]
): { medio: PuntoLatLng; metros: number }[] {
  const lados: { medio: PuntoLatLng; metros: number }[] = []
  for (let i = 0; i < anillo.length - 1; i++) {
    const a = { lat: anillo[i][1], lng: anillo[i][0] }
    const b = { lat: anillo[i + 1][1], lng: anillo[i + 1][0] }
    lados.push({ medio: puntoMedio(a, b), metros: distanciaMetros(a, b) })
  }
  return lados
}
