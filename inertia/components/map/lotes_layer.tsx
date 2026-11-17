import { useEffect } from 'react'
import { useMap } from '@vis.gl/react-google-maps'

import type { DetalleFraccion } from './types'

/**
 * Capa de polígonos de las fracciones seleccionadas vía map.data.addGeoJson
 * (una sola capa vectorial para ~150-400 lotes por fracción: mucho más
 * liviano que un componente <Polygon> por lote). Incluye los polígonos de
 * manzana (features tipo "manzana", solo contorno) y los de lote (fill por
 * estado).
 *
 * La visibilidad por banda de zoom y la transparencia del slider se
 * resuelven en la función de estilo.
 */
export function LotesLayer({
  detalles,
  opacidad,
  verManzanas,
  verLotes,
  estadosOcultos,
  seleccionadoFml,
  onSelect,
}: {
  detalles: DetalleFraccion[]
  opacidad: number
  verManzanas: boolean
  verLotes: boolean
  /** Estados desmarcados en el filtro: sus lotes no se dibujan. */
  estadosOcultos: Set<string>
  seleccionadoFml: string | null
  onSelect: (fml: string) => void
}) {
  const map = useMap()

  /** Carga/descarga del GeoJSON al cambiar el conjunto de fracciones. */
  useEffect(() => {
    if (!map || detalles.length === 0) return
    const features = detalles.flatMap((detalle) => map.data.addGeoJson(detalle.geojson))
    return () => {
      for (const feature of features) map.data.remove(feature)
    }
  }, [map, detalles])

  /** Estilo declarativo: bandas de zoom + transparencia + selección. */
  useEffect(() => {
    if (!map) return
    map.data.setStyle((feature: google.maps.Data.Feature) => {
      if (feature.getProperty('tipo') === 'manzana') {
        return {
          visible: verManzanas,
          fillOpacity: 0,
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeWeight: 1.5,
          clickable: false,
          zIndex: 1,
        }
      }

      const estado = String(feature.getProperty('estado') ?? 'SIN DATOS')
      const seleccionado = feature.getProperty('fml') === seleccionadoFml
      return {
        visible: verLotes && !estadosOcultos.has(estado),
        fillColor: String(feature.getProperty('color')),
        fillOpacity: opacidad,
        strokeColor: '#ffffff',
        strokeOpacity: seleccionado ? 1 : 0.75,
        strokeWeight: seleccionado ? 4 : 1.5,
        zIndex: seleccionado ? 3 : 2,
      }
    })
  }, [map, opacidad, verManzanas, verLotes, estadosOcultos, seleccionadoFml])

  /** Hover (resalta el borde) y click (selecciona el lote con zoom;
   *  las medidas de los lados las muestra la selección, no el hover). */
  useEffect(() => {
    if (!map) return

    const mouseover = map.data.addListener('mouseover', (e: google.maps.Data.MouseEvent) => {
      if (e.feature.getProperty('tipo') !== 'lote') return
      map.data.revertStyle()
      map.data.overrideStyle(e.feature, { strokeWeight: 4, strokeOpacity: 1 })
    })

    const mouseout = map.data.addListener('mouseout', () => {
      map.data.revertStyle()
    })

    const click = map.data.addListener('click', (e: google.maps.Data.MouseEvent) => {
      if (e.feature.getProperty('tipo') !== 'lote') return
      onSelect(String(e.feature.getProperty('fml')))
    })

    return () => {
      mouseover.remove()
      mouseout.remove()
      click.remove()
    }
  }, [map, onSelect])

  return null
}
