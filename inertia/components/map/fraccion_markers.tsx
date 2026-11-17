import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import { MarkerClusterer, type Renderer } from '@googlemaps/markerclusterer'

import type { FraccionMapa } from './types'
import styles from './map.module.css'

/**
 * Markers de fracciones (círculo con el código, estilo marca) agrupados
 * con MarkerClusterer: alejado se ven clusters con el contador; al acercar
 * se separan en fracciones individuales (click en un cluster hace zoom).
 * Las fracciones seleccionadas se resaltan con el degradado de marca.
 *
 * Los AdvancedMarkerElement se crean imperativamente y su `map` lo
 * administra SOLO el clusterer. Con los <AdvancedMarker> de React
 * (@vis.gl) el componente re-asigna `map` en cada render y deshace el
 * agrupado del clusterer (bug verificado: 73 markers sueltos, 0 clusters).
 */
export function FraccionMarkers({
  fracciones,
  seleccionadas,
  onSelect,
}: {
  fracciones: FraccionMapa[]
  seleccionadas: number[]
  onSelect: (codigo: number) => void
}) {
  const map = useMap()

  /** onSelect en un ref: su identidad cambia por render y no debe
   *  reconstruir los markers ni el clusterer. */
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  /** div de cada marker por código, para re-estilar sin reconstruir. */
  const divsRef = useRef<Record<number, HTMLDivElement>>({})

  useEffect(() => {
    if (!map) return

    /** Cluster: círculo degradado de marca con la cantidad de fracciones. */
    const renderer: Renderer = {
      render: ({ count, position }) => {
        const div = document.createElement('div')
        div.className = styles.cluster
        div.textContent = String(count)
        return new google.maps.marker.AdvancedMarkerElement({
          position,
          content: div,
          zIndex: 1000 + count,
        })
      },
    }

    divsRef.current = {}
    const markers = fracciones.map((fraccion) => {
      const div = document.createElement('div')
      div.className = styles.fraccionMarker
      div.textContent = String(fraccion.codigo)
      divsRef.current[fraccion.codigo] = div
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: fraccion.centro,
        content: div,
        title: `${fraccion.descripcion} — ${fraccion.disponibles} lotes disponibles`,
        gmpClickable: true,
      })
      marker.addListener('click', () => onSelectRef.current(fraccion.codigo))
      return marker
    })

    const clusterer = new MarkerClusterer({ map, markers, renderer })

    return () => {
      divsRef.current = {}
      clusterer.clearMarkers()
      clusterer.setMap(null)
    }
  }, [map, fracciones])

  /** Resalte de las fracciones seleccionadas (sin reconstruir markers). */
  useEffect(() => {
    for (const [codigo, div] of Object.entries(divsRef.current)) {
      const activa = seleccionadas.includes(Number(codigo))
      div.className = [styles.fraccionMarker, activa ? styles.fraccionMarkerActiva : '']
        .filter(Boolean)
        .join(' ')
    }
  }, [seleccionadas, fracciones])

  return null
}
