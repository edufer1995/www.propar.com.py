import { useEffect, useRef } from 'react'
import { InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { MarkerClusterer, type Renderer } from '@googlemaps/markerclusterer'
import { Images, Phone } from 'lucide-react'

import { IconoWhatsApp } from '~/components/public/icons'
import { formatGs } from '~/lib/format'

import type { AlquilerMapa } from './types'
import styles from './map.module.css'

/** Llave (lucide key-round) como SVG plano para los markers imperativos. */
const SVG_LLAVE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>'

/**
 * Markers de alquileres (círculo naranja con llave) agrupados con su
 * propio MarkerClusterer (cluster naranja), igual que las fracciones.
 * Mismo patrón imperativo: los <AdvancedMarker> de React re-asignan
 * `map` y deshacen el agrupado, así que el clusterer es el único dueño.
 */
export function AlquilerMarkers({
  alquileres,
  seleccionadoId,
  onSelect,
}: {
  alquileres: AlquilerMapa[]
  /** Alquiler con la ficha abierta: su marker se resalta */
  seleccionadoId: number | null
  onSelect: (id: number) => void
}) {
  const map = useMap()

  /** onSelect en un ref: su identidad cambia por render y no debe
   *  reconstruir los markers ni el clusterer. */
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  /** div de cada marker por id, para re-estilar sin reconstruir. */
  const divsRef = useRef<Record<number, HTMLDivElement>>({})

  useEffect(() => {
    if (!map) return

    /** Cluster: círculo naranja con la cantidad de alquileres. */
    const renderer: Renderer = {
      render: ({ count, position }) => {
        const div = document.createElement('div')
        div.className = `${styles.cluster} ${styles.clusterAlquiler}`
        div.textContent = String(count)
        return new google.maps.marker.AdvancedMarkerElement({
          position,
          content: div,
          zIndex: 1000 + count,
        })
      },
    }

    divsRef.current = {}
    const markers = alquileres.map((alquiler) => {
      const div = document.createElement('div')
      div.className = styles.alquilerMarker
      div.innerHTML = SVG_LLAVE
      divsRef.current[alquiler.id] = div
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: alquiler.centro,
        content: div,
        title: alquiler.direccion ?? 'Alquiler',
        gmpClickable: true,
      })
      marker.addListener('click', () => onSelectRef.current(alquiler.id))
      return marker
    })

    const clusterer = new MarkerClusterer({ map, markers, renderer })

    return () => {
      divsRef.current = {}
      clusterer.clearMarkers()
      clusterer.setMap(null)
    }
  }, [map, alquileres])

  /** Resalte del alquiler abierto (sin reconstruir markers). */
  useEffect(() => {
    for (const [id, div] of Object.entries(divsRef.current)) {
      const activo = Number(id) === seleccionadoId
      div.className = [styles.alquilerMarker, activo ? styles.alquilerMarkerActivo : '']
        .filter(Boolean)
        .join(' ')
    }
  }, [seleccionadoId, alquileres])

  return null
}

/**
 * Popup (InfoWindow) con la ficha del alquiler: portada, dirección,
 * precios y ambientes del ABM + WhatsApp/llamar + acceso a la galería.
 */
export function AlquilerInfoWindow({
  alquiler,
  whatsapp,
  tel,
  onVerFotos,
  onClose,
}: {
  alquiler: AlquilerMapa
  whatsapp: string
  tel: string
  onVerFotos: () => void
  onClose: () => void
}) {
  const titulo = alquiler.direccion ?? 'Alquiler'
  const mensaje = `Hola, me interesa el alquiler de ${titulo}`
  const linkWhatsApp = `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`

  const ambientes = [
    alquiler.habitaciones !== null ? `${alquiler.habitaciones} hab.` : null,
    alquiler.banos !== null ? `${alquiler.banos} baños` : null,
    alquiler.cocinas !== null ? `${alquiler.cocinas} coc.` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <InfoWindow position={alquiler.centro} onCloseClick={onClose} headerDisabled>
      <div className={styles.popup}>
        <div className={`${styles.popupHeader} ${styles.popupHeaderAlquiler}`}>
          <span>ALQUILER</span>
          <button className={styles.popupCerrar} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {alquiler.imagenes[0] && (
          <img src={alquiler.imagenes[0]} alt={titulo} className={styles.popupPortada} />
        )}

        <table className={styles.popupTabla}>
          <tbody>
            <tr>
              <th>Dirección</th>
              <td>{titulo}</td>
            </tr>
            {/* La zona repetiría la dirección cuando el ABM cargó lo mismo en ambas. */}
            {alquiler.ubicacion && alquiler.ubicacion !== alquiler.direccion && (
              <tr>
                <th>Zona</th>
                <td>{alquiler.ubicacion}</td>
              </tr>
            )}
            {ambientes && (
              <tr>
                <th>Ambientes</th>
                <td>{ambientes}</td>
              </tr>
            )}
            {alquiler.precioMensual !== null && (
              <tr>
                <th>Mensual</th>
                <td>{formatGs(alquiler.precioMensual)}</td>
              </tr>
            )}
            {alquiler.precioGarantia !== null && (
              <tr>
                <th>Garantía</th>
                <td>{formatGs(alquiler.precioGarantia)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className={styles.popupBotones}>
          <a
            className={`${styles.popupBoton} ${styles.popupBotonWhatsApp}`}
            href={linkWhatsApp}
            target="_blank"
            rel="noreferrer"
            aria-label="Consultar por WhatsApp"
            title="Consultar por WhatsApp"
          >
            <IconoWhatsApp size={16} />
          </a>
          <a
            className={`${styles.popupBoton} ${styles.popupBotonTel}`}
            href={`tel:${tel.replace(/[^\d+]/g, '')}`}
            aria-label="Llamar"
            title="Llamar"
          >
            <Phone size={14} />
          </a>
          {alquiler.imagenes.length > 0 && (
            <button
              type="button"
              className={`${styles.popupBoton} ${styles.popupBotonMaps}`}
              onClick={onVerFotos}
            >
              <Images size={14} /> Fotos ({alquiler.imagenes.length})
            </button>
          )}
        </div>
      </div>
    </InfoWindow>
  )
}
