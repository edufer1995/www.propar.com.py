import { useEffect, useState } from 'react'
import { useMap } from '@vis.gl/react-google-maps'

/**
 * Bandas de zoom del mapa:
 *  - zoom < 15 → solo markers/clusters de fracciones
 *  - zoom >= 15 → polígonos de manzanas con su código
 *  - zoom >= 17 → polígonos de lotes con código y medidas al hover
 *
 * Un nivel más abajo que los cortes del sitio viejo (16/18): alejando el
 * mapa, los lotes de la fracción se seguían dibujando un rato más y no
 * desaparecían apenas se soltaba el zoom. Los polígonos son los de las
 * fracciones ya cargadas (tope MAX_FRACCIONES), así que dibujarlos desde
 * más lejos no agrega geometría, solo la muestra antes.
 */
export function useZoomBands() {
  const map = useMap()
  const [zoom, setZoom] = useState<number>(() => map?.getZoom() ?? 6)

  useEffect(() => {
    if (!map) return
    const sincronizar = () => setZoom(map.getZoom() ?? 6)
    const inicial = google.maps.event.addListenerOnce(map, 'idle', sincronizar)
    const listener = map.addListener('zoom_changed', sincronizar)
    return () => {
      inicial.remove()
      listener.remove()
    }
  }, [map])

  return {
    zoom,
    verManzanas: zoom >= 15,
    verLotes: zoom >= 17,
  }
}
