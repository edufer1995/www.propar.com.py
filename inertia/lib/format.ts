/**
 * Helpers de formato es-PY — ÚNICO lugar donde se formatea.
 * Guardar en UTC, formatear al mostrar (America/Asuncion).
 */

const TZ = 'America/Asuncion'

const gsFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('es-PY')

export function formatGs(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return gsFormatter.format(n)
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return numberFormatter.format(n)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ,
  }).format(d)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-PY', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: TZ,
  }).format(d)
}

/** "1.234 m²" */
export function formatM2(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${numberFormatter.format(n)} m²`
}
