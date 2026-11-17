import type { HttpContext } from '@adonisjs/core/http'
import type { LucidModel, LucidRow, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

import Lead from '#models/lead'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'

/** Tipos de lead que generan los formularios públicos */
export const TIPOS_LEAD = ['compra', 'contacto', 'vender'] as const

const TIPO_ETIQUETAS: Record<string, string> = {
  compra: 'Compra de lote',
  contacto: 'Contacto',
  vender: 'Venta de propiedad',
}

const formatoGs = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  maximumFractionDigits: 0,
})

/**
 * Leads comerciales (solo lectura + export + eliminar). Los crean los
 * formularios públicos de contacto y de compra de lote — acá no hay
 * crear/editar: las rutas store/update no existen.
 */
export default class LeadsController extends RecursoController<Lead> {
  protected config: ConfigRecurso = {
    modelo: Lead,
    pagina: 'admin/recursos/leads',
    recurso: 'leads',
    nombre: 'Lead',
    genero: 'm',
    busquedaEn: ['nombre', 'telefono', 'email', 'asunto'],
    ordenables: { id: 'id', nombre: 'nombre', tipo: 'tipo', createdAt: 'created_at' },
    ordenDefault: { sort: 'createdAt', order: 'desc' },
  }

  protected filtrar(query: ModelQueryBuilderContract<LucidModel, LucidRow>, ctx: HttpContext) {
    const tipo = String(ctx.request.input('tipo') ?? '')
    if ((TIPOS_LEAD as readonly string[]).includes(tipo)) {
      query.where('tipo', tipo)
    }
  }

  protected async propsExtra() {
    return {
      tiposLead: TIPOS_LEAD.map((valor) => ({ valor, etiqueta: TIPO_ETIQUETAS[valor] })),
    }
  }

  protected serializar(fila: Lead) {
    return {
      id: fila.id,
      tipo: fila.tipo,
      tipoEtiqueta: TIPO_ETIQUETAS[fila.tipo] ?? fila.tipo,
      nombre: fila.nombre,
      telefono: fila.telefono,
      email: fila.email,
      asunto: fila.asunto,
      comentario: fila.comentario,
      loteFml: this.#loteFml(fila),
      precioResumen: this.#precioResumen(fila),
      fecha: fila.createdAt.toISO(),
    }
  }

  /** Leads es solo lectura: no existen rutas store/update que lleguen acá. */
  protected async validar(): Promise<Record<string, unknown>> {
    throw new Error('Los leads no se crean ni editan desde el admin')
  }

  protected csv() {
    return {
      encabezados: [
        'ID',
        'Tipo',
        'Nombre',
        'Teléfono',
        'Email',
        'Asunto',
        'Lote (F-M-L)',
        'Precio (snapshot)',
        'Comentario',
        'Fecha',
      ],
      fila: (fila: Lead) => [
        fila.id,
        TIPO_ETIQUETAS[fila.tipo] ?? fila.tipo,
        fila.nombre,
        fila.telefono,
        fila.email,
        fila.asunto,
        this.#loteFml(fila),
        this.#precioResumen(fila),
        fila.comentario,
        fila.createdAt.setZone('America/Asuncion').toFormat('dd/MM/yyyy HH:mm'),
      ],
    }
  }

  /** "F12 M3 L45" si el lead referencia un lote puntual */
  #loteFml(fila: Lead): string | null {
    if (!fila.fraccionCodigo) return null
    const partes = [`F${fila.fraccionCodigo}`]
    if (fila.manzanaCodigo) partes.push(`M${fila.manzanaCodigo}`)
    if (fila.loteCodigo) partes.push(`L${fila.loteCodigo}`)
    return partes.join(' ')
  }

  /** Resumen corto del precio congelado al momento de la consulta */
  #precioResumen(fila: Lead): string | null {
    const snapshot = fila.precioSnapshot as {
      importeCuota?: number | string | null
      cantidadCuotas?: number | string | null
      precioContado?: number | string | null
      precioCredito?: number | string | null
    } | null

    if (!snapshot) return null

    const cuota = Number(snapshot.importeCuota)
    const cuotas = Number(snapshot.cantidadCuotas)
    if (cuota > 0 && cuotas > 0) {
      return `${formatoGs.format(cuota)} × ${cuotas} cuotas`
    }

    const contado = Number(snapshot.precioContado ?? snapshot.precioCredito)
    return contado > 0 ? formatoGs.format(contado) : null
  }
}
