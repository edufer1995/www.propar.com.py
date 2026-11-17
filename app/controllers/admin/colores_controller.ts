import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'

import LoteColor from '#models/lote_color'

/**
 * Colores por estado de lote (tabla lotes_colores, 14 estados fijos).
 * Alimentan el fill de los polígonos y la leyenda del mapa público
 * /loteamientos. Solo se edita el color: los estados los define el ERP.
 *
 * Se guarda todo junto (un submit con la lista completa) dentro de una
 * transacción: o se aplican todos los cambios o ninguno.
 */
export const coloresValidator = vine.create({
  colores: vine.array(
    vine.object({
      id: vine.number().withoutDecimals().positive(),
      color: vine
        .string()
        .trim()
        .regex(/^#[0-9a-fA-F]{6}$/),
    })
  ),
})

export default class ColoresController {
  async index({ inertia }: HttpContext) {
    const filas = await LoteColor.query().orderBy('id', 'asc')

    return inertia.render('admin/colores', {
      colores: filas.map((c) => ({
        id: c.id,
        estado: c.estado,
        color: c.color,
        descripcion: c.descripcion,
      })),
    })
  }

  async update(ctx: HttpContext) {
    const { colores } = await ctx.request.validateUsing(coloresValidator)

    await db.transaction(async (trx) => {
      for (const cambio of colores) {
        const fila = await LoteColor.findOrFail(cambio.id, { client: trx })
        fila.color = cambio.color.toUpperCase()
        await fila.save()
      }
    })

    ctx.session.flash('success', 'Colores actualizados correctamente')
    return ctx.response.redirect().back()
  }
}
