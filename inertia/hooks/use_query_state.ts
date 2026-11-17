import { useMemo } from 'react'
import { router, usePage } from '@inertiajs/react'

/**
 * Estado de filtros en la query string de la URL (reutilizable).
 *
 * Lee de usePage().url (fuente de verdad) y aplica cambios con router.get
 * + preserveState/preserveScroll, así el back/forward del navegador
 * funciona y el link es compartible.
 */
export function useQueryState() {
  const { url } = usePage()

  const [path, params] = useMemo(() => {
    const idx = url.indexOf('?')
    const pathname = idx === -1 ? url : url.slice(0, idx)
    const search = idx === -1 ? '' : url.slice(idx + 1)
    return [pathname, new URLSearchParams(search)] as const
  }, [url])

  /** Valor actual de un parámetro ('' si no está). */
  const get = (clave: string): string => params.get(clave) ?? ''

  /** Cantidad de parámetros con valor (para el contador de filtros). */
  const activos = [...params.entries()].filter(([, v]) => v !== '').length

  /**
   * Aplica un patch de parámetros (string vacío o null elimina el
   * parámetro) navegando a la misma ruta. `opciones.only` permite un
   * partial reload (ej. solo `registros` en las tablas del admin).
   */
  const aplicar = (
    patch: Record<string, string | null | undefined>,
    opciones?: { only?: string[] }
  ) => {
    const siguiente = new URLSearchParams(params)
    for (const [clave, valor] of Object.entries(patch)) {
      if (valor === null || valor === undefined || valor === '') siguiente.delete(clave)
      else siguiente.set(clave, valor)
    }

    router.get(path, Object.fromEntries(siguiente.entries()), {
      preserveState: true,
      preserveScroll: true,
      ...(opciones?.only ? { only: opciones.only } : {}),
    })
  }

  /** Elimina todos los parámetros (CTA "limpiar filtros"). */
  const limpiar = () => {
    router.get(path, {}, { preserveState: true, preserveScroll: true })
  }

  return { path, get, aplicar, limpiar, activos }
}
