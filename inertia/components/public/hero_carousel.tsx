import { Link } from '@adonisjs/inertia/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCarousel } from './use_carousel'
import styles from './public.module.css'

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

/**
 * Portada fija de la maqueta: se muestra mientras el admin no cargue
 * slides propios en Carruseles.
 */
function PortadaPorDefecto() {
  return (
    <div className={styles.hero}>
      <div className={styles.heroSlide}>
        <div className={styles.heroImagen}>
          <img src="/img/hero-lote.jpg" alt="" />
        </div>
        <div className={styles.heroTexto}>
          <h1>Tu lote propio, en cuotas que podés pagar</h1>
          <p>
            Loteamientos en las zonas de mayor desarrollo del país, con financiación propia y
            atención en nuestras sucursales.
          </p>
          <div className={styles.heroCtas}>
            <Link route="public.loteamientos" className={styles.heroBtn}>
              Ver lotes en el mapa
            </Link>
            <Link route="public.quienesSomos" className={styles.heroBtnBlanco}>
              Conocer más
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Botón de un slide: enlace libre del ABM o, si no hay, los lotes de la fracción. */
function AccionSlide({ slide }: { slide: SlideCarrusel }) {
  if (slide.url) {
    const externo = !slide.url.startsWith('/')
    return (
      <a
        href={slide.url}
        className={styles.heroBtn}
        {...(externo ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        Conocer más
      </a>
    )
  }
  if (slide.fraccionCodigo !== null) {
    return (
      <Link
        route="public.loteamientos"
        qs={{ fraccion: String(slide.fraccionCodigo) }}
        className={styles.heroBtn}
      >
        Ver lotes en el mapa
      </Link>
    )
  }
  return (
    <Link route="public.loteamientos" className={styles.heroBtn}>
      Ver lotes en el mapa
    </Link>
  )
}

/** Carrusel de portada del home (Embla + autoplay cada 6s). */
export function HeroCarousel({ slides }: { slides: SlideCarrusel[] }) {
  const { viewportRef, selected, scrollPrev, scrollNext, scrollTo } = useCarousel(
    { loop: true },
    6000
  )

  if (slides.length === 0) return <PortadaPorDefecto />

  return (
    <div className={styles.hero}>
      <div className={styles.embla} ref={viewportRef}>
        <div className={styles.emblaContainer}>
          {slides.map((slide, i) => (
            <div key={slide.id} className={styles.heroSlide}>
              <div className={styles.heroImagen}>
                <img src={slide.imagenUrl ?? '/img/hero-lote.jpg'} alt="" />
              </div>
              <div className={styles.heroTexto}>
                {slide.subtitulo && <span className={styles.heroTag}>{slide.subtitulo}</span>}
                {/* Un solo h1 por página: el del primer slide. */}
                {slide.titulo && (i === 0 ? <h1>{slide.titulo}</h1> : <h2>{slide.titulo}</h2>)}
                {slide.descripcion && <p>{slide.descripcion}</p>}
                <div className={styles.heroCtas}>
                  <AccionSlide slide={slide} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <div className={styles.heroControles}>
          <button className={styles.flecha} onClick={scrollPrev} aria-label="Slide anterior">
            <ChevronLeft size={20} />
          </button>
          <div className={styles.puntos}>
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
          <button className={styles.flecha} onClick={scrollNext} aria-label="Slide siguiente">
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
