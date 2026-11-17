import { type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './public.module.css'

/** Encabezado de sección del sitio público, con flechas opcionales. */
export function Seccion({
  titulo,
  subtitulo,
  onPrev,
  onNext,
  children,
}: {
  titulo: string
  subtitulo?: string
  onPrev?: () => void
  onNext?: () => void
  children: ReactNode
}) {
  return (
    <section className={styles.seccion}>
      <div className={styles.seccionHeader}>
        <div>
          <h2 className={styles.seccionTitulo}>{titulo}</h2>
          {subtitulo && <p className={styles.seccionSub}>{subtitulo}</p>}
        </div>
        {onPrev && onNext && (
          <div className={styles.flechas}>
            <button className={styles.flecha} onClick={onPrev} aria-label="Anterior">
              <ChevronLeft size={20} />
            </button>
            <button className={styles.flecha} onClick={onNext} aria-label="Siguiente">
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
      {children}
    </section>
  )
}
