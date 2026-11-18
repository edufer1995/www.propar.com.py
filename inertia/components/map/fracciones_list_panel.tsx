import { useEffect, useMemo, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Check, ChevronLeft, ChevronRight, Images, Inbox, MapPin } from 'lucide-react'

import { Button } from '~/components/ui'
import { formatGs } from '~/lib/format'
import { sinAnimaciones } from './camara'

import type { FraccionMapa } from './types'
import styles from './map.module.css'

/** Item de la tira (hoy solo fracciones). */
type ItemStrip = { tipo: 'fraccion'; fraccion: FraccionMapa }

/**
 * Fracciones como carrusel horizontal de cards debajo de la barra de
 * filtros (mismo patrón que el carrusel de lotes), siempre visible.
 * Click en una card agrega/quita la fracción de la selección del mapa;
 * al seleccionar desde el mapa, la tira centra la card correspondiente.
 */
export function FraccionesListPanel({
  fracciones,
  seleccionadas,
  ultimaSeleccionada,
  compacta = false,
  onSelect,
  onVerMedios,
  onLimpiarFiltros,
}: {
  fracciones: FraccionMapa[]
  seleccionadas: number[]
  /**
   * Ficha de un lote abierta: la tira se reduce a miniatura + código y
   * nombre (el protagonismo pasa al lote). El achique lo maneja el CSS
   * de .zonaFraccionesMini; acá solo se suma el código de la fracción,
   * que es lo que ata el lote (135-19-1) con su fracción (135).
   */
  compacta?: boolean
  /** Última fracción agregada (desde el mapa o la tira): se centra. */
  ultimaSeleccionada: number | null
  onSelect: (codigo: number) => void
  /** Abre el lightbox de fotos/videos de la fracción */
  onVerMedios: (codigo: number) => void
  /** CTA del estado vacío: resetea búsqueda, cuota y distritos */
  onLimpiarFiltros?: () => void
}) {
  /**
   * Espejo del carrusel de lotes: la PRIMERA fracción arranca centrada y
   * las siguientes se despliegan hacia la IZQUIERDA. Se logra invirtiendo
   * el orden de las cards y arrancando en el último snap (la primera).
   */
  const lista = useMemo<ItemStrip[]>(() => {
    const items: ItemStrip[] = fracciones.map((fraccion) => ({
      tipo: 'fraccion' as const,
      fraccion,
    }))
    return items.reverse()
  }, [fracciones])

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    skipSnaps: true,
    containScroll: false,
    startIndex: Math.max(0, fracciones.length - 1),
  })

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

  /** Mapa → tira: centra la card de la última fracción seleccionada. */
  useEffect(() => {
    if (!emblaApi || ultimaSeleccionada === null) return
    const indice = lista.findIndex(
      (i) => i.tipo === 'fraccion' && i.fraccion.codigo === ultimaSeleccionada
    )
    if (indice !== -1) emblaApi.scrollTo(indice, sinAnimaciones())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi, ultimaSeleccionada])

  /** Al cambiar la lista (filtros), volver a arrancar en la primera. */
  useEffect(() => {
    if (!emblaApi || lista.length === 0) return
    if (
      ultimaSeleccionada !== null &&
      lista.some((i) => i.tipo === 'fraccion' && i.fraccion.codigo === ultimaSeleccionada)
    ) {
      return
    }
    emblaApi.scrollTo(lista.length - 1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi, lista])

  return (
    <div className={styles.fraccionesStrip} role="list" aria-label="Fracciones disponibles">
      {lista.length === 0 ? (
        /* Misma anatomía que una card de fracción: hereda los tamaños
           hero/compacto de la zona sin estilos propios. */
        <div className={[styles.cardFraccion, styles.fraccionesVacio].join(' ')}>
          <span className={styles.cardFraccionThumb}>
            <span className={styles.cardFraccionThumbVacio}>
              <Inbox aria-hidden />
            </span>
          </span>
          <span className={styles.cardFraccionCuerpo}>
            <span className={styles.cardFraccionNombre}>Sin resultados</span>
            <span
              className={[styles.itemFraccionDistrito, styles.fraccionesVacioTexto].join(' ')}
              title="Ninguna fracción coincide con tu búsqueda y filtros."
            >
              Ninguna fracción coincide con tu búsqueda y filtros.
            </span>
            {onLimpiarFiltros && (
              <span className={styles.itemFraccionDatos}>
                <Button type="button" variant="secondary" onClick={onLimpiarFiltros}>
                  Limpiar filtros
                </Button>
              </span>
            )}
          </span>
        </div>
      ) : (
        <>
          <button
            type="button"
            className={styles.carruselFlecha}
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!puedeAtras}
            aria-label="Fracciones anteriores"
          >
            <ChevronLeft size={22} />
          </button>

          <div className={styles.carrusel} ref={emblaRef}>
            <div className={styles.carruselContenedor}>
              {lista.map((item) => (
                <CardFraccion
                  key={`f-${item.fraccion.codigo}`}
                  fraccion={item.fraccion}
                  activa={seleccionadas.includes(item.fraccion.codigo)}
                  compacta={compacta}
                  onSelect={onSelect}
                  onVerMedios={onVerMedios}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            className={styles.carruselFlecha}
            onClick={() => emblaApi?.scrollNext()}
            disabled={!puedeAdelante}
            aria-label="Más fracciones"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}
    </div>
  )
}

function CardFraccion({
  fraccion,
  activa,
  compacta,
  onSelect,
  onVerMedios,
}: {
  fraccion: FraccionMapa
  activa: boolean
  compacta: boolean
  onSelect: (codigo: number) => void
  onVerMedios: (codigo: number) => void
}) {
  return (
    <div className={styles.carruselSlide}>
      <button
        role="listitem"
        className={[styles.cardFraccion, activa ? styles.cardFraccionActiva : '']
          .filter(Boolean)
          .join(' ')}
        onClick={() => onSelect(fraccion.codigo)}
        aria-pressed={activa}
      >
        {activa && (
          <span className={styles.cardCheck} aria-hidden>
            <Check size={13} strokeWidth={3} />
          </span>
        )}

        {/* Miniatura: portada de la galería o placeholder de marca */}
        <span className={styles.cardFraccionThumb}>
          <img
            src={fraccion.portadaUrl ?? '/img/placeholder.svg'}
            alt={fraccion.portadaUrl ? `Foto de ${fraccion.descripcion}` : ''}
            className={styles.cardFraccionThumbImg}
            loading="lazy"
          />
          {fraccion.totalMedios > 0 && (
            <span
              role="button"
              tabIndex={0}
              className={styles.cardFraccionMedios}
              title="Ver fotos y videos"
              onClick={(e) => {
                e.stopPropagation()
                onVerMedios(fraccion.codigo)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onVerMedios(fraccion.codigo)
                }
              }}
            >
              <Images size={11} aria-hidden /> {fraccion.totalMedios}
            </span>
          )}
        </span>

        <span className={styles.cardFraccionCuerpo}>
          <span className={styles.cardFraccionNombre} title={fraccion.descripcion}>
            {compacta && <span className={styles.cardFraccionCodigo}>{fraccion.codigo}</span>}
            <span className={styles.cardFraccionTexto}>{fraccion.descripcion}</span>
          </span>
          <span className={styles.itemFraccionDistrito}>
            <MapPin size={12} /> {fraccion.distritoNombre}
          </span>
          <span className={styles.itemFraccionDatos}>
            {fraccion.disponibles > 0 ? (
              <>
                <span className={styles.badgeDisponibles}>
                  {fraccion.disponibles} {fraccion.disponibles === 1 ? 'lote' : 'lotes'}
                </span>
                <span className={styles.itemFraccionPrecio}>
                  Desde {formatGs(fraccion.cuotaMinima)}/mes
                </span>
              </>
            ) : (
              /* Fracción sin LIBRES: se muestra igual (paridad con el sitio
                 viejo) pero sin precio, que sería el de lotes ya tomados. */
              <span className={styles.badgeSinLibres}>Sin lotes libres</span>
            )}
          </span>
        </span>
      </button>
    </div>
  )
}
