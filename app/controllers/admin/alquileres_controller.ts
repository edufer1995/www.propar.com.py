import type { HttpContext } from '@adonisjs/core/http'

import Alquiler from '#models/alquiler'
import Upload from '#models/upload'
import RecursoController, { type ConfigRecurso } from '#controllers/admin/concerns/recurso_base'
import { errorDeCampo } from '#controllers/admin/concerns/imagenes_recurso'
import { alquilerValidator } from '#validators/admin/recursos'

/**
 * Alquileres del sitio público (/alquileres muestra los de estado 'A').
 * Además de los campos del motor tiene ubicación en mapa (MapPicker →
 * coordenadas jsonb {lat,lng}) y galería de fotos (imagenes jsonb =
 * array ordenado de upload ids, spec fotoAlquiler).
 */
export default class AlquileresController extends RecursoController<Alquiler> {
  protected config: ConfigRecurso = {
    modelo: Alquiler,
    pagina: 'admin/recursos/alquileres',
    recurso: 'alquileres',
    nombre: 'Alquiler',
    genero: 'm',
    busquedaEn: ['direccion', 'ubicacion', 'contacto', 'observaciones'],
    ordenables: {
      id: 'id',
      direccion: 'direccion',
      ubicacion: 'ubicacion',
      precioMensual: 'precio_mensual',
      estado: 'estado',
    },
    ordenDefault: { sort: 'id', order: 'desc' },
    camposGaleria: [
      { campo: 'imagenesUploadIds', columna: 'imagenes', spec: 'fotoAlquiler', maximo: 12 },
    ],
  }

  /** URLs de la galería de las filas a serializar, resueltas en UN lote */
  #urls = new Map<number, string>()

  protected async antesDeSerializar(filas: Alquiler[]) {
    const ids = filas.flatMap((a) => (Array.isArray(a.imagenes) ? (a.imagenes as number[]) : []))
    const unicos = [...new Set(ids)]
    const uploads = unicos.length ? await Upload.findMany(unicos) : []
    this.#urls = new Map(uploads.map((u) => [u.id, `/api/file/public/${u.link}`]))
  }

  protected serializar(fila: Alquiler) {
    return {
      id: fila.id,
      direccion: fila.direccion,
      ubicacion: fila.ubicacion,
      contacto: fila.contacto,
      precioMensual: fila.precioMensual ? Number(fila.precioMensual) : null,
      precioGarantia: fila.precioGarantia ? Number(fila.precioGarantia) : null,
      habitaciones: fila.habitaciones,
      banos: fila.banos,
      cocinas: fila.cocinas,
      observaciones: fila.observaciones,
      expensas: Boolean(fila.expensas),
      balcon: Boolean(fila.balcon),
      lat: (fila.coordenadas as { lat?: number } | null)?.lat ?? null,
      lng: (fila.coordenadas as { lng?: number } | null)?.lng ?? null,
      activo: fila.estado === 'A',
      imagenes: (Array.isArray(fila.imagenes) ? (fila.imagenes as number[]) : []).map((id) => ({
        id,
        url: this.#urls.get(id) ?? null,
      })),
    }
  }

  protected async validar({ request }: HttpContext) {
    const datos = await request.validateUsing(alquilerValidator)

    const tieneLat = datos.lat !== null && datos.lat !== undefined
    const tieneLng = datos.lng !== null && datos.lng !== undefined
    if (tieneLat !== tieneLng) {
      throw errorDeCampo('lat', 'La ubicación necesita latitud y longitud (o ninguna)')
    }

    return {
      direccion: datos.direccion,
      ubicacion: datos.ubicacion ?? null,
      contacto: datos.contacto ?? null,
      precioMensual: datos.precioMensual ?? null,
      precioGarantia: datos.precioGarantia ?? null,
      habitaciones: datos.habitaciones ?? null,
      banos: datos.banos ?? null,
      cocinas: datos.cocinas ?? null,
      observaciones: datos.observaciones ?? null,
      expensas: datos.expensas,
      balcon: datos.balcon,
      coordenadas: tieneLat ? { lat: datos.lat, lng: datos.lng } : null,
      estado: datos.activo ? 'A' : 'E',
    }
  }

  protected csv() {
    return {
      encabezados: [
        'ID',
        'Dirección',
        'Ubicación',
        'Contacto',
        'Precio mensual',
        'Garantía',
        'Habitaciones',
        'Baños',
        'Cocinas',
        'Expensas',
        'Balcón',
        'Latitud',
        'Longitud',
        'Fotos',
        'Activo',
      ],
      fila: (fila: Alquiler) => [
        fila.id,
        fila.direccion,
        fila.ubicacion,
        fila.contacto,
        fila.precioMensual ? Number(fila.precioMensual) : null,
        fila.precioGarantia ? Number(fila.precioGarantia) : null,
        fila.habitaciones,
        fila.banos,
        fila.cocinas,
        fila.expensas ? 'Sí' : 'No',
        fila.balcon ? 'Sí' : 'No',
        (fila.coordenadas as { lat?: number } | null)?.lat ?? null,
        (fila.coordenadas as { lng?: number } | null)?.lng ?? null,
        Array.isArray(fila.imagenes) ? fila.imagenes.length : 0,
        fila.estado === 'A' ? 'Sí' : 'No',
      ],
    }
  }
}
