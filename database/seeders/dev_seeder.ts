import { DateTime } from 'luxon'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

import Promocion from '#models/promocion'
import RedSocial from '#models/red_social'

/**
 * Datos de ejemplo SOLO para desarrollo: promociones vigentes y redes
 * sociales, para que las secciones del home se vean con contenido.
 * Idempotente: usa updateOrCreate por clave natural.
 */
export default class extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    const hoy = DateTime.now().setZone('America/Asuncion').startOf('day')

    const promociones = [
      {
        titulo: 'Feria de lotes — cuota inicial 0%',
        descripcion:
          'Durante todo el mes, entrá a tu lote sin entrega inicial en fracciones seleccionadas de Luque y Capiatá.',
        url: '/loteamientos',
        vigenteDesde: hoy.minus({ days: 7 }),
        vigenteHasta: hoy.plus({ days: 30 }),
        activo: true,
        /* Ejemplo de promoción que además se abre como modal al entrar. */
        modal: true,
      },
      {
        titulo: '10% de descuento pagando al contado',
        descripcion:
          'Llevate tu lote con un 10% menos abonando al contado en cualquiera de nuestras sucursales.',
        url: '/contacto?asunto=comprar-lote',
        vigenteDesde: hoy.minus({ days: 3 }),
        vigenteHasta: hoy.plus({ days: 60 }),
        activo: true,
        modal: false,
      },
      {
        titulo: 'Promo vencida (no debe verse)',
        descripcion: 'Control: esta promoción está fuera de vigencia.',
        url: null,
        vigenteDesde: hoy.minus({ days: 90 }),
        vigenteHasta: hoy.minus({ days: 30 }),
        activo: true,
        modal: false,
      },
    ]

    for (const promo of promociones) {
      await Promocion.updateOrCreate({ titulo: promo.titulo }, promo)
    }

    const redes = [
      {
        nombre: 'Facebook',
        url: 'https://www.facebook.com/AbasInmobiliaria/',
        orden: 1,
        activo: true,
      },
      {
        nombre: 'Instagram',
        url: 'https://www.instagram.com/abasinmobiliaria/',
        orden: 2,
        activo: true,
      },
      { nombre: 'WhatsApp', url: 'https://wa.me/59521444061', orden: 3, activo: true },
      {
        nombre: 'YouTube',
        url: 'https://www.youtube.com/@abasinmobiliaria',
        orden: 4,
        activo: true,
      },
    ]

    for (const red of redes) {
      await RedSocial.updateOrCreate({ nombre: red.nombre }, red)
    }
  }
}
