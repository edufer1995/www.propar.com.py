import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import { errors as vineErrors } from '@vinejs/vine'
import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import limiter from '@adonisjs/limiter/services/main'
import type { HttpContext } from '@adonisjs/core/http'

import Lead from '#models/lead'
import LoteColor from '#models/lote_color'
import LoteamientosService from '#services/loteamientos_service'
import { claveEstado } from '#services/estados_lote'
import LotesErpRepository from '#repositories/erp/lotes_erp_repository'
import PurchaseRequestNotification from '#mails/purchase_request_notification'
import { RANGO_PRECIOS, RANGOS_CUOTA_OPCIONES } from '#services/rangos_precios'
import { comprarLoteValidator, filtrosLoteamientosValidator } from '#validators/loteamientos'

/**
 * Límite de solicitudes de compra: 5 por minuto por IP (igual que el
 * formulario de contacto).
 */
const comprarLimiter = limiter.use({
  requests: 5,
  duration: '1 min',
})

/**
 * Pantalla /loteamientos: mapa Google Maps con las fracciones, sus lotes
 * y el flujo de compra (Etapa 4b).
 */
@inject()
export default class LoteamientosController {
  constructor(
    private erp: LotesErpRepository,
    private servicio: LoteamientosService
  ) {}

  async index({ request, inertia }: HttpContext) {
    /**
     * Filtros de la query string. Un valor inválido no rompe la página:
     * simplemente se ignoran todos los filtros.
     */
    let filtros: {
      texto?: string
      rango?: string
      distrito?: number
      fraccion?: string
    } = {}
    try {
      const qs = request.qs()
      /**
       * El parser de query convierte una coma cruda ("?fraccion=135,134")
       * en array; se normaliza a string CSV para el validator (la coma
       * encodeada %2C que genera Inertia llega directo como string).
       */
      if (Array.isArray(qs.fraccion)) qs.fraccion = qs.fraccion.join(',')
      filtros = await filtrosLoteamientosValidator.validate(qs)
    } catch {
      filtros = {}
    }

    /**
     * El server manda SIEMPRE todas las fracciones: el filtrado (texto,
     * rango, distrito) es client-side e instantáneo sobre la lista
     * completa. Los parámetros de la URL (deep-links del SearchBox del
     * home) se ecoan en `filtros` como estado inicial de esos filtros.
     */
    const [fracciones, distritos, colores] = await Promise.all([
      this.servicio.fraccionesFiltradas({}),
      this.erp.distritos(),
      LoteColor.query().select('estado', 'color').orderBy('id', 'asc'),
    ])

    return inertia.render('public/loteamientos', {
      fracciones,
      distritos: distritos.map((d) => ({ codigo: d.codigo, nombre: d.nombre })),
      colores: colores.map((c) => ({ estado: c.estado, color: c.color })),
      /* Con los límites de cada rango: el cliente filtra por cuotaMinima. */
      rangosCuota: RANGOS_CUOTA_OPCIONES.map((r) => ({
        ...r,
        desde: RANGO_PRECIOS[r.valor].desde,
        hasta: RANGO_PRECIOS[r.valor].hasta,
      })),
      filtros: {
        texto: filtros.texto ?? '',
        rango: filtros.rango ?? '',
        distrito: filtros.distrito ? String(filtros.distrito) : '',
        fraccion: filtros.fraccion ?? '',
      },
      contadores: {
        fracciones: fracciones.length,
        lotesDisponibles: fracciones.reduce((suma, f) => suma + f.disponibles, 0),
      },
    })
  }

  /**
   * Detalle JSON de una fracción: GeoJSON de manzanas + lotes con datos
   * comerciales del ERP. 3 queries SQL fijas (sin N+1).
   */
  async detalle({ params, response }: HttpContext) {
    const codigo = Number(params.codigo)
    const detalle = await this.servicio.detalleFraccion(codigo)

    if (!detalle) {
      return response.notFound({ error: `La fracción ${params.codigo} no existe` })
    }
    return response.json(detalle)
  }

  /**
   * Solicitud de compra de un lote (ComprarLoteModal). Revalida contra el
   * ERP (existencia + estado LIBRE), persiste el lead con snapshot de
   * precios server-side y notifica a ventas.
   */
  async comprar(ctx: HttpContext) {
    const { request, response, session } = ctx

    /** Rate limit antes de cualquier trabajo (5/min por IP). */
    const clave = `loteamientos_comprar_${request.ip()}`
    try {
      await comprarLimiter.consume(clave)
    } catch {
      const mensaje = 'Demasiadas solicitudes seguidas. Esperá un minuto y volvé a intentar.'
      if (this.#esInertia(ctx)) {
        session.flash('error', mensaje)
        return response.redirect().back()
      }
      return response.tooManyRequests({ error: mensaje })
    }

    const datos = await request.validateUsing(comprarLoteValidator)

    /**
     * Revalidación server-side contra el ERP: el precio y el estado que
     * mostró el mapa pueden estar viejos. Nunca se confía en el cliente.
     */
    const lote = await this.erp.precioLote(datos.fraccion, datos.manzana, datos.lote)
    if (!lote) {
      throw new vineErrors.E_VALIDATION_ERROR([
        { message: 'El lote indicado no existe', field: 'lote', rule: 'erp.existe' },
      ])
    }
    /* Mismo criterio que el mapa: tolera relleno/mayúsculas del ERP, pero
       solo empareja variantes de LIBRE (VENDIDO nunca pasa). */
    if (claveEstado(lote.estado) !== 'LIBRE') {
      throw new vineErrors.E_VALIDATION_ERROR([
        {
          message: 'El lote ya no está disponible. Actualizá el mapa para ver el estado actual.',
          field: 'lote',
          rule: 'erp.disponible',
        },
      ])
    }

    /** Descripción de la fracción para el mail (dato de PG, no del cliente). */
    const detalle = await this.servicio.detalleFraccion(datos.fraccion)
    const fraccionDescripcion = detalle?.fraccion.descripcion ?? `Fracción ${datos.fraccion}`

    /**
     * El lead se persiste SIEMPRE, aunque el SMTP esté caído. El snapshot
     * de precios se toma del ERP en el server (jamás del payload).
     */
    const lead = await Lead.create({
      tipo: 'compra',
      nombre: datos.nombre,
      telefono: datos.telefono,
      comentario: datos.comentario ?? null,
      asunto: `Compra de lote ${datos.fraccion}-${datos.manzana}-${datos.lote}`,
      fraccionCodigo: datos.fraccion,
      manzanaCodigo: datos.manzana,
      loteCodigo: datos.lote,
      precioSnapshot: {
        estado: lote.estado,
        superficie: lote.superficie,
        cantidadCuotas: lote.cantidadCuotas,
        importeCuota: lote.importeCuota,
        entrega: lote.entrega,
        precioCredito: lote.precioCredito,
        precioContado: lote.precioContado,
        capturadoAt: DateTime.now().toISO(),
      },
    })

    try {
      await mail.sendLater(
        new PurchaseRequestNotification({
          nombre: datos.nombre,
          telefono: datos.telefono,
          comentario: datos.comentario ?? null,
          fraccionCodigo: datos.fraccion,
          fraccionDescripcion,
          manzanaCodigo: datos.manzana,
          loteCodigo: datos.lote,
          precio: lote,
        })
      )
      lead.mailEnviadoAt = DateTime.now()
      await lead.save()
    } catch (error) {
      // El mail es secundario: se loguea y el visitante recibe éxito igual.
      logger.error({ err: error, leadId: lead.id }, 'No se pudo encolar el mail de compra')
    }

    session.flash('success', '¡Recibimos tu solicitud! Un asesor te va a contactar.')
    if (this.#esInertia(ctx)) {
      return response.redirect().back()
    }
    return response.json({ ok: true })
  }

  #esInertia({ request }: HttpContext): boolean {
    return Boolean(request.header('x-inertia'))
  }
}
