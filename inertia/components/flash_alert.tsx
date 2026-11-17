import { CircleAlert, CircleCheck } from 'lucide-react'
import { usePage } from '@inertiajs/react'

const baseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  padding: '10px 12px',
  borderRadius: 'var(--radius-md)',
  fontSize: 14,
  lineHeight: 1.45,
}

/**
 * Muestra inline los mensajes flash del server (error/success) dentro de una
 * card. Para toasts globales del admin, el AdminLayout ya usa ~/lib/swal.
 */
export function FlashAlert() {
  const { flash } = usePage()

  if (flash.error) {
    return (
      <div
        role="alert"
        style={{
          ...baseStyle,
          color: 'var(--danger)',
          background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)',
        }}
      >
        <CircleAlert size={18} style={{ flex: 'none', marginTop: 2 }} />
        <span>{flash.error}</span>
      </div>
    )
  }

  if (flash.success) {
    return (
      <div
        role="status"
        style={{
          ...baseStyle,
          color: 'var(--success)',
          background: 'color-mix(in srgb, var(--success) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)',
        }}
      >
        <CircleCheck size={18} style={{ flex: 'none', marginTop: 2 }} />
        <span>{flash.success}</span>
      </div>
    )
  }

  return null
}
