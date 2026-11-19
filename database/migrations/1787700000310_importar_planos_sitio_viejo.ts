import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Planos del sitio viejo (www.propar.com.py anterior): 42 fracciones activas
 * con sus manzanas y los polígonos de cada lote, ya pasados al formato jsonb
 * del import de planos (ver #services/planos_import_service).
 *
 * El archivo database/data/planos_sitio_viejo.json.gz se generó desde el
 * dump de la base vieja con estas reglas:
 *  - solo registros activos (estado_id = 1); fracción repetida → la más nueva
 *  - manzana "II" / "B" / "002" → 2 (romanos, letras y números a entero);
 *    el texto original queda en manzanas.observacion si no era un número
 *  - se omiten plazas y lotes sin número (PLAZA, EDIF. PÚB., 10-A…)
 *  - lote cargado más de una vez → gana la carga más nueva
 *  - lotes a más de 3 km del centro de su fracción → omitidos (eran de otro plano)
 *  - manzana sin centro propio → toma el centro de uno de sus lotes
 *
 * Solo trae geometría: nada de datos personales. Precios, estados y medidas
 * siguen viniendo de Odoo, cruzados por manzana y lote.
 *
 * Es idempotente: una fracción cuyo código ya existe se saltea (si el admin
 * ya subió un plano nuevo, no se pisa).
 */

interface Punto {
  lat: number
  lng: number
}

interface FraccionVieja {
  codigo: number
  descripcion: string
  centro: Punto
  manzanas: { codigo: number; original: string; centro: Punto }[]
  lotes: { mz: number; lt: number; centro: Punto; lados: Punto[][] }[]
}

/** Marca de origen: permite que down() borre solo lo que trajo esta migración. */
const ORIGEN = 'Plano del sitio viejo'

async function leerPlanos(): Promise<FraccionVieja[]> {
  const archivo = new URL('../data/planos_sitio_viejo.json.gz', import.meta.url)
  return JSON.parse(gunzipSync(await readFile(archivo)).toString('utf8'))
}

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      const planos = await leerPlanos()
      const cargadas = await db.from('fracciones').select('codigo')
      const existentes = new Set(cargadas.map((f) => Number(f.codigo)))
      const ahora = new Date()

      for (const plano of planos) {
        if (existentes.has(plano.codigo)) continue

        const [fraccion] = await db
          .table('fracciones')
          .insert({
            codigo: plano.codigo,
            descripcion: plano.descripcion,
            coorde_centro: JSON.stringify(plano.centro),
            coorde_lados: null,
            observacion: ORIGEN,
            estado: 'A',
            created_at: ahora,
            updated_at: ahora,
          })
          .returning('id')

        const manzanaId = new Map<number, number>()
        for (const manzana of plano.manzanas) {
          const [fila] = await db
            .table('manzanas')
            .insert({
              fraccion_id: fraccion.id,
              codigo: manzana.codigo,
              coorde_centro: JSON.stringify(manzana.centro),
              coorde_lados: null,
              // "II" o "B" se anotan; "002" no aporta nada
              observacion: /^\d+$/.test(manzana.original.trim())
                ? null
                : `Manzana ${manzana.original.trim()} en el plano`,
              created_at: ahora,
              updated_at: ahora,
            })
            .returning('id')
          manzanaId.set(manzana.codigo, fila.id)
        }

        const filas = plano.lotes.map((lote) => ({
          manzana_id: manzanaId.get(lote.mz)!,
          fraccion_codigo: plano.codigo,
          manzana_codigo: lote.mz,
          codigo: lote.lt,
          coorde_centro: JSON.stringify(lote.centro),
          coorde_lados: JSON.stringify(lote.lados),
          observacion: null,
          created_at: ahora,
          updated_at: ahora,
        }))
        for (let i = 0; i < filas.length; i += 500) {
          await db.table('lotes').multiInsert(filas.slice(i, i + 500))
        }
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      // Manzanas y lotes caen por ON DELETE CASCADE.
      await db.from('fracciones').where('observacion', ORIGEN).delete()
    })
  }
}
