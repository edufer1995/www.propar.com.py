/**
 * Wrapper fetch para llamadas JSON (mapa, typeaheads).
 * Tratamiento central: 401 → login, 5xx → toast, offline → aviso.
 * Para navegación/mutaciones de página usar el router de Inertia.
 */
import { router } from '@inertiajs/react'
import { toast } from './swal'
import { texts } from './texts'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export async function http<T>(url: string, init?: RequestInit): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    toast(texts.states.offline, 'warning')
    throw new HttpError(0, 'offline')
  }

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
      credentials: 'same-origin',
      ...init,
    })
  } catch (e) {
    toast(texts.states.offline, 'warning')
    throw new HttpError(0, String(e))
  }

  if (res.status === 401) {
    toast(texts.states.sessionExpired, 'warning')
    router.visit('/auth/login')
    throw new HttpError(401, 'unauthorized')
  }

  if (res.status >= 500) {
    toast(texts.states.serverError, 'error')
    throw new HttpError(res.status, 'server error')
  }

  if (!res.ok) {
    throw new HttpError(res.status, await res.text())
  }

  return (await res.json()) as T
}
