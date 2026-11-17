/*
|--------------------------------------------------------------------------
| PlanoViewer — visor fullscreen de un plano (admin)
|--------------------------------------------------------------------------
|
| Modal a pantalla completa con Google Maps (satélite) que dibuja un
| FeatureCollection vía map.data, con el mismo estilo que la capa del
| mapa público: manzanas solo contorno, lotes con fill por color de
| estado (o verde de preview cuando aún no hay datos del ERP).
|
| Lo usan dos flujos del alta de planos:
|  - "Previsualizar antes de guardar": geojson armado en el cliente
|  - "Ver" una fracción existente: geojson del detalle público
|
*/

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps'
import { X } from 'lucide-react'
import { usePage } from '@inertiajs/react'

import styles from './plano_viewer.module.css'

/** FeatureCollection con properties.tipo ('fraccion' | 'manzana' | 'lote') */
export interface GeojsonPlano {
  type: 'FeatureCollection'
  features: unknown[]
}

const COLOR_LOTE_DEFAULT = '#99CD68'

function CapaGeoJson({ geojson }: { geojson: GeojsonPlano }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const features = map.data.addGeoJson(geojson)

    map.data.setStyle((feature: google.maps.Data.Feature) => {
      const tipo = feature.getProperty('tipo')
      if (tipo === 'fraccion') {
        return {
          fillOpacity: 0,
          strokeColor: '#facc15',
          strokeOpacity: 0.9,
          strokeWeight: 3,
          clickable: false,
          zIndex: 1,
        }
      }
      if (tipo === 'manzana') {
        return {
          fillOpacity: 0,
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeWeight: 1.5,
          clickable: false,
          zIndex: 2,
        }
      }
      return {
        fillColor: String(feature.getProperty('color') ?? COLOR_LOTE_DEFAULT),
        fillOpacity: 0.65,
        strokeColor: '#ffffff',
        strokeOpacity: 0.75,
        strokeWeight: 1,
        clickable: false,
        zIndex: 3,
      }
    })

    // Encuadre automático a lo importado
    const bounds = new google.maps.LatLngBounds()
    for (const feature of features) {
      feature.getGeometry()?.forEachLatLng((punto) => bounds.extend(punto))
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, 48)

    return () => {
      for (const feature of features) map.data.remove(feature)
    }
  }, [map, geojson])

  return null
}

export interface PlanoViewerProps {
  titulo: string
  subtitulo?: string
  geojson: GeojsonPlano
  onClose: () => void
}

export function PlanoViewer({ titulo, subtitulo, geojson, onClose }: PlanoViewerProps) {
  const { props } = usePage()
  const mapsApiKey = String(
    (props as { config?: { mapsApiKey?: string } }).config?.mapsApiKey ?? ''
  )

  /** Esc cierra + devuelve el foco al disparador (mismo contrato del Modal) */
  const restoreFocusTo = useRef<HTMLElement | null>(null)
  useEffect(() => {
    restoreFocusTo.current = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      restoreFocusTo.current?.focus()
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.titulo}>{titulo}</h3>
          {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
        </div>
        <button className={styles.cerrar} onClick={onClose} aria-label="Cerrar" autoFocus>
          <X size={20} />
        </button>
      </div>

      <div className={styles.mapa}>
        {mapsApiKey ? (
          <APIProvider apiKey={mapsApiKey} libraries={['marker']}>
            <Map
              mapId="DEMO_MAP_ID"
              defaultCenter={{ lat: -25.3, lng: -57.55 }}
              defaultZoom={7}
              mapTypeId="hybrid"
              gestureHandling="greedy"
              disableDefaultUI
              zoomControl
              clickableIcons={false}
            >
              <CapaGeoJson geojson={geojson} />
            </Map>
          </APIProvider>
        ) : (
          <div className={styles.sinApiKey}>
            No hay API key de Google Maps configurada: no se puede mostrar el plano.
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
