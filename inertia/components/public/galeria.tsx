import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { useCarousel } from './use_carousel'
import styles from './public.module.css'

/** Galería Embla anidada de una card (fotos de un alquiler). */
export function Galeria({ imagenes, alt }: { imagenes: string[]; alt: string }) {
  const { viewportRef, selected, scrollPrev, scrollNext, scrollTo } = useCarousel({
    loop: imagenes.length > 1,
  })

  if (imagenes.length === 0) {
    return (
      <div className={styles.galeria}>
        <div className={styles.galeriaVacia} aria-label="Sin fotos">
          <ImageOff size={32} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.galeria}>
      <div className={`${styles.embla} ${styles.galeriaViewport}`} ref={viewportRef}>
        <div className={styles.emblaContainer} style={{ height: '100%' }}>
          {imagenes.map((src, i) => (
            <div key={src} className={styles.galeriaSlide}>
              <img src={src} alt={`${alt} — foto ${i + 1}`} loading="lazy" />
            </div>
          ))}
        </div>
      </div>

      {imagenes.length > 1 && (
        <>
          <button
            className={`${styles.galeriaFlecha} ${styles.galeriaFlechaIzq}`}
            onClick={scrollPrev}
            aria-label="Foto anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className={`${styles.galeriaFlecha} ${styles.galeriaFlechaDer}`}
            onClick={scrollNext}
            aria-label="Foto siguiente"
          >
            <ChevronRight size={18} />
          </button>
          <div className={styles.galeriaPuntos}>
            {imagenes.map((src, i) => (
              <button
                key={src}
                className={[styles.punto, i === selected ? styles.puntoActivo : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => scrollTo(i)}
                aria-label={`Ir a la foto ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
