import { useEffect } from 'react'
import { confirmarDescarte } from '~/lib/swal'

/**
 * Cambios sin guardar (ui-standards): mientras `dirty` sea true, el
 * navegador advierte antes de cerrar/recargar la pestaña (beforeunload).
 *
 * Para el cierre de modales usar `confirmarCierre`: resuelve true si se
 * puede cerrar (no hay cambios, o el usuario confirmó descartarlos).
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Requerido por navegadores viejos para mostrar el diálogo
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const confirmarCierre = async (): Promise<boolean> => {
    if (!dirty) return true
    return confirmarDescarte()
  }

  return { confirmarCierre }
}
