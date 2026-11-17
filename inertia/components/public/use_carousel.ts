import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import type { EmblaOptionsType } from 'embla-carousel'

/**
 * Wrapper de Embla con lo que usan todos los carruseles del sitio:
 * índice seleccionado (para los puntos), prev/next y autoplay opcional
 * (la interacción reinicia el timer).
 */
export function useCarousel(options?: EmblaOptionsType, autoplayMs?: number) {
  const [viewportRef, embla] = useEmblaCarousel({ loop: true, ...options })
  /** Embla arranca en el snap 0: el estado inicial ya está sincronizado. */
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (!embla) return
    const onSelect = () => setSelected(embla.selectedScrollSnap())
    embla.on('select', onSelect)
    embla.on('reInit', onSelect)
    return () => {
      embla.off('select', onSelect)
      embla.off('reInit', onSelect)
    }
  }, [embla])

  /**
   * Autoplay simple: interval que avanza; la interacción lo reinicia.
   * Con "reducir movimiento" del SO no rota solo (a diferencia de
   * sinAnimaciones() del mapa, acá NO se corta por ancho: en el celular
   * el giro automático es justamente lo que se busca).
   */
  useEffect(() => {
    if (!embla || !autoplayMs) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    /**
     * Embla apaga el loop cuando no hay slides suficientes para llenar el
     * viewport dos veces (ej.: 4 redes con 3 visibles). Sin esto el
     * autoplay caminaría hasta el final y ahí se quedaría clavado: al no
     * poder avanzar, se rebobina al principio.
     */
    const avanzar = () => {
      if (embla.canScrollNext()) embla.scrollNext()
      else embla.scrollTo(0)
    }

    let timer = window.setInterval(avanzar, autoplayMs)
    const reset = () => {
      window.clearInterval(timer)
      timer = window.setInterval(avanzar, autoplayMs)
    }
    embla.on('pointerDown', reset)
    return () => {
      embla.off('pointerDown', reset)
      window.clearInterval(timer)
    }
  }, [embla, autoplayMs])

  const scrollPrev = useCallback(() => embla?.scrollPrev(), [embla])
  const scrollNext = useCallback(() => embla?.scrollNext(), [embla])
  const scrollTo = useCallback((i: number) => embla?.scrollTo(i), [embla])

  return { viewportRef, embla, selected, scrollPrev, scrollNext, scrollTo }
}
