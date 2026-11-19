import { InfoWindow } from '@vis.gl/react-google-maps'
import { MapPin, Phone, ShoppingCart } from 'lucide-react'

import { IconoWhatsApp } from '~/components/public/icons'
import { formatGs, formatM2 } from '~/lib/format'

import type { PropiedadesLote } from './types'
import styles from './map.module.css'

/**
 * Campos de precio opcionales del popup. ENTREGA queda oculta: Odoo no
 * la tiene (va en 0). El CONTADO se muestra siempre, como el sitio viejo.
 */
export interface CamposVisiblesLote {
  entrega?: boolean
}

/**
 * Popup (InfoWindow) con la ficha del lote clickeado. Si el lote está
 * VENDIDO no se muestran precios (como el sitio viejo).
 */
export function LoteInfoWindow({
  lote,
  fraccionDescripcion,
  whatsapp,
  tel,
  onComprar,
  onClose,
  visibleFields = {},
}: {
  lote: PropiedadesLote
  fraccionDescripcion: string
  whatsapp: string
  tel: string
  onComprar: () => void
  onClose: () => void
  visibleFields?: CamposVisiblesLote
}) {
  if (!lote.centro) return null

  const vendido = lote.estado === 'VENDIDO'
  const libre = lote.estado === 'LIBRE'

  const mensaje = `Hola, me interesa el lote ${lote.fml} de ${fraccionDescripcion}`
  const linkWhatsApp = `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`
  /* Directions API de Maps: abre la app/web con el destino ya cargado y el
     origen en "Tu ubicación", listo para tocar "Cómo llegar". */
  const linkMaps = `https://www.google.com/maps/dir/?api=1&destination=${lote.centro.lat},${lote.centro.lng}&travelmode=driving`

  return (
    <InfoWindow position={lote.centro} onCloseClick={onClose} headerDisabled>
      <div className={styles.popup}>
        <div
          className={styles.popupHeader}
          style={{ backgroundColor: lote.color }}
          data-testid="popup-estado"
        >
          <span>{lote.estado ?? 'SIN DATOS'}</span>
          <button className={styles.popupCerrar} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <table className={styles.popupTabla}>
          <tbody>
            <tr>
              <th>F-M-L</th>
              <td>{lote.fml}</td>
            </tr>
            {lote.superficie !== null && (
              <tr>
                <th>Superficie</th>
                <td>{formatM2(lote.superficie)}</td>
              </tr>
            )}
            {lote.cuotas !== null && (
              <tr>
                <th>Plazos</th>
                <td>{lote.cuotas} meses</td>
              </tr>
            )}
            {!vendido && lote.importeCuota !== null && (
              <tr>
                <th>Mensual</th>
                <td>{formatGs(lote.importeCuota)}</td>
              </tr>
            )}
            {!vendido && lote.precioCredito !== null && (
              <tr>
                <th>Crédito</th>
                <td>{formatGs(lote.precioCredito)}</td>
              </tr>
            )}
            {!vendido && lote.precioContado !== null && (
              <tr>
                <th>Contado</th>
                <td>{formatGs(lote.precioContado)}</td>
              </tr>
            )}
            {/* ENTREGA oculta: Odoo no la tiene. */}
            {!vendido && visibleFields.entrega && (
              <tr>
                <th>Entrega</th>
                <td>—</td>
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
            <IconoWhatsApp size={14} />
          </a>
          <a
            className={`${styles.popupBoton} ${styles.popupBotonTel}`}
            href={`tel:${tel}`}
            aria-label="Llamar"
            title="Llamar"
          >
            <Phone size={13} />
          </a>
          <a
            className={`${styles.popupBoton} ${styles.popupBotonMaps}`}
            href={linkMaps}
            target="_blank"
            rel="noreferrer"
            title="Cómo llegar"
          >
            <MapPin size={13} /> Ver en Maps
          </a>
          {libre && (
            <button
              className={`${styles.popupBoton} ${styles.popupBotonComprar}`}
              onClick={onComprar}
            >
              <ShoppingCart size={13} /> Comprar
            </button>
          )}
        </div>
      </div>
    </InfoWindow>
  )
}
