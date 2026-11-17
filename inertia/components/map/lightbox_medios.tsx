import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import styles from './map.module.css'

export type MediosFraccion = { fotos: string[]; videos: string[] }

/**
 * Lightbox fullscreen de la galería de una fracción: fotos y videos MP4
 * del server en un solo carrete (fotos primero). Los videos no descargan
 * nada hasta el play (preload="metadata"); flechas/Esc para navegar.
 */
export function LightboxMedios({
  titulo,
  medios,
  onClose,
}: {
  titulo: string
  medios: MediosFraccion
  onClose: () => void
}) {
  const items = useMemo(
    () => [
      ...medios.fotos.map((url) => ({ tipo: 'foto' as const, url })),
      ...medios.videos.map((url) => ({ tipo: 'video' as const, url })),
    ],
    [medios]
  )
  const [indice, setIndice] = useState(0)

  const anterior = useCallback(
    () => setIndice((i) => (i - 1 + items.length) % items.length),
    [items.length]
  )
  const siguiente = useCallback(() => setIndice((i) => (i + 1) % items.length), [items.length])

  /** Teclado: Esc cierra, flechas navegan. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') anterior()
      if (e.key === 'ArrowRight') siguiente()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, anterior, siguiente])

  if (items.length === 0) return null
  const actual = items[Math.min(indice, items.length - 1)]

  return (
    <div
      className={styles.lightbox}
      role="dialog"
      aria-modal="true"
      aria-label={`Galería de ${titulo}`}
      onClick={onClose}
    >
      <div className={styles.lightboxTope} onClick={(e) => e.stopPropagation()}>
        <span className={styles.lightboxTitulo}>{titulo}</span>
        <span className={styles.lightboxContador}>
          {indice + 1} / {items.length}
        </span>
        <button
          type="button"
          className={styles.lightboxCerrar}
          onClick={onClose}
          aria-label="Cerrar galería"
        >
          <X size={20} />
        </button>
      </div>

      <div className={styles.lightboxCuerpo} onClick={(e) => e.stopPropagation()}>
        {items.length > 1 && (
          <button
            type="button"
            className={styles.lightboxFlecha}
            onClick={anterior}
            aria-label="Anterior"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {actual.tipo === 'foto' ? (
          <img
            src={actual.url}
            alt={`${titulo} — foto ${indice + 1}`}
            className={styles.lightboxMedio}
          />
        ) : (
          <video
            key={actual.url}
            src={actual.url}
            className={styles.lightboxMedio}
            controls
            preload="metadata"
            playsInline
          />
        )}

        {items.length > 1 && (
          <button
            type="button"
            className={styles.lightboxFlecha}
            onClick={siguiente}
            aria-label="Siguiente"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  )
}
