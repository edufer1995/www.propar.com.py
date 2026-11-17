/*
|--------------------------------------------------------------------------
| Importación de planos cartográficos (fracción + manzanas + lotes)
|--------------------------------------------------------------------------
|
| Recibe los 3 archivos .geojson del agrimensor (mismo formato que el
| sitio viejo: features Polygon con properties.MZ / properties.LT y
| centroide WKT "POINT(lng lat)" en properties.centroid) y los importa en
| UNA transacción con el mismo formato jsonb del ETL:
|
|   coorde_centro → {lat, lng}            (números)
|   coorde_lados  → [[{lat, lng}, …], …]  (anillos del polígono)
|
| Si el archivo no trae properties.centroid, el centro se calcula como el
| promedio de los vértices del anillo exterior.
|
| Los errores son ErrorDePlano: mensaje en español + campo del form
| (archivoFraccion / archivoManzanas / archivoLotes / codigo) para
| mostrarse inline.
|
*/

import db from '@adonisjs/lucid/services/db'
import { errors as vineErrors } from '@vinejs/vine'

import Fraccion from '#models/fraccion'

export interface PuntoLatLng {
  lat: number
  lng: number
}

/** Anillos normalizados al formato jsonb del ETL */
export type LadosJson = PuntoLatLng[][]

export interface FeaturePlano {
  centro: PuntoLatLng
  lados: LadosJson
  mz: number | null
  lt: number | null
}

export type TipoArchivoPlano = 'fraccion' | 'manzanas' | 'lotes'

const CAMPO_POR_TIPO: Record<TipoArchivoPlano, string> = {
  fraccion: 'archivoFraccion',
  manzanas: 'archivoManzanas',
  lotes: 'archivoLotes',
}

const NOMBRE_POR_TIPO: Record<TipoArchivoPlano, string> = {
  fraccion: 'fracción',
  manzanas: 'manzanas',
  lotes: 'lotes',
}

export function errorDePlano(campo: string, mensaje: string) {
  return new vineErrors.E_VALIDATION_ERROR([{ field: campo, rule: 'plano', message: mensaje }])
}

function esLatLngValido(punto: PuntoLatLng): boolean {
  return (
    Number.isFinite(punto.lat) &&
    Number.isFinite(punto.lng) &&
    Math.abs(punto.lat) <= 90 &&
    Math.abs(punto.lng) <= 180
  )
}

/** Centroide WKT del sitio viejo: "POINT(lng lat)" */
function parseCentroidWkt(valor: unknown): PuntoLatLng | null {
  if (typeof valor !== 'string') return null
  const match = valor.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i)
  if (!match) return null
  const punto = { lng: Number(match[1]), lat: Number(match[2]) }
  return esLatLngValido(punto) ? punto : null
}

/** Centro alternativo: promedio de los vértices del anillo exterior */
function centroDeAnillo(anillo: PuntoLatLng[]): PuntoLatLng {
  const suma = anillo.reduce(
    (acumulado, punto) => ({ lat: acumulado.lat + punto.lat, lng: acumulado.lng + punto.lng }),
    { lat: 0, lng: 0 }
  )
  return { lat: suma.lat / anillo.length, lng: suma.lng / anillo.length }
}

/** Entero positivo o null (los MZ/LT del geojson llegan como string o número) */
function enteroPositivo(valor: unknown): number | null {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * Valida y normaliza un archivo .geojson del plano. Exige un
 * FeatureCollection de Polygons; según el tipo, exige properties.MZ
 * (manzanas y lotes) y properties.LT (lotes).
 */
export function parsearGeoJsonPlano(contenido: string, tipo: TipoArchivoPlano): FeaturePlano[] {
  const campo = CAMPO_POR_TIPO[tipo]
  const nombre = NOMBRE_POR_TIPO[tipo]

  let crudo: unknown
  try {
    crudo = JSON.parse(contenido)
  } catch {
    throw errorDePlano(campo, `El archivo de ${nombre} no es un JSON válido`)
  }

  const coleccion = crudo as { type?: unknown; features?: unknown }
  if (coleccion?.type !== 'FeatureCollection' || !Array.isArray(coleccion.features)) {
    throw errorDePlano(campo, `El archivo de ${nombre} debe ser un FeatureCollection GeoJSON`)
  }
  if (coleccion.features.length === 0) {
    throw errorDePlano(campo, `El archivo de ${nombre} no tiene features`)
  }

  const resultado: FeaturePlano[] = []

  for (const [indice, crudoFeature] of coleccion.features.entries()) {
    const feature = crudoFeature as {
      geometry?: { type?: unknown; coordinates?: unknown }
      properties?: Record<string, unknown>
    }
    const posicion = `feature ${indice + 1} de ${nombre}`

    if (feature?.geometry?.type !== 'Polygon' || !Array.isArray(feature.geometry.coordinates)) {
      throw errorDePlano(campo, `La ${posicion} no tiene una geometría Polygon`)
    }

    // Anillos [[lng,lat], …] → [[{lat,lng}, …], …]
    const lados: LadosJson = []
    for (const anilloCrudo of feature.geometry.coordinates) {
      if (!Array.isArray(anilloCrudo) || anilloCrudo.length < 3) {
        throw errorDePlano(campo, `La ${posicion} tiene un anillo con menos de 3 vértices`)
      }
      const anillo: PuntoLatLng[] = []
      for (const par of anilloCrudo) {
        if (!Array.isArray(par) || par.length < 2) {
          throw errorDePlano(campo, `La ${posicion} tiene coordenadas mal formadas`)
        }
        const punto = { lng: Number(par[0]), lat: Number(par[1]) }
        if (!esLatLngValido(punto)) {
          throw errorDePlano(campo, `La ${posicion} tiene coordenadas fuera de rango`)
        }
        anillo.push(punto)
      }
      lados.push(anillo)
    }

    const propiedades = feature.properties ?? {}
    const mz = enteroPositivo(propiedades.MZ)
    const lt = enteroPositivo(propiedades.LT)

    if (tipo !== 'fraccion' && mz === null) {
      throw errorDePlano(campo, `La ${posicion} no tiene properties.MZ (número de manzana)`)
    }
    if (tipo === 'lotes' && lt === null) {
      throw errorDePlano(campo, `La ${posicion} no tiene properties.LT (número de lote)`)
    }

    const centro = parseCentroidWkt(propiedades.centroid) ?? centroDeAnillo(lados[0])
    resultado.push({ centro, lados, mz, lt })
  }

  if (tipo === 'fraccion' && resultado.length !== 1) {
    throw errorDePlano(
      campo,
      `El archivo de fracción debe tener exactamente 1 feature (tiene ${resultado.length})`
    )
  }

  return resultado
}

export interface DatosImportacion {
  codigo: number
  descripcion: string
  fraccionGeoJson: string
  manzanasGeoJson: string
  lotesGeoJson: string
}

export default class PlanosImportService {
  /**
   * Valida los 3 archivos y ejecuta la importación completa en una
   * transacción (fracción → manzanas → lotes, resolviendo FKs).
   * Devuelve la cantidad importada.
   */
  async importar(datos: DatosImportacion): Promise<{ manzanas: number; lotes: number }> {
    if (await Fraccion.findBy('codigo', datos.codigo)) {
      throw errorDePlano(
        'codigo',
        `Ya existe una fracción con el código ${datos.codigo}. Eliminala antes de re-importar el plano.`
      )
    }

    const [fraccion] = parsearGeoJsonPlano(datos.fraccionGeoJson, 'fraccion')
    const manzanas = parsearGeoJsonPlano(datos.manzanasGeoJson, 'manzanas')
    const lotes = parsearGeoJsonPlano(datos.lotesGeoJson, 'lotes')

    // Consistencia entre archivos ANTES de tocar la base
    const codigosManzana = new Set<number>()
    for (const manzana of manzanas) {
      if (codigosManzana.has(manzana.mz!)) {
        throw errorDePlano(
          'archivoManzanas',
          `La manzana ${manzana.mz} está repetida en el archivo`
        )
      }
      codigosManzana.add(manzana.mz!)
    }

    const clavesLote = new Set<string>()
    for (const lote of lotes) {
      if (!codigosManzana.has(lote.mz!)) {
        throw errorDePlano(
          'archivoLotes',
          `El lote ${lote.mz}-${lote.lt} referencia la manzana ${lote.mz}, que no está en el archivo de manzanas`
        )
      }
      const clave = `${lote.mz}:${lote.lt}`
      if (clavesLote.has(clave)) {
        throw errorDePlano(
          'archivoLotes',
          `El lote ${lote.lt} de la manzana ${lote.mz} está repetido en el archivo`
        )
      }
      clavesLote.add(clave)
    }

    await db.transaction(async (trx) => {
      const ahora = new Date()

      const [filaFraccion] = await trx
        .table('fracciones')
        .insert({
          codigo: datos.codigo,
          descripcion: datos.descripcion,
          coorde_centro: JSON.stringify(fraccion.centro),
          coorde_lados: JSON.stringify(fraccion.lados),
          observacion: String(datos.codigo),
          estado: 'A',
          created_at: ahora,
          updated_at: ahora,
        })
        .returning('id')

      const manzanaIdPorCodigo = new Map<number, number>()
      for (const manzana of manzanas) {
        const [filaManzana] = await trx
          .table('manzanas')
          .insert({
            fraccion_id: filaFraccion.id,
            codigo: manzana.mz,
            coorde_centro: JSON.stringify(manzana.centro),
            coorde_lados: JSON.stringify(manzana.lados),
            observacion: null,
            created_at: ahora,
            updated_at: ahora,
          })
          .returning('id')
        manzanaIdPorCodigo.set(manzana.mz!, filaManzana.id)
      }

      // Inserción por bloques de 500 (fracciones grandes: cientos de lotes)
      const filasLotes = lotes.map((lote) => ({
        manzana_id: manzanaIdPorCodigo.get(lote.mz!)!,
        fraccion_codigo: datos.codigo,
        manzana_codigo: lote.mz,
        codigo: lote.lt,
        coorde_centro: JSON.stringify(lote.centro),
        coorde_lados: JSON.stringify(lote.lados),
        observacion: null,
        created_at: ahora,
        updated_at: ahora,
      }))
      for (let i = 0; i < filasLotes.length; i += 500) {
        await trx.table('lotes').multiInsert(filasLotes.slice(i, i + 500))
      }
    })

    return { manzanas: manzanas.length, lotes: lotes.length }
  }
}
