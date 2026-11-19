/*
|--------------------------------------------------------------------------
| Lectura de planos en KMZ / KML (el formato que se subía en la web vieja)
|--------------------------------------------------------------------------
|
| El agrimensor exporta el plano de AutoCAD a KMZ: cada elemento lleva en
| su descripción el nombre de la capa. Se reconocen las mismas capas que
| usaba la web vieja:
|
|   POLIGONO            contorno de la fracción (polígono o polilínea)
|   MAN                 contorno de cada manzana
|   MAN_TEXT            punto con el número de la manzana (va adentro de MAN)
|   LOTE                contorno de cada lote
|   LOTE_TEXT           punto con el número del lote (va adentro de LOTE)
|   PLAZA_Y_EDIF_PUBL   plazas y edificios públicos (no son lotes: se omiten)
|
| Cada lote toma su número del LOTE_TEXT que cae adentro y su manzana de
| la MAN que contiene su centro. Todo lo que no cierra se informa con un
| mensaje concreto (qué elemento, dónde) en vez de importarse a medias.
| Lo que se puede saltear sin romper el plano (plazas, lotes con número
| que no es entero, elementos de otras capas) va como aviso.
|
*/

import JSZip from 'jszip'
import { DOMParser } from '@xmldom/xmldom'
import { kml } from '@tmcw/togeojson'

import type { FeaturePlano, LadosJson, PuntoLatLng } from '#services/planos_import_service'

/** Tope de mensajes por lista: un KMZ mal exportado puede dar cientos */
const MAX_MENSAJES = 50

export interface ResultadoKmz {
  errores: string[]
  avisos: string[]
  fraccion: FeaturePlano | null
  manzanas: FeaturePlano[]
  lotes: FeaturePlano[]
}

type Anillo = [number, number][]

interface Etiqueta {
  texto: string
  punto: [number, number]
  usada: boolean
}

const ROMANOS: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
  XIII: 13,
  XIV: 14,
  XV: 15,
  XVI: 16,
  XVII: 17,
  XVIII: 18,
  XIX: 19,
  XX: 20,
}

/** "002" → 2, "II" → 2, "B" → 2. null si no es un número de manzana. */
export function numeroDeManzana(texto: string): number | null {
  const t = texto
    .trim()
    .toUpperCase()
    .replace(/^(MZ|MANZANA)\.?\s*/, '')
  if (/^\d+$/.test(t)) return Number(t) > 0 ? Number(t) : null
  if (ROMANOS[t]) return ROMANOS[t]
  if (/^[A-Z]$/.test(t)) return t.charCodeAt(0) - 64
  return null
}

/** "07" → 7. null si el texto del lote no es un entero positivo. */
export function numeroDeLote(texto: string): number | null {
  const t = texto
    .trim()
    .toUpperCase()
    .replace(/^(LT|LOTE)\.?\s*/, '')
  return /^\d+$/.test(t) && Number(t) > 0 ? Number(t) : null
}

function capa(propiedades: Record<string, unknown> | null): string {
  const d = propiedades?.description as unknown
  const texto = typeof d === 'object' && d !== null ? (d as { value?: unknown }).value : d
  return String(texto ?? '').toUpperCase()
}

function nombre(propiedades: Record<string, unknown> | null): string {
  return String(propiedades?.name ?? '').trim()
}

/** Anillo exterior de un Polygon o de una polilínea cerrada; null si no lo es */
function anilloDe(geometria: { type: string; coordinates: unknown }): Anillo | null {
  let puntos: unknown
  if (geometria.type === 'Polygon') puntos = (geometria.coordinates as unknown[])[0]
  else if (geometria.type === 'LineString') puntos = geometria.coordinates
  else return null
  if (!Array.isArray(puntos)) return null

  const anillo = puntos
    .filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .map((p) => [Number(p[0]), Number(p[1])] as [number, number])
  if (anillo.length < 3) return null

  if (geometria.type === 'LineString') {
    /* Una polilínea de AutoCAD es un contorno solo si termina donde empieza. */
    const [x0, y0] = anillo[0]
    const [x1, y1] = anillo[anillo.length - 1]
    if (anillo.length < 4 || Math.abs(x0 - x1) > 1e-7 || Math.abs(y0 - y1) > 1e-7) return null
  }
  return anillo
}

/** Ray casting sobre el anillo exterior */
function puntoEnAnillo([x, y]: [number, number], anillo: Anillo): boolean {
  let adentro = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]
    const [xj, yj] = anillo[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) adentro = !adentro
  }
  return adentro
}

/** Centroide de área (cae dentro del lote aunque los vértices estén desparejos) */
function centroide(anillo: Anillo): [number, number] {
  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]
    const [xj, yj] = anillo[j]
    const f = xj * yi - xi * yj
    area += f
    cx += (xj + xi) * f
    cy += (yj + yi) * f
  }
  if (Math.abs(area) < 1e-14) {
    const n = anillo.length
    return [anillo.reduce((s, p) => s + p[0], 0) / n, anillo.reduce((s, p) => s + p[1], 0) / n]
  }
  return [cx / (3 * area), cy / (3 * area)]
}

const aPunto = ([lng, lat]: [number, number]): PuntoLatLng => ({ lat, lng })
const aLados = (anillo: Anillo): LadosJson => [anillo.map(aPunto)]
const ubicacion = ([lng, lat]: [number, number]) => `(${lat.toFixed(6)}, ${lng.toFixed(6)})`

function tomarEtiqueta(etiquetas: Etiqueta[], anillo: Anillo): Etiqueta | null {
  const etiqueta = etiquetas.find((e) => !e.usada && puntoEnAnillo(e.punto, anillo))
  if (etiqueta) etiqueta.usada = true
  return etiqueta ?? null
}

/**
 * Saca el texto KML de un .kmz (zip) o de un .kml. Devuelve el error
 * para mostrar si el archivo no sirve.
 */
export async function leerKml(
  contenido: Buffer,
  nombreArchivo: string
): Promise<{ kml: string } | { error: string }> {
  if (nombreArchivo.toLowerCase().endsWith('.kml')) return { kml: contenido.toString('utf8') }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(contenido)
  } catch {
    return { error: 'El archivo .kmz está dañado o no es un KMZ (no se pudo descomprimir).' }
  }
  const archivoKml =
    zip.file('doc.kml') ?? zip.file(/\.kml$/i).find((f) => !f.name.startsWith('__MACOSX'))
  if (!archivoKml) return { error: 'El archivo .kmz no contiene ningún archivo .kml adentro.' }
  return { kml: await archivoKml.async('text') }
}

/** Interpreta el KML del plano y arma fracción, manzanas y lotes. */
export function parsearKmlPlano(textoKml: string): ResultadoKmz {
  const errores: string[] = []
  const avisos: string[] = []
  const resultado: ResultadoKmz = { errores, avisos, fraccion: null, manzanas: [], lotes: [] }

  let coleccion: ReturnType<typeof kml>
  try {
    const xml = new DOMParser({ errorHandler: { warning: () => {} } }).parseFromString(
      textoKml,
      'text/xml'
    )
    coleccion = kml(xml as unknown as Document)
  } catch {
    errores.push('El archivo no es un KML válido (no se pudo leer el XML).')
    return resultado
  }
  if (!coleccion.features.length) {
    errores.push('El archivo no contiene elementos geográficos.')
    return resultado
  }

  let poligono: Anillo | null = null
  const manzanasGeo: Anillo[] = []
  const lotesGeo: { anillo: Anillo; plaza: boolean }[] = []
  const textosManzana: Etiqueta[] = []
  const textosLote: Etiqueta[] = []
  const otrasCapas = new Set<string>()

  for (const feature of coleccion.features) {
    const geometria = feature.geometry as { type: string; coordinates: unknown } | null
    if (!geometria) continue
    const c = capa(feature.properties)

    if (geometria.type === 'Point') {
      const [lng, lat] = geometria.coordinates as number[]
      const etiqueta = {
        texto: nombre(feature.properties),
        punto: [lng, lat] as [number, number],
        usada: false,
      }
      if (c.includes('MAN_TEXT')) textosManzana.push(etiqueta)
      else if (c.includes('LOTE')) textosLote.push(etiqueta)
      else if (c) otrasCapas.add(c)
      continue
    }

    const anillo = anilloDe(geometria)
    if (c.includes('PLAZA_Y_EDIF_PUBL')) {
      if (anillo) lotesGeo.push({ anillo, plaza: true })
    } else if (c.includes('LOTE')) {
      if (anillo) lotesGeo.push({ anillo, plaza: false })
    } else if (c.includes('MAN')) {
      if (anillo) manzanasGeo.push(anillo)
    } else if (c.includes('POLIGONO')) {
      if (anillo && !poligono) poligono = anillo
      else if (anillo)
        avisos.push('Hay más de un POLIGONO: se usa el primero como contorno de la fracción.')
    } else if (c) {
      otrasCapas.add(c)
    }
  }

  if (otrasCapas.size > 0) {
    avisos.push(`Se ignoran elementos de otras capas: ${[...otrasCapas].slice(0, 8).join(', ')}.`)
  }

  /* Fracción */
  if (!poligono) {
    errores.push('Falta el contorno de la fracción (capa POLIGONO).')
  } else {
    resultado.fraccion = {
      centro: aPunto(centroide(poligono)),
      lados: aLados(poligono),
      mz: null,
      lt: null,
    }
  }

  /* Manzanas: el número sale del MAN_TEXT de adentro */
  if (textosManzana.length === 0) {
    errores.push('No hay números de manzana (puntos de la capa MAN_TEXT).')
  }
  const manzanaPorCodigo = new Map<number, FeaturePlano & { anillo: Anillo | null }>()
  const manzanasConAnillo: { codigo: number; anillo: Anillo }[] = []

  for (const anillo of manzanasGeo) {
    const etiqueta = tomarEtiqueta(textosManzana, anillo)
    const donde = ubicacion(centroide(anillo))
    if (!etiqueta) {
      errores.push(
        `La manzana en ${donde} no tiene número (falta un MAN_TEXT dentro de su contorno).`
      )
      continue
    }
    const codigo = numeroDeManzana(etiqueta.texto)
    if (codigo === null) {
      errores.push(
        `La manzana "${etiqueta.texto}" en ${donde} no tiene un número válido (se acepta 1, 01, II o B).`
      )
      continue
    }
    if (manzanaPorCodigo.has(codigo)) {
      errores.push(`La manzana ${codigo} está dibujada dos veces (otra vez en ${donde}).`)
      continue
    }
    manzanaPorCodigo.set(codigo, {
      centro: aPunto(etiqueta.punto),
      lados: aLados(anillo),
      mz: codigo,
      lt: null,
      anillo,
    })
    manzanasConAnillo.push({ codigo, anillo })
  }

  /* MAN_TEXT sin contorno: la manzana existe igual (solo su número en el mapa) */
  for (const etiqueta of textosManzana.filter((e) => !e.usada)) {
    const codigo = numeroDeManzana(etiqueta.texto)
    if (codigo === null) {
      errores.push(
        `El número de manzana "${etiqueta.texto}" en ${ubicacion(etiqueta.punto)} no es válido (se acepta 1, 01, II o B).`
      )
      continue
    }
    if (manzanaPorCodigo.has(codigo)) {
      if (manzanasConAnillo.length > 0) {
        avisos.push(
          `El número de manzana ${codigo} aparece dos veces; se usa el que está dentro de su contorno.`
        )
      }
      continue
    }
    manzanaPorCodigo.set(codigo, {
      centro: aPunto(etiqueta.punto),
      lados: [],
      mz: codigo,
      lt: null,
      anillo: null,
    })
  }

  if (manzanasConAnillo.length === 0 && manzanaPorCodigo.size > 0) {
    avisos.push(
      'No hay contornos de manzana (capa MAN): cada lote se asigna al número de manzana más cercano.'
    )
  }

  /* Lotes */
  const lotesNormales = lotesGeo.filter((l) => !l.plaza)
  const plazas = lotesGeo.length - lotesNormales.length
  if (plazas > 0)
    avisos.push(`Se omiten ${plazas} plaza(s) o edificio(s) público(s): no son lotes en venta.`)
  if (lotesNormales.length === 0) errores.push('No hay lotes (contornos de la capa LOTE).')

  const sinNumero: string[] = []
  const claves = new Set<string>()
  for (const { anillo } of lotesNormales) {
    const centro = centroide(anillo)
    const donde = ubicacion(centro)
    const etiqueta = tomarEtiqueta(textosLote, anillo)
    if (!etiqueta) {
      errores.push(
        `El lote en ${donde} no tiene número (falta un LOTE_TEXT dentro de su contorno).`
      )
      continue
    }
    const lt = numeroDeLote(etiqueta.texto)
    if (lt === null) {
      sinNumero.push(etiqueta.texto)
      continue
    }

    let mz: number | null = null
    if (manzanasConAnillo.length > 0) {
      mz = manzanasConAnillo.find((m) => puntoEnAnillo(centro, m.anillo))?.codigo ?? null
    } else {
      let mejor = Infinity
      for (const m of manzanaPorCodigo.values()) {
        const d = (m.centro.lng - centro[0]) ** 2 + (m.centro.lat - centro[1]) ** 2
        if (d < mejor) {
          mejor = d
          mz = m.mz
        }
      }
    }
    if (mz === null) {
      errores.push(`El lote ${lt} en ${donde} no cae dentro de ninguna manzana.`)
      continue
    }

    const clave = `${mz}:${lt}`
    if (claves.has(clave)) {
      errores.push(
        `El lote ${lt} de la manzana ${mz} está dibujado dos veces (otra vez en ${donde}).`
      )
      continue
    }
    claves.add(clave)
    resultado.lotes.push({ centro: aPunto(centro), lados: aLados(anillo), mz, lt })
  }

  if (sinNumero.length > 0) {
    const ejemplos = [...new Set(sinNumero)].slice(0, 5).join(', ')
    avisos.push(`Se omiten ${sinNumero.length} lote(s) con número que no es entero (${ejemplos}).`)
  }
  const textosSueltos = textosLote.filter((e) => !e.usada).length
  if (textosSueltos > 0) {
    avisos.push(
      `${textosSueltos} número(s) de lote (LOTE_TEXT) no caen dentro de ningún lote y se ignoran.`
    )
  }

  resultado.manzanas = [...manzanaPorCodigo.values()]
    .sort((a, b) => a.mz! - b.mz!)
    .map(({ anillo: _anillo, ...m }) => m)

  if (errores.length > MAX_MENSAJES) {
    const resto = errores.length - MAX_MENSAJES
    errores.splice(MAX_MENSAJES, resto, `…y ${resto} problema(s) más.`)
  }
  return resultado
}

/** GeoJSON para el visor del admin (mismo formato que el preview de GeoJSON) */
export function geojsonDeResultado(r: ResultadoKmz) {
  const anillos = (lados: LadosJson) =>
    lados.map((anillo) => anillo.map((p) => [p.lng, p.lat] as [number, number]))
  const features = [
    ...(r.fraccion
      ? [
          {
            type: 'Feature',
            properties: { tipo: 'fraccion' },
            geometry: { type: 'Polygon', coordinates: anillos(r.fraccion.lados) },
          },
        ]
      : []),
    ...r.manzanas
      .filter((m) => m.lados.length > 0)
      .map((m) => ({
        type: 'Feature',
        properties: { tipo: 'manzana', codigo: m.mz, centro: m.centro },
        geometry: { type: 'Polygon', coordinates: anillos(m.lados) },
      })),
    ...r.lotes.map((l) => ({
      type: 'Feature',
      properties: { tipo: 'lote', fml: `${l.mz}-${l.lt}`, color: '#6a822b', centro: l.centro },
      geometry: { type: 'Polygon', coordinates: anillos(l.lados) },
    })),
  ]
  return { type: 'FeatureCollection', features }
}
