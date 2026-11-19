import { useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'

import { formatGs, formatM2 } from '~/lib/format'
import { sinAnimaciones } from './camara'

import type { FeatureLoteamiento, PropiedadesLote } from './types'
import styles from './map.module.css'

function CardLote({
  lote,
  activo,
  compacta,
  onClick,
}: {
  lote: PropiedadesLote
  activo: boolean
  /** Con un lote abierto la ficha completa está en el popup: la card se
      reduce a código + estado para no tapar el mapa. */
  compacta: boolean
  onClick: () => void
}) {
  const vendido = lote.estado === 'VENDIDO'
  return (
    <button
      className={[
        styles.cardLote,
        compacta ? styles.cardLoteCompacta : '',
        activo ? styles.cardLoteActiva : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      aria-pressed={activo}
    >
      {activo && (
        <span className={styles.cardCheck} aria-hidden>
          <Check size={13} strokeWidth={3} />
        </span>
      )}

      <span className={styles.cardLoteHeader}>
        <span className={styles.cardLoteFml}>{lote.fml}</span>
        {/* El estado nunca parte el código en varias líneas: si el texto
            es largo se corta con … y queda completo en el tooltip. */}
        <span
          className={styles.cardLoteEstado}
          style={{ backgroundColor: lote.color }}
          title={lote.estado ?? 'SIN DATOS'}
        >
          {lote.estado ?? 'SIN DATOS'}
        </span>
      </span>
      {/* En compacto estas líneas se pliegan por CSS (no se desmontan):
          así el achique de la card puede animar. */}
      <span className={styles.cardLoteDatos}>
        {lote.superficie !== null && <span>{formatM2(lote.superficie)}</span>}
        {lote.cuotas !== null && <span>{lote.cuotas} cuotas</span>}
      </span>
      {!vendido && lote.importeCuota !== null && (
        <span className={styles.cardLotePrecio}>{formatGs(lote.importeCuota)}/mes</span>
      )}
      {!vendido && lote.precioCredito !== null && (
        <span className={styles.cardLoteCredito}>Crédito {formatGs(lote.precioCredito)}</span>
      )}
      {!vendido && lote.precioContado !== null && (
        <span className={styles.cardLoteCredito}>Contado {formatGs(lote.precioContado)}</span>
      )}
    </button>
  )
}

/**
 * Carrusel Embla flotante con los lotes de las fracciones seleccionadas.
 *
 * Elegir un lote es SIEMPRE explícito: se toca su card o su polígono.
 * Recorrer la lista —arrastrando o con las flechas— no selecciona nada ni
 * mueve la cámara; antes sí lo hacía y no se podía mirar qué había más
 * adelante sin quedar comprometido con una selección (y con su vuelo).
 * La sincronización que queda es la otra: al elegir en el mapa, el
 * carrusel centra la card correspondiente.
 *
 * Con la ficha de un lote abierta el carrusel pasa a modo compacto: las
 * cards se achican a código + estado, porque el detalle ya está en el
 * popup. Al cerrar la ficha vuelven a su tamaño.
 */
export function LotesCarousel({
  lotes,
  seleccionadoFml,
  compacto,
  onSelect,
}: {
  lotes: (FeatureLoteamiento & { properties: PropiedadesLote })[]
  seleccionadoFml: string | null
  /** Ficha del lote abierta: las cards se reducen mientras dure. */
  compacto: boolean
  onSelect: (fml: string) => void
}) {
  /** containScroll: false permite centrar también los primeros/últimos. */
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    skipSnaps: true,
    containScroll: false,
  })

  /** Habilitación de las flechas según la posición de scroll. */
  const [puedeAtras, setPuedeAtras] = useState(false)
  const [puedeAdelante, setPuedeAdelante] = useState(false)
  useEffect(() => {
    if (!emblaApi) return
    const actualizar = () => {
      setPuedeAtras(emblaApi.canScrollPrev())
      setPuedeAdelante(emblaApi.canScrollNext())
    }
    actualizar()
    emblaApi.on('select', actualizar)
    emblaApi.on('reInit', actualizar)
    return () => {
      emblaApi.off('select', actualizar)
      emblaApi.off('reInit', actualizar)
    }
  }, [emblaApi])

  /** Mapa → carrusel: al seleccionar en el mapa, centrar la card. */
  useEffect(() => {
    if (!emblaApi || !seleccionadoFml) return
    const indice = lotes.findIndex((l) => l.properties.fml === seleccionadoFml)
    if (indice === -1 || indice === emblaApi.selectedScrollSnap()) return
    emblaApi.scrollTo(indice, sinAnimaciones())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi, seleccionadoFml])

  if (lotes.length === 0) return null

  return (
    <div className={styles.carruselWrap}>
      <button
        type="button"
        className={styles.carruselFlecha}
        onClick={() => emblaApi?.scrollPrev()}
        disabled={!puedeAtras}
        aria-label="Lote anterior"
      >
        <ChevronLeft size={22} />
      </button>

      <div className={styles.carrusel} ref={emblaRef} aria-label="Lotes de la fracción">
        <div className={styles.carruselContenedor}>
          {lotes.map((lote) => (
            <div className={styles.carruselSlide} key={lote.properties.fml}>
              <CardLote
                lote={lote.properties}
                activo={lote.properties.fml === seleccionadoFml}
                compacta={compacto}
                onClick={() => onSelect(lote.properties.fml)}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={styles.carruselFlecha}
        onClick={() => emblaApi?.scrollNext()}
        disabled={!puedeAdelante}
        aria-label="Lote siguiente"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  )
}
