import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import LoteDistrito from '#models/lote_distrito'
import Upload from '#models/upload'
import UploadService from '#services/upload_service'
import LotesErpRepository from '#repositories/erp/lotes_erp_repository'
import {
  eliminarUploads,
  errorDeCampo,
  resolverImagenes,
  type CampoImagen,
} from '#controllers/admin/concerns/imagenes_recurso'
import { loteDistritoValidator } from '#validators/admin/singletons'
import { IMAGEN_SPECS, describirSpec } from '#validators/rules/imagen_specs'

const CAMPO_IMAGEN = {
  campo: 'imagenUploadId',
  columna: 'imagenUploadId',
  spec: 'tileDistrito',
} as const satisfies CampoImagen

/**
 * Editor de los tiles "Lotes por distrito" del home: cada tile mapea
 * un distrito del ERP (distrito_codigo) a una imagen (spec tileDistrito).
 * El admin decide cuántos tiles hay (agregar/quitar); el home acomoda
 * la grilla a la cantidad.
 */
@inject()
export default class LotesDistritosController {
  constructor(private erp: LotesErpRepository) {}

  private uploadService = new UploadService()

  async index({ inertia }: HttpContext) {
    const [tiles, distritos] = await Promise.all([
      LoteDistrito.query().orderBy('id', 'asc'),
      this.erp.distritos(),
    ])

    const ids = tiles
      .map((t) => t.imagenUploadId)
      .filter((id): id is number => typeof id === 'number')
    const uploads = ids.length ? await Upload.findMany([...new Set(ids)]) : []
    const urls = new Map(uploads.map((u) => [u.id, `/api/file/public/${u.link}`]))

    const nombrePorCodigo = new Map(distritos.map((d) => [d.codigo, d.nombre]))
    const spec = IMAGEN_SPECS[CAMPO_IMAGEN.spec]

    return inertia.render('admin/lotes_distritos', {
      tiles: tiles.map((t) => ({
        id: t.id,
        distritoCodigo: t.distritoCodigo,
        distritoNombre: nombrePorCodigo.get(t.distritoCodigo) ?? `Distrito ${t.distritoCodigo}`,
        imagenUploadId: t.imagenUploadId,
        imagenUrl: t.imagenUploadId ? (urls.get(t.imagenUploadId) ?? null) : null,
      })),
      distritos: distritos.map((d) => ({ codigo: d.codigo, nombre: d.nombre })),
      specs: { [CAMPO_IMAGEN.spec]: { ...spec, texto: describirSpec(spec) } },
    })
  }

  /** El unique de distrito_codigo, como error de validación y no como 500. */
  async #exigirDistritoLibre(codigo: number, idActual?: number) {
    const ocupado = await LoteDistrito.query()
      .where('distritoCodigo', codigo)
      .if(idActual !== undefined, (q) => q.whereNot('id', idActual!))
      .first()
    if (ocupado) {
      throw errorDeCampo('distritoCodigo', 'Ese distrito ya está en el home')
    }
  }

  async store(ctx: HttpContext) {
    const datos = await ctx.request.validateUsing(loteDistritoValidator)
    await this.#exigirDistritoLibre(datos.distritoCodigo)
    const imagenes = await resolverImagenes(ctx, [CAMPO_IMAGEN], null)

    await LoteDistrito.create({ distritoCodigo: datos.distritoCodigo, ...imagenes.columnas })

    ctx.session.flash('success', 'Distrito agregado al home')
    return ctx.response.redirect().back()
  }

  async update(ctx: HttpContext) {
    const tile = await LoteDistrito.findOrFail(ctx.params.id)
    const datos = await ctx.request.validateUsing(loteDistritoValidator)
    await this.#exigirDistritoLibre(datos.distritoCodigo, tile.id)

    const imagenes = await resolverImagenes(ctx, [CAMPO_IMAGEN], tile)

    tile.merge({ distritoCodigo: datos.distritoCodigo, ...imagenes.columnas })
    await tile.save()

    await eliminarUploads(this.uploadService, imagenes.eliminar)

    ctx.session.flash('success', 'Tile de distrito actualizado correctamente')
    return ctx.response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const tile = await LoteDistrito.findOrFail(ctx.params.id)
    const imagenId = tile.imagenUploadId

    await tile.delete()
    if (imagenId) await eliminarUploads(this.uploadService, [imagenId])

    ctx.session.flash('success', 'Distrito quitado del home')
    return ctx.response.redirect().back()
  }
}
