import { formatNumber } from '~/lib/format'
import { ladosDeAnillo } from '~/lib/geo'

import { MapOverlay } from './map_overlay'
import { lotesDelDetalle, type DetalleFraccion } from './types'
import styles from './map.module.css'

/**
 * Overlays de texto sobre el mapa según banda de zoom:
 *  - >= 15: código de cada manzana
 *  - >= 17: código de cada lote + medidas de los lados (m) del lote
 *    SELECCIONADO (click, no hover)
 */
export function DetalleOverlays({
  detalle,
  verManzanas,
  verLotes,
  estadosOcultos,
  seleccionadoFml,
}: {
  detalle: DetalleFraccion
  verManzanas: boolean
  verLotes: boolean
  /** Estados desmarcados en el filtro: sus lotes no muestran overlays. */
  estadosOcultos: Set<string>
  seleccionadoFml: string | null
}) {
  const lotes = lotesDelDetalle(detalle).filter(
    (l) => !estadosOcultos.has(l.properties.estado ?? 'SIN DATOS')
  )
  const loteMedidas = seleccionadoFml
    ? lotes.find((l) => l.properties.fml === seleccionadoFml)
    : undefined

  return (
    <>
      {verManzanas &&
        detalle.manzanas.map(
          (manzana) =>
            manzana.centro && (
              <MapOverlay key={`m-${manzana.codigo}`} position={manzana.centro}>
                <span className={styles.overlayManzana}>{manzana.codigo}</span>
              </MapOverlay>
            )
        )}

      {verLotes &&
        lotes.map(
          (lote) =>
            lote.properties.centro && (
              <MapOverlay key={lote.properties.fml} position={lote.properties.centro}>
                <span className={styles.overlayLote}>{lote.properties.loteCodigo}</span>
              </MapOverlay>
            )
        )}

      {verLotes &&
        loteMedidas &&
        ladosDeAnillo(loteMedidas.geometry.coordinates[0]).map((lado, i) => (
          <MapOverlay key={`${loteMedidas.properties.fml}-lado-${i}`} position={lado.medio}>
            <span className={styles.overlayMedida}>{formatNumber(lado.metros)} m</span>
          </MapOverlay>
        ))}
    </>
  )
}
