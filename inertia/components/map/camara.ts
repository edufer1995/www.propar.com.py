/// <reference types="google.maps" />

import type { PuntoLatLng } from './types'

/** Vuelo en curso por mapa (para cancelarlo si arranca otro). */
const vuelos = new WeakMap<google.maps.Map, number>()

/** Suavizado easeInOutCubic. */
function suavizar(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * En pantallas chicas (o con "reducir movimiento" del SO) los vuelos se
 * vuelven saltos instantáneos: menos frames, menos batería.
 */
export function sinAnimaciones(): boolean {
  if (typeof window === 'undefined') return true
  return (
    window.matchMedia('(max-width: 767px)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * ¿Hay un vuelo de cámara en curso sobre este mapa?
 *
 * El vuelo largo hace una parábola: se aleja hasta 5 niveles de zoom a
 * mitad de camino. Ese zoom intermedio NO es el usuario alejándose, y
 * quien reaccione a las bandas de zoom (ocultar lotes, cerrar la ficha)
 * tiene que poder distinguirlo.
 */
export function vueloEnCurso(map: google.maps.Map): boolean {
  return vuelos.has(map)
}

/**
 * Vuelo animado de cámara (estilo Google Earth) usando moveCamera con
 * zoom fraccional (mapa vectorial). Interpola centro y zoom con easing;
 * en saltos largos agrega una "parábola": se aleja a mitad de camino y
 * vuelve a acercarse, así el viaje se sigue con la vista.
 *
 * `offsetYPx` corre el destino en pantalla (negativo = el punto queda
 * DEBAJO del centro, para dejarle lugar al popup encima).
 */
export function volarA(
  map: google.maps.Map,
  destino: PuntoLatLng,
  zoomDestino: number,
  opciones: { duracion?: number; offsetYPx?: number } = {}
) {
  const { duracion = 900, offsetYPx = 0 } = opciones

  const previo = vuelos.get(map)
  if (previo !== undefined) cancelAnimationFrame(previo)
  vuelos.delete(map)

  /* Destino corrido en px verticales, convertido a grados en el zoom final. */
  const metrosPorPixel =
    (156543.03392 * Math.cos((destino.lat * Math.PI) / 180)) / Math.pow(2, zoomDestino)
  const objetivo: PuntoLatLng = {
    lat: destino.lat + (-offsetYPx * metrosPorPixel) / 111_320,
    lng: destino.lng,
  }

  const centroInicial = map.getCenter()?.toJSON()
  const zoomInicial = map.getZoom()
  if (sinAnimaciones() || !centroInicial || zoomInicial === undefined) {
    map.moveCamera({ center: objetivo, zoom: zoomDestino })
    return
  }

  /* Parábola: proporcional a la distancia medida en pantalla al zoom final. */
  const gradosDistancia = Math.hypot(
    objetivo.lat - centroInicial.lat,
    (objetivo.lng - centroInicial.lng) * Math.cos((objetivo.lat * Math.PI) / 180)
  )
  const pixelesDistancia = (gradosDistancia * 111_320) / metrosPorPixel
  const parabola = Math.min(5, Math.max(0, Math.log2(pixelesDistancia / 600)))

  const inicio = performance.now()
  const paso = (ahora: number) => {
    const t = Math.min(1, (ahora - inicio) / duracion)
    const e = suavizar(t)
    const zoomBase = zoomInicial + (zoomDestino - zoomInicial) * e
    map.moveCamera({
      center: {
        lat: centroInicial.lat + (objetivo.lat - centroInicial.lat) * e,
        lng: centroInicial.lng + (objetivo.lng - centroInicial.lng) * e,
      },
      zoom: zoomBase - parabola * Math.sin(Math.PI * e),
    })
    if (t < 1) {
      vuelos.set(map, requestAnimationFrame(paso))
    } else {
      vuelos.delete(map)
    }
  }
  vuelos.set(map, requestAnimationFrame(paso))
}
