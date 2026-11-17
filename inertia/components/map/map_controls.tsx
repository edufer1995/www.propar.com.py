import { useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  Earth,
  Maximize,
  Minimize,
  PanelBottomClose,
  PanelBottomOpen,
  PanelTopClose,
  PanelTopOpen,
  Settings,
  X,
} from 'lucide-react'

import { RangeSlider } from '~/components/ui'

import type { ColorEstado } from './types'
import styles from './map.module.css'

/**
 * Botón circular de la columna flotante. `activo` lo pinta con el
 * degradado de marca —el control está cambiando lo que se ve— y `badge`
 * agrega el contador de la esquina. Mismo lenguaje para todos: si está
 * encendido, se nota sin tener que abrirlo.
 */
function BotonMapa({
  etiqueta,
  activo = false,
  badge,
  separado = false,
  expandido,
  onClick,
  children,
}: {
  /** Va como title y como aria-label (mismo texto, una sola verdad) */
  etiqueta: string
  activo?: boolean
  /** Número de la burbuja; se omite si no hay nada que contar */
  badge?: number
  /** Deja aire arriba: separa la acción destructiva del resto */
  separado?: boolean
  /** Solo para el que abre el panel (el resto no es expandible) */
  expandido?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={[
        styles.ajustesBoton,
        activo ? styles.ajustesBotonActivo : '',
        separado ? styles.ajustesBotonSeparado : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      aria-expanded={expandido}
      aria-pressed={expandido === undefined ? activo : undefined}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className={styles.ajustesBadge} aria-hidden>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}

/**
 * Columna flotante de controles del mapa (derecha, centrada vertical).
 * Orden: lo que más se toca arriba, la acción irreversible abajo y
 * separada — cards de lote → pantalla completa → preferencias → volver
 * al inicio. (Los filtros NO viven acá: su disparador está en la barra
 * de búsqueda, junto a la tira de fracciones.)
 */
export function MapControls({
  verPanelBusqueda,
  fraccionesOcultas,
  onTogglePanelBusqueda,
  hayCardsLote,
  verCardsLote,
  cardsLoteOcultas,
  onToggleCardsLote,
  opacidad,
  onOpacidad,
  colores,
  onVolverAlInicio,
}: {
  /** Panel superior (buscador + tira de fracciones) visible u oculto */
  verPanelBusqueda: boolean
  /** Fracciones que quedan escondidas al plegar (badge del toggle) */
  fraccionesOcultas: number
  onTogglePanelBusqueda: () => void
  /** Hay lotes dibujados: sin ellos el toggle no tiene nada que ocultar */
  hayCardsLote: boolean
  verCardsLote: boolean
  /** Cards que quedan escondidas (badge del toggle apagado) */
  cardsLoteOcultas: number
  onToggleCardsLote: () => void
  /** 0..1 */
  opacidad: number
  onOpacidad: (valor: number) => void
  colores: ColorEstado[]
  /** Reset de la página: vista país + sin selección, sin filtros */
  onVolverAlInicio: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const { soportada, activa, alternar } = usePantallaCompleta()

  return (
    <div className={styles.ajustes}>
      {abierto && (
        <div className={styles.ajustesPanel} role="dialog" aria-label="Preferencias del mapa">
          <div className={styles.ajustesHeader}>
            <span className={styles.panelTitulo}>Preferencias del mapa</span>
            <button
              className={styles.ajustesCerrar}
              onClick={() => setAbierto(false)}
              aria-label="Cerrar preferencias"
            >
              <X size={16} />
            </button>
          </div>

          <div className={styles.controlSlider}>
            <RangeSlider
              label="Transparencia de lotes"
              min={0}
              max={10}
              value={Math.round(opacidad * 10)}
              onChange={(v) => onOpacidad(v / 10)}
              valueLabel={`${Math.round(opacidad * 100)}%`}
            />
          </div>

          <ul className={styles.leyenda}>
            {colores.map((c) => (
              <li key={c.estado}>
                <span className={styles.leyendaColor} style={{ backgroundColor: c.color }} />
                {c.estado}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.ajustesBotones}>
        {/* Panel superior (buscador + fracciones): plegarlo despeja el
            mapa para mostrar una fracción completa y su entorno. La
            preferencia persiste entre visitas (la guarda la página). */}
        <BotonMapa
          etiqueta={
            verPanelBusqueda
              ? 'Ocultar el buscador y las fracciones'
              : `Mostrar el buscador y las fracciones (${fraccionesOcultas} ocultas)`
          }
          activo={!verPanelBusqueda}
          badge={verPanelBusqueda ? undefined : fraccionesOcultas}
          onClick={onTogglePanelBusqueda}
        >
          {verPanelBusqueda ? <PanelTopClose size={20} /> : <PanelTopOpen size={20} />}
        </BotonMapa>

        {/* Cards de lote: liberar la franja de abajo para ver el mapa
            completo. Solo aparece con lotes en pantalla; si se van (zoom
            fuera de banda o deselección) el botón se va con ellos. */}
        {hayCardsLote && (
          <BotonMapa
            etiqueta={
              verCardsLote
                ? 'Ocultar las cards de lotes'
                : `Mostrar las cards de lotes (${cardsLoteOcultas} ocultas)`
            }
            activo={!verCardsLote}
            badge={verCardsLote ? undefined : cardsLoteOcultas}
            onClick={onToggleCardsLote}
          >
            {verCardsLote ? <PanelBottomClose size={20} /> : <PanelBottomOpen size={20} />}
          </BotonMapa>
        )}

        {soportada && (
          <BotonMapa
            etiqueta={activa ? 'Salir de pantalla completa' : 'Pantalla completa'}
            activo={activa}
            onClick={alternar}
          >
            {activa ? <Minimize size={20} /> : <Maximize size={20} />}
          </BotonMapa>
        )}

        <BotonMapa
          etiqueta="Preferencias del mapa"
          expandido={abierto}
          activo={abierto}
          onClick={() => setAbierto((v) => !v)}
        >
          <Settings size={20} />
        </BotonMapa>

        {/* Separado del resto: vuelve a la vista país Y limpia todo, así
            que el título lo dice y el aire evita el toque sin querer. */}
        <BotonMapa
          etiqueta="Volver al inicio (quita filtros y fracciones abiertas)"
          separado
          onClick={onVolverAlInicio}
        >
          <Earth size={20} />
        </BotonMapa>
      </div>
    </div>
  )
}

/** Suscripción al cambio de pantalla completa (útil para los dos snapshots). */
function suscribirPantallaCompleta(alCambiar: () => void) {
  document.addEventListener('fullscreenchange', alCambiar)
  return () => document.removeEventListener('fullscreenchange', alCambiar)
}

/**
 * Pantalla completa de toda la página (no solo del <div> del mapa): así los
 * paneles, el carrusel y los filtros —que son hermanos del mapa— siguen
 * visibles. Se lee con useSyncExternalStore porque el estado vive en el
 * documento; en SSR vale false y el botón aparece recién al hidratar (la
 * API no existe en iOS Safari, donde queda oculto).
 */
function usePantallaCompleta() {
  const activa = useSyncExternalStore(
    suscribirPantallaCompleta,
    () => document.fullscreenElement !== null,
    () => false
  )
  const soportada = useSyncExternalStore(
    suscribirPantallaCompleta,
    () => document.fullscreenEnabled === true,
    () => false
  )

  const alternar = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {})
      return
    }
    void document.documentElement.requestFullscreen().catch(() => {})
  }

  return { soportada, activa, alternar }
}
