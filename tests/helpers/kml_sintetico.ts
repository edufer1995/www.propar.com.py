/**
 * KML sintético con las capas del agrimensor (como los exporta AutoCAD /
 * QGIS: la capa va en <description>): contorno, 2 manzanas con su número
 * y 3 lotes con su número.
 */

type Par = [number, number]

function cuadrado(lat: number, lng: number, delta: number): Par[] {
  return [
    [lng - delta, lat - delta],
    [lng + delta, lat - delta],
    [lng + delta, lat + delta],
    [lng - delta, lat + delta],
    [lng - delta, lat - delta],
  ]
}

const coords = (anillo: Par[]) => anillo.map(([lng, lat]) => `${lng},${lat},0`).join(' ')

function poligono(capa: string, anillo: Par[]) {
  return `<Placemark><description>${capa}</description><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords(anillo)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`
}

function texto(capa: string, nombre: string, lat: number, lng: number) {
  return `<Placemark><name>${nombre}</name><description>${capa}</description><Point><coordinates>${lng},${lat},0</coordinates></Point></Placemark>`
}

export const BASE_KML = { lat: -25.31, lng: -57.43 }

export interface OpcionesKml {
  /** Lote sin número (sin LOTE_TEXT adentro) */
  loteSinNumero?: boolean
  /** Sin contorno de fracción */
  sinPoligono?: boolean
  /** Agrega una plaza y una capa ajena (generan avisos) */
  extras?: boolean
}

export function kmlSintetico(opciones: OpcionesKml = {}): string {
  const { lat, lng } = BASE_KML
  const d = 0.0001
  const marcas = [
    opciones.sinPoligono ? '' : poligono('POLIGONO', cuadrado(lat + 0.001, lng + 0.001, 0.004)),
    // Manzana 1 (romano I) alrededor de (lat, lng); manzana 2 más al norte
    poligono('MAN', cuadrado(lat, lng + 0.0005, 0.0009)),
    texto('MAN_TEXT', 'I', lat, lng + 0.0005),
    poligono('MAN', cuadrado(lat + 0.003, lng, 0.0009)),
    texto('MAN_TEXT', '2', lat + 0.003, lng),
    // Lotes
    poligono('LOTE', cuadrado(lat, lng, d * 3)),
    texto('LOTE_TEXT', '1', lat, lng),
    poligono('LOTE', cuadrado(lat, lng + 0.001, d * 3)),
    opciones.loteSinNumero ? '' : texto('LOTE_TEXT', '2', lat, lng + 0.001),
    poligono('LOTE', cuadrado(lat + 0.003, lng, d * 3)),
    texto('LOTE_TEXT', '1', lat + 0.003, lng),
    opciones.extras ? poligono('PLAZA_Y_EDIF_PUBL', cuadrado(lat + 0.003, lng + 0.0006, d)) : '',
    opciones.extras ? poligono('CALLES', cuadrado(lat - 0.002, lng, d)) : '',
  ]
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>${marcas.join('')}</Document></kml>`
}
