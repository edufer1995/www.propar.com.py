import { Link } from '@adonisjs/inertia/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCarousel } from './use_carousel'
import styles from './public.module.css'
import layoutStyles from '~/layouts/public.module.css'

export type SlideCarrusel = {
  id: number
  titulo: string | null
  subtitulo: string | null
  descripcion: string | null
  fraccionCodigo: number | null
  /** Enlace propio del botón (ruta interna o http/https); gana sobre la fracción. */
  url: string | null
  imagenUrl: string | null
}

/** Carrusel de portada del home (Embla + autoplay cada 6s). */
export function HeroCarousel({ slides }: { slides: SlideCarrusel[] }) {
  const { viewportRef, selected, scrollPrev, scrollNext, scrollTo } = useCarousel(
    { loop: true },
    6000
  )

  if (slides.length === 0) return null

  return (
    <div className={styles.hero}>
      <div className={styles.embla} ref={viewportRef}>
        <div className={styles.emblaContainer}>
          {slides.map((slide) => (
            <div key={slide.id} className={styles.heroSlide}>
              <div className={styles.heroTexto}>
                {slide.subtitulo && <h3>{slide.subtitulo}</h3>}
                {slide.titulo && <h2>{slide.titulo}</h2>}
                {slide.descripcion && <p>{slide.descripcion}</p>}
                {slide.url ? (
                  <div>
                    {/* Enlace libre cargado en el ABM: <a> común (interno o externo) */}
                    <a
                      href={slide.url}
                      {...(slide.url.startsWith('/')
                        ? {}
                        : { target: '_blank', rel: 'noreferrer' })}
                      className={layoutStyles.navCta}
                    >
                      Conocé más
                    </a>
                  </div>
                ) : (
                  slide.fraccionCodigo !== null && (
                    <div>
                      <Link
                        route="public.loteamientos"
                        qs={{ fraccion: String(slide.fraccionCodigo) }}
                        className={layoutStyles.navCta}
                      >
                        Ver lotes
                      </Link>
                    </div>
                  )
                )}
              </div>
              <div className={styles.heroImagen}>
                {slide.imagenUrl && (
                  <img src={slide.imagenUrl} alt={slide.titulo ?? 'Lanzamiento ABAS'} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${layoutStyles.container} ${styles.heroControles}`}>
        <div className={styles.puntos} style={{ marginTop: 0 }}>
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              className={[styles.punto, i === selected ? styles.puntoActivo : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => scrollTo(i)}
              aria-label={`Ir al slide ${i + 1}`}
            />
          ))}
        </div>
        <div className={styles.flechas}>
          <button className={styles.flecha} onClick={scrollPrev} aria-label="Slide anterior">
            <ChevronLeft size={20} />
          </button>
          <button className={styles.flecha} onClick={scrollNext} aria-label="Slide siguiente">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
