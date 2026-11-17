import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMap } from '@vis.gl/react-google-maps'

import type { PuntoLatLng } from './types'

/**
 * Overlay React posicionado en una coordenada del mapa (equivalente
 * moderno del DraggableOverlay del sitio viejo): un OverlayView con un
 * div al que se portalea el children. No captura eventos del mouse
 * (pointer-events: none) para no romper el hover de los polígonos.
 */
export function MapOverlay({ position, children }: { position: PuntoLatLng; children: ReactNode }) {
  const map = useMap()
  const [contenedor, setContenedor] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!map) return

    const div = document.createElement('div')
    div.style.position = 'absolute'
    div.style.transform = 'translate(-50%, -50%)'
    div.style.pointerEvents = 'none'
    div.style.zIndex = '5'

    class Overlay extends google.maps.OverlayView {
      onAdd() {
        /* overlayMouseTarget: por ENCIMA de los polígonos de map.data
           (en overlayLayer los rótulos quedan teñidos por el fill) pero
           por DEBAJO del floatPane, donde vive el popup (InfoWindow). */
        this.getPanes()?.overlayMouseTarget.appendChild(div)
        setContenedor(div)
      }

      draw() {
        const proyeccion = this.getProjection()
        if (!proyeccion) return
        const punto = proyeccion.fromLatLngToDivPixel(new google.maps.LatLng(position))
        if (!punto) return
        div.style.left = `${punto.x}px`
        div.style.top = `${punto.y}px`
      }

      onRemove() {
        div.remove()
        setContenedor(null)
      }
    }

    const overlay = new Overlay()
    overlay.setMap(map)
    return () => overlay.setMap(null)
    // La dependencia real es la coordenada (lat/lng), no la identidad del objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, position.lat, position.lng])

  return contenedor ? createPortal(children, contenedor) : null
}
