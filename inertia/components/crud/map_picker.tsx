/*
|--------------------------------------------------------------------------
| MapPicker — selector de coordenadas en un mapa chico (campo latlng)
|--------------------------------------------------------------------------
|
| Mapa Google embebido en el modal del CRUD: un click coloca el marker
| (arrastrable) y devuelve {lat, lng}; "Quitar ubicación" limpia el valor.
| Reutiliza la API key compartida (config.mapsApiKey) con el mismo
| APIProvider de @vis.gl que usa el mapa público de /loteamientos.
|
*/

import { useCallback } from 'react'
import { usePage } from '@inertiajs/react'
import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps'
import { MapPinOff } from 'lucide-react'

import { Button } from '~/components/ui'
import styles from './crud.module.css'

/** Vista inicial sin valor: Asunción y alrededores. */
const CENTRO_DEFAULT = { lat: -25.3, lng: -57.55 }
const ZOOM_DEFAULT = 10
const ZOOM_CON_VALOR = 15

/** Mismo Map ID de desarrollo que el mapa público (AdvancedMarker lo exige). */
const MAP_ID = 'DEMO_MAP_ID'

export interface MapPickerProps {
  /** Valor actual ('' cuando no hay ubicación) */
  lat: number | ''
  lng: number | ''
  onChange: (valor: { lat: number | ''; lng: number | '' }) => void
}

function redondear(valor: number): number {
  return Math.round(valor * 1e8) / 1e8
}

export function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const { props } = usePage()
  const mapsApiKey = String(
    (props as { config?: { mapsApiKey?: string } }).config?.mapsApiKey ?? ''
  )

  const tieneValor = lat !== '' && lng !== ''
  const posicion = tieneValor ? { lat: Number(lat), lng: Number(lng) } : null

  const colocar = useCallback(
    (nueva: google.maps.LatLngLiteral | null) => {
      if (!nueva) return
      onChange({ lat: redondear(nueva.lat), lng: redondear(nueva.lng) })
    },
    [onChange]
  )

  if (!mapsApiKey) {
    return (
      <span className={styles.mapPickerAviso}>
        No hay API key de Google Maps configurada: cargá las coordenadas a mano.
      </span>
    )
  }

  return (
    <div className={styles.mapPicker}>
      <div className={styles.mapPickerMapa}>
        <APIProvider apiKey={mapsApiKey} libraries={['marker']}>
          <Map
            mapId={MAP_ID}
            defaultCenter={posicion ?? CENTRO_DEFAULT}
            defaultZoom={posicion ? ZOOM_CON_VALOR : ZOOM_DEFAULT}
            gestureHandling="cooperative"
            disableDefaultUI
            zoomControl
            clickableIcons={false}
            onClick={(e) => colocar(e.detail.latLng)}
          >
            {posicion && (
              <AdvancedMarker
                position={posicion}
                draggable
                onDragEnd={(e) =>
                  colocar(e.latLng ? { lat: e.latLng.lat(), lng: e.latLng.lng() } : null)
                }
              />
            )}
          </Map>
        </APIProvider>
      </div>
      <div className={styles.mapPickerPie}>
        <span className={styles.mapPickerAviso}>
          {tieneValor
            ? 'Arrastrá el marker o hacé click para reubicarlo'
            : 'Hacé click en el mapa para marcar la ubicación'}
        </span>
        {tieneValor && (
          <Button type="button" variant="ghost" onClick={() => onChange({ lat: '', lng: '' })}>
            <MapPinOff size={16} /> Quitar ubicación
          </Button>
        )}
      </div>
    </div>
  )
}
