import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import styles from './ui.module.css'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  size?: 'md' | 'lg'
  footer?: ReactNode
  children: ReactNode
}

/**
 * Modal según ui-standards: portal, focus-trap básico, Esc para cerrar,
 * devuelve el foco al disparador, casi fullscreen en mobile (CSS).
 */
export function Modal({ open, onClose, title, size = 'md', footer, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const restoreFocusTo = useRef<HTMLElement | null>(null)

  /**
   * onClose suele ser una arrow nueva en cada render del padre: si el
   * efecto dependiera de ella, se re-ejecutaría con cada tecla del form
   * y el autofocus robaría el foco al primer input. Vive en un ref y el
   * efecto depende SOLO de `open`.
   */
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    restoreFocusTo.current = document.activeElement as HTMLElement | null

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'Tab' && ref.current) {
        const focusables = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Autofocus en el primer campo (ui-standards)
    setTimeout(() => {
      ref.current?.querySelector<HTMLElement>('input, select, textarea')?.focus()
    }, 0)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      restoreFocusTo.current?.focus()
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={[styles.modal, size === 'lg' ? styles.modalLg : ''].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
