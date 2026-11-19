/*
|--------------------------------------------------------------------------
| Datos compartidos del sitio público
|--------------------------------------------------------------------------
|
| Todo lo que el layout público (footer, redes) necesita en cada página,
| más helpers para resolver URLs de imágenes subidas (uploads → link).
|
*/

import Upload from '#models/upload'
import Sucursal from '#models/sucursal'
import RedSocial from '#models/red_social'

export interface RedSocialDto {
  id: number
  nombre: string
  url: string
  iconoUrl: string | null
  /** Imagen ampliable de la card del home (null = la card muestra el icono) */
  imagenUrl: string | null
}

export interface SucursalDto {
  id: number
  titulo: string
  coordenadas: { lat: number; lng: number } | null
  direccion: string | null
  horarios: string | null
  telefonos: string | null
}

export interface PiePagina {
  redes: RedSocialDto[]
  sucursales: SucursalDto[]
}

/** URL pública de un upload por su link (token hex). */
export function urlDeLink(link: string | null | undefined): string | null {
  return link ? `/api/file/public/${link}` : null
}

export default class PublicLayoutService {
  /**
   * Resuelve en lote las URLs públicas de varios uploads por id.
   * Devuelve un Map id → URL (solo los ids que existen).
   */
  async urlsDeUploads(ids: (number | null | undefined)[]): Promise<Map<number, string>> {
    const unicos = [...new Set(ids.filter((id): id is number => typeof id === 'number'))]
    if (unicos.length === 0) return new Map()

    const uploads = await Upload.findMany(unicos)
    return new Map(uploads.map((u) => [u.id, `/api/file/public/${u.link}`]))
  }

  /** Redes sociales activas, en orden. */
  async redes(): Promise<RedSocialDto[]> {
    const filas = await RedSocial.query()
      .where('activo', true)
      .orderBy('orden', 'asc')
      .orderBy('id', 'asc')

    /* Una sola consulta para los dos campos imagen de todas las redes. */
    const urls = await this.urlsDeUploads([
      ...filas.map((r) => r.iconoUploadId),
      ...filas.map((r) => r.imagenUploadId),
    ])

    return filas.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      url: r.url,
      iconoUrl: r.iconoUploadId ? (urls.get(r.iconoUploadId) ?? null) : null,
      imagenUrl: r.imagenUploadId ? (urls.get(r.imagenUploadId) ?? null) : null,
    }))
  }

  /** Sucursales activas (estado 'A'). */
  async sucursales(): Promise<SucursalDto[]> {
    const filas = await Sucursal.query().where('estado', 'A').orderBy('id', 'asc')
    return filas.map((s) => ({
      id: s.id,
      titulo: s.titulo ?? '',
      coordenadas: s.coordenadas ?? null,
      direccion: s.direccion,
      horarios: s.horarios,
      telefonos: s.telefonos,
    }))
  }

  /** Props del pie de página común a todas las páginas públicas. */
  async piePagina(): Promise<PiePagina> {
    const [redes, sucursales] = await Promise.all([this.redes(), this.sucursales()])
    return { redes, sucursales }
  }
}
