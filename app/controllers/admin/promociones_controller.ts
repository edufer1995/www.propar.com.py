import { errors as vineErrors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'

import Promocion from '#models/promocion'
import { urlDeLink } from '#services/public_layout_service'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'
import { promocionValidator } from '#validators/admin/recursos'

/**
 * Promociones del home: se muestran las activas cuya vigencia incluye la
 * fecha de hoy (America/Asuncion). Regla: hasta >= desde. Las marcadas
 * como `modal` además se abren en un modal al entrar al sitio.
 */
export default class PromocionesController extends RecursoController<Promocion> {
  protected config: ConfigRecurso = {
    modelo: Promocion,
    pagina: 'admin/recursos/promociones',
    recurso: 'promociones',
    nombre: 'Promoción',
    genero: 'f',
    busquedaEn: ['titulo', 'descripcion'],
    ordenables: {
      id: 'id',
      titulo: 'titulo',
      vigenteDesde: 'vigente_desde',
      vigenteHasta: 'vigente_hasta',
      activo: 'activo',
      modal: 'modal',
    },
    ordenDefault: { sort: 'id', order: 'desc' },
    camposImagen: [
      { campo: 'imagenUploadId', columna: 'imagenUploadId', spec: 'cardLanzamiento' },
      { campo: 'pdfUploadId', columna: 'pdfUploadId', spec: 'basesPromocion' },
    ],
    precargar: ['imagen', 'pdf'],
  }

  protected serializar(fila: Promocion) {
    return {
      id: fila.id,
      titulo: fila.titulo,
      descripcion: fila.descripcion,
      url: fila.url,
      vigenteDesde: fila.vigenteDesde?.toISODate() ?? null,
      vigenteHasta: fila.vigenteHasta?.toISODate() ?? null,
      activo: fila.activo,
      modal: fila.modal,
      imagenUploadId: fila.imagenUploadId,
      imagenUrl: urlDeLink(fila.imagen?.link),
      pdfUploadId: fila.pdfUploadId,
      pdfUrl: urlDeLink(fila.pdf?.link),
      pdfNombre: fila.pdf?.originalName ?? null,
    }
  }

  protected async validar({ request }: HttpContext) {
    const datos = await request.validateUsing(promocionValidator)

    // vine.date() en Adonis v7 ya devuelve DateTime de luxon
    const desde = datos.vigenteDesde ?? null
    const hasta = datos.vigenteHasta ?? null

    if (desde && hasta && hasta < desde) {
      throw new vineErrors.E_VALIDATION_ERROR([
        {
          field: 'vigenteHasta',
          rule: 'afterOrEqual',
          message: 'La fecha "hasta" debe ser igual o posterior a la fecha "desde"',
        },
      ])
    }

    return {
      titulo: datos.titulo,
      descripcion: datos.descripcion ?? null,
      url: datos.url ?? null,
      vigenteDesde: desde,
      vigenteHasta: hasta,
      activo: datos.activo,
      modal: datos.modal,
    }
  }

  protected csv() {
    return {
      encabezados: [
        'ID',
        'Título',
        'Descripción',
        'URL',
        'Vigente desde',
        'Vigente hasta',
        'Activa',
        'Modal',
        'Bases (PDF)',
      ],
      fila: (fila: Promocion) => [
        fila.id,
        fila.titulo,
        fila.descripcion,
        fila.url,
        fila.vigenteDesde?.toFormat('dd/MM/yyyy') ?? null,
        fila.vigenteHasta?.toFormat('dd/MM/yyyy') ?? null,
        fila.activo ? 'Sí' : 'No',
        fila.modal ? 'Sí' : 'No',
        fila.pdfUploadId ? 'Sí' : 'No',
      ],
    }
  }
}
