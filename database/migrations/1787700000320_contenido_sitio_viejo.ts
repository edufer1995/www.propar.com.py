import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Contenido que la web actual (propar.com.py) muestra y la nueva todavía no
 * tenía: sus 5 sucursales, Instagram y Facebook, sus 5 preguntas
 * frecuentes y los textos de Quiénes somos, Misión y Visión (los del manual
 * de marca, que son la versión corregida de los de la base vieja).
 *
 * Suma la columna sucursales.direccion (la web actual muestra la dirección
 * de cada sucursal).
 *
 * Solo carga lo que falta: si el admin ya cargó sucursales, redes o textos,
 * no los toca. Coordenadas: las de los links de Google Maps de la web
 * actual; conviene confirmarlas desde el admin.
 */

const SUCURSALES = [
  {
    titulo: 'Asunción',
    direccion: 'Dr. Juan Eulogio Estigarribia 5238',
    horarios: 'De 8:00 a 18:00',
    coordenadas: { lat: -25.2965554, lng: -57.5796203 },
  },
  {
    titulo: 'Ciudad del Este',
    direccion: 'Monseñor Rodríguez, frente al desvío a Don Bosco, entre Diesa y Gran Vía',
    horarios: 'De 7:30 a 17:00',
    coordenadas: { lat: -25.499092, lng: -54.66367 },
  },
  {
    titulo: 'Encarnación',
    direccion: 'Av. Bernardino Caballero, Encarnación',
    horarios: 'De 7:30 a 18:00',
    coordenadas: { lat: -27.3265204, lng: -55.871485 },
  },
  {
    titulo: 'Coronel Oviedo',
    direccion: 'Coronel Oviedo',
    horarios: 'De 7:30 a 18:00',
    coordenadas: { lat: -25.4405555, lng: -56.4343316 },
  },
  {
    titulo: 'Hohenau',
    direccion: 'Aviadores del Chaco, Hohenau',
    horarios: 'De 7:30 a 18:00',
    coordenadas: { lat: -27.0704108, lng: -55.6409605 },
  },
]

const REDES = [
  { nombre: 'Instagram', url: 'https://www.instagram.com/proparsrl', orden: 1 },
  { nombre: 'Facebook', url: 'https://www.facebook.com/proprasrl', orden: 2 },
]

/** Las 5 de la web actual, en su orden, con tildes corregidas. */
const PREGUNTAS = [
  {
    categoria: 'general',
    pregunta: '¿Qué necesito para adquirir un lote?',
    respuesta:
      'Solo necesita:\n\n✅ Ser mayor de edad.\n✅ Presentar una copia de su cédula de identidad.\n✅ Un comprobante de pago de servicios (ESSAP, ANDE, telefonía, etc.).\n✅ Abonar la primera cuota de su lote.\n\n¡Eso es todo!',
  },
  {
    categoria: 'general',
    pregunta: '¿Puedo adquirir un lote a mi nombre si soy extranjero?',
    respuesta:
      'Sí, puede hacerlo. Solo necesita un número de contacto y una dirección en territorio paraguayo donde recibir documentos y comunicaciones de la empresa. Puede ser la de algún familiar o persona de su confianza.',
  },
  {
    categoria: 'general',
    pregunta: '¿Desde cuándo puedo construir en mi lote?',
    respuesta:
      '¡Desde la primera cuota! Nuestros lotes son con posesión inmediata, para que puedas iniciar tu camino a la casa propia hoy mismo.',
  },
  {
    categoria: 'titulos',
    pregunta: '¿Cómo titulo mi lote?',
    respuesta:
      'Una vez cancelado el pago del lote, la inmobiliaria le entrega gratuitamente una orden de escrituración, que debe llevar a la escribanía para iniciar los trámites.',
  },
  {
    categoria: 'tramites',
    pregunta: 'Quiero transferir mi lote, ¿cómo lo hago?',
    respuesta:
      '✅ Debe estar al día en sus cuotas o haber cancelado el lote.\n✅ Presentar una fotocopia de la cédula del titular. Si está casado/a, también la de su pareja, y firman los dos la transferencia.\n✅ Abonar el costo de la transferencia.\n✅ Acercarnos la fotocopia del pago del impuesto inmobiliario al día.',
  },
]

const QUIENES_SOMOS = {
  titulo: 'Quiénes somos',
  parrafo_uno:
    'La Inmobiliaria Propar S.R.L. fue fundada en el año 1986 por un grupo de emprendedores paraguayos. Desde entonces, nuestra actividad principal es el desarrollo y la comercialización de proyectos inmobiliarios a través de urbanizaciones en las zonas de mayor desarrollo del país.',
}

const MISION = {
  titulo: 'Misión',
  parrafo_uno:
    'Somos una empresa dedicada a bienes raíces. Brindamos servicios inmobiliarios con excelencia en la atención al cliente, avalada por años en el sector, para personas y empresas que apuestan a la inversión en inmuebles.',
}

const VISION = {
  titulo: 'Visión',
  parrafo_uno:
    'Ser innovadores en el sector inmobiliario, brindando excelencia en la calidad de nuestros servicios mediante el trabajo profesional y especializado de nuestro plantel.',
}

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('sucursales', (table) => {
      table.string('direccion', 255).nullable()
    })

    this.defer(async (db) => {
      const ahora = new Date()
      const marcas = { created_at: ahora, updated_at: ahora }
      const vacia = async (tabla: string) => {
        const [fila] = await db.from(tabla).count('* as total')
        return Number(fila.total) === 0
      }

      if (await vacia('sucursales')) {
        await db.table('sucursales').multiInsert(
          SUCURSALES.map((s) => ({
            ...s,
            coordenadas: JSON.stringify(s.coordenadas),
            telefonos: null,
            estado: 'A',
            ...marcas,
          }))
        )
      }

      if (await vacia('redes_sociales')) {
        await db
          .table('redes_sociales')
          .multiInsert(REDES.map((r) => ({ ...r, activo: true, ...marcas })))
      }

      /* Preguntas: las de la web actual van primero y las sembradas antes
         quedan detrás. Una con la misma pregunta (la sembrada "¿Cómo
         titulo mi lote?") toma la respuesta de la web actual. */
      await db.from('preguntas_frecuentes').increment('orden', PREGUNTAS.length)
      for (const [i, p] of PREGUNTAS.entries()) {
        const fila = { ...p, orden: i + 1, activo: true }
        const actualizadas = await db
          .from('preguntas_frecuentes')
          .where('pregunta', p.pregunta)
          .update({ ...fila, updated_at: ahora })
        if (Number(actualizadas) === 0) {
          await db.table('preguntas_frecuentes').insert({ ...fila, ...marcas })
        }
      }

      for (const [tabla, datos] of [
        ['quienes_somos', QUIENES_SOMOS],
        ['mision', MISION],
        ['vision', VISION],
      ] as const) {
        const fila = await db.from(tabla).first()
        if (!fila) {
          await db.table(tabla).insert({ ...datos, ...marcas })
        } else if (!fila.titulo && !fila.parrafo_uno) {
          await db
            .from(tabla)
            .where('id', fila.id)
            .update({ ...datos, updated_at: ahora })
        }
      }
    })
  }

  async down() {
    this.schema.alterTable('sucursales', (table) => {
      table.dropColumn('direccion')
    })
  }
}
