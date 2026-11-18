/**
 * Único punto de alertas/confirmaciones (SweetAlert2 tematizado).
 * Nunca usar alert()/confirm() nativos ni Swal directo en componentes.
 */
import Swal from 'sweetalert2'
import { texts } from './texts'

const themed = Swal.mixin({
  customClass: { popup: 'propar-swal' },
  confirmButtonColor: 'var(--primary)',
  cancelButtonColor: 'var(--text-muted)',
})

/** Toast de éxito/info: esquina superior, auto-dismiss, no interrumpe. */
export function toast(title: string, icon: 'success' | 'error' | 'info' | 'warning' = 'success') {
  return themed.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    timer: 2500,
    showConfirmButton: false,
  })
}

/** Confirmación destructiva. SIEMPRE antes de eliminar. */
export async function confirmDelete(what?: string): Promise<boolean> {
  const r = await themed.fire({
    title: texts.confirm.deleteTitle,
    text: what ? `Se eliminará: ${what}. ${texts.confirm.deleteBody}` : texts.confirm.deleteBody,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: texts.confirm.deleteConfirm,
    cancelButtonText: texts.common.cancel,
    confirmButtonColor: 'var(--danger)',
  })
  return r.isConfirmed
}

/** Confirmación de eliminación masiva: dice cuántos registros afecta. */
export async function confirmDeleteMasivo(cantidad: number): Promise<boolean> {
  const r = await themed.fire({
    title: `¿Eliminar ${cantidad} registro${cantidad === 1 ? '' : 's'}?`,
    text: texts.confirm.deleteBody,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: texts.confirm.deleteConfirm,
    cancelButtonText: texts.common.cancel,
    confirmButtonColor: 'var(--danger)',
  })
  return r.isConfirmed
}

/** Confirmación genérica no destructiva (ej. resetear una contraseña). */
export async function confirmAccion(
  title: string,
  body: string,
  confirmText: string
): Promise<boolean> {
  const r = await themed.fire({
    title,
    text: body,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: texts.common.cancel,
  })
  return r.isConfirmed
}

/** Confirmación al cerrar un form con cambios sin guardar. */
export async function confirmarDescarte(): Promise<boolean> {
  const r = await themed.fire({
    title: texts.confirm.unsaved,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Salir sin guardar',
    cancelButtonText: 'Seguir editando',
    confirmButtonColor: 'var(--danger)',
  })
  return r.isConfirmed
}

/** Modal informativo que requiere lectura/decisión. */
export function alertModal(
  title: string,
  body?: string,
  icon: 'success' | 'error' | 'info' | 'warning' = 'info'
) {
  return themed.fire({ title, text: body, icon })
}
