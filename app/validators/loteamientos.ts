import vine from '@vinejs/vine'

import { RANGO_PRECIOS } from '#services/rangos_precios'

/**
 * Filtros de la query string de /loteamientos (?texto=&rango=&distrito=
 * &fraccion=). Mismos nombres que manda el SearchBox del home (4a).
 * Todos opcionales: un valor inválido no debe romper la página (el
 * controller descarta los filtros que no validan).
 */
export const filtrosLoteamientosValidator = vine.create({
  texto: vine.string().trim().maxLength(100).optional(),
  rango: vine.enum(Object.keys(RANGO_PRECIOS)).optional(),
  distrito: vine.number().withoutDecimals().positive().optional(),
  /**
   * Una o varias fracciones seleccionadas: "135" o "135-134-101". El
   * separador es el guion (la coma sale como %2C en el link compartido);
   * se sigue aceptando la coma por los links ya publicados.
   */
  fraccion: vine
    .string()
    .trim()
    .regex(/^[1-9]\d*([,-][1-9]\d*)*$/)
    .maxLength(120)
    .optional(),
})

/**
 * Solicitud de compra de un lote (ComprarLoteModal). La terna f-m-l se
 * revalida contra el ERP en el controller: debe existir y estar LIBRE.
 */
export const comprarLoteValidator = vine.create({
  nombre: vine.string().trim().minLength(3).maxLength(80),
  telefono: vine.string().trim().minLength(6).maxLength(30),
  comentario: vine.string().trim().minLength(3).maxLength(2000).optional(),
  fraccion: vine.number().withoutDecimals().positive(),
  manzana: vine.number().withoutDecimals().positive(),
  lote: vine.number().withoutDecimals().positive(),
})
