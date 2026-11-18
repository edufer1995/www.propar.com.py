import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
} from 'react'
import { usePage } from '@inertiajs/react'
import { Seo } from '~/components/public/seo'
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps'

import PublicFullscreenLayout from '~/layouts/public_fullscreen'
import { Spinner } from '~/components/ui'
import { http } from '~/lib/http'
import { toast } from '~/lib/swal'
import { texts } from '~/lib/texts'
import { useQueryState } from '~/hooks/use_query_state'

import { volarA, vueloEnCurso } from '~/components/map/camara'
import { FraccionMarkers } from '~/components/map/fraccion_markers'
import { LotesLayer } from '~/components/map/lotes_layer'
import { DetalleOverlays } from '~/components/map/detalle_overlays'
import { LightboxMedios } from '~/components/map/lightbox_medios'
import { LoteInfoWindow } from '~/components/map/lote_info_window'
import {
  BuscadorBarra,
  contarFiltrosActivos,
  esEstadoLibre,
  FiltrosModal,
  type DistritoDisponible,
  type EstadoDisponible,
  type RangoCuotaOpcion,
} from '~/components/map/filtros_mapa'
import { FraccionesListPanel } from '~/components/map/fracciones_list_panel'
import { MapControls } from '~/components/map/map_controls'
import { LotesCarousel } from '~/components/map/lotes_carousel'
import { ComprarLoteModal } from '~/components/map/comprar_lote_modal'
import { useZoomBands } from '~/components/map/use_zoom_bands'
import {
  lotesDelDetalle,
  type ColorEstado,
  type DetalleFraccion,
  type FiltrosLoteamientos,
  type FraccionMapa,
  type OpcionDistrito,
} from '~/components/map/types'
import styles from '~/components/map/map.module.css'

/** Centro/zoom iniciales del sitio viejo (Paraguay entero). */
/* El lat va ~2° al norte del centro real del país: las cards de
   bienvenida tapan la franja superior, así el mapa "baja" en pantalla. */
const CENTRO_INICIAL = { lat: -23.45, lng: -57.18916 }
const ZOOM_INICIAL = 6
/** Zoom al seleccionar una única fracción (igual que el viejo). */
const ZOOM_FRACCION = 18
/** Zoom al seleccionar un lote: lo máximo con imagen satelital confiable. */
const ZOOM_LOTE = 20
/** Tope de fracciones simultáneas (cada una carga su detalle + ERP). */
const MAX_FRACCIONES = 8
/**
 * AdvancedMarker exige un Map ID. DEMO_MAP_ID es el valor documentado por
 * Google para desarrollo; si se quiere estilo propio, crear un Map ID en
 * la consola de Google Cloud y reemplazarlo acá.
 */
const MAP_ID = 'DEMO_MAP_ID'

type LoteamientosProps = {
  fracciones: FraccionMapa[]
  distritos: OpcionDistrito[]
  colores: ColorEstado[]
  rangosCuota: RangoCuotaOpcion[]
  filtros: FiltrosLoteamientos
  contadores: { fracciones: number; lotesDisponibles: number }
}

/** Preferencia guardada del panel de búsqueda (visible | oculto). */
const CLAVE_PANEL_BUSQUEDA = 'propar:mapa:panel-busqueda'
/** Evento propio para que el toggle notifique el cambio en el mismo tab. */
const EVENTO_PANEL_BUSQUEDA = 'propar:panel-busqueda'

function leerPanelBusqueda(): boolean {
  try {
    return localStorage.getItem(CLAVE_PANEL_BUSQUEDA) !== 'oculto'
  } catch {
    return true
  }
}

function suscribirPanelBusqueda(alCambiar: () => void) {
  window.addEventListener(EVENTO_PANEL_BUSQUEDA, alCambiar)
  window.addEventListener('storage', alCambiar)
  return () => {
    window.removeEventListener(EVENTO_PANEL_BUSQUEDA, alCambiar)
    window.removeEventListener('storage', alCambiar)
  }
}

/** Normaliza para búsqueda: minúsculas y sin acentos. */
function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Resultado del fetch de un detalle. Sin entrada en el cache = cargando. */
type EstadoDetalle = { estado: 'error' } | { estado: 'ok'; detalle: DetalleFraccion }

/**
 * Parse de ?fraccion= a códigos únicos válidos. Se escribe con guiones
 * ("135-134") porque la coma sale escapada como %2C y ensucia el link que
 * la gente comparte; los links viejos con coma se siguen entendiendo.
 */
function parseSeleccion(valor: string): number[] {
  if (!valor) return []
  const codigos = valor
    .split(/[,-]/)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0)
  return [...new Set(codigos)]
}

function Pantalla(props: LoteamientosProps) {
  const { fracciones, colores, rangosCuota, filtros } = props
  const page = usePage()
  const whatsappVentas = String(page.props.whatsappVentas ?? '')
  const telVentas = String(page.props.telVentas ?? '')

  const map = useMap()
  const { verManzanas, verLotes } = useZoomBands()
  const qs = useQueryState()

  /** Fracciones seleccionadas: viven en la URL (?fraccion=) para deep-links. */
  const seleccion = useMemo(() => parseSeleccion(filtros.fraccion), [filtros.fraccion])

  /** Detalles por fracción (cache: no se re-pide al des/re-seleccionar). */
  const [detalles, setDetalles] = useState<Record<number, EstadoDetalle>>({})
  const [seleccionadoFml, setSeleccionadoFml] = useState<string | null>(null)
  const [popupAbierto, setPopupAbierto] = useState(false)
  const [modalCompra, setModalCompra] = useState(false)
  const [opacidad, setOpacidad] = useState(0.7)
  /** Estados de lote desmarcados en el filtro (ocultos en mapa y cards). */
  const [estadosOcultos, setEstadosOcultos] = useState<Set<string>>(new Set())
  /** Búsqueda y rango de cuota (inician desde el deep-link del home). */
  const [busqueda, setBusqueda] = useState(filtros.texto)
  const [rango, setRango] = useState(filtros.rango)
  /**
   * Distritos desmarcados: sus fracciones se ocultan del mapa y la tira.
   * Un deep-link ?distrito= del home inicia con solo ese distrito activo.
   */
  const [distritosOcultos, setDistritosOcultos] = useState<Set<number>>(() => {
    if (!filtros.distrito) return new Set()
    const elegido = Number(filtros.distrito)
    return new Set(fracciones.map((f) => f.distritoCodigo).filter((c) => c !== elegido))
  })
  /** Última fracción agregada: la tira centra su card (en deep-links,
   *  la última de la selección inicial). */
  const [ultimaSeleccionada, setUltimaSeleccionada] = useState<number | null>(() => {
    const inicial = parseSeleccion(filtros.fraccion)
    return inicial.length ? inicial[inicial.length - 1] : null
  })
  /** Fracción cuyo lightbox de fotos/videos está abierto. */
  const [lightboxCodigo, setLightboxCodigo] = useState<number | null>(null)
  /** Fracciones: toggle de visibilidad (markers + cards de la tira). */
  const [verFracciones, setVerFracciones] = useState(true)
  /** Carrusel de cards de lote: se puede plegar para despejar el mapa. */
  const [verCardsLote, setVerCardsLote] = useState(true)
  /**
   * Panel superior (buscador + tira de fracciones): se puede plegar para
   * mostrar la fracción completa y su entorno sin nada encima. La elección
   * queda guardada (localStorage) porque es una preferencia de quien
   * muestra el mapa a clientes, no un estado de la sesión. Mismo patrón
   * que usePantallaCompleta: el estado vive fuera de React, así que se lee
   * con useSyncExternalStore (en SSR vale visible y se ajusta al hidratar).
   */
  const verPanelBusqueda = useSyncExternalStore(
    suscribirPanelBusqueda,
    leerPanelBusqueda,
    () => true
  )
  const alternarPanelBusqueda = useCallback(() => {
    try {
      localStorage.setItem(CLAVE_PANEL_BUSQUEDA, leerPanelBusqueda() ? 'oculto' : 'visible')
    } catch {}
    window.dispatchEvent(new Event(EVENTO_PANEL_BUSQUEDA))
  }, [])
  /** Modal de filtros (lo dispara el botón de la botonera flotante). */
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

  /**
   * Cambio de selección: descarta el lote seleccionado si su fracción ya
   * no está (ajuste de estado durante el render, sin efecto).
   */
  const claveSeleccion = seleccion.join(',')
  const [clavePrevia, setClavePrevia] = useState(claveSeleccion)
  if (claveSeleccion !== clavePrevia) {
    setClavePrevia(claveSeleccion)
    setSeleccionadoFml(null)
    setPopupAbierto(false)
  }

  /**
   * Alejar el zoom por debajo de la banda de lotes borra la selección: si
   * el lote ya no se dibuja en el mapa, su ficha, su card y el filtro de
   * estados tampoco tienen por qué seguir ahí (mismo ajuste durante el
   * render, sin efecto). Al volver a acercar no reaparece un popup viejo.
   *
   * Excepción: mientras vuela la cámara. El vuelo largo se aleja hasta 5
   * niveles a mitad de camino, y ese zoom de paso no es el usuario
   * alejándose — sin este guard, elegir un lote lejano se cancelaba solo
   * durante su propio vuelo.
   */
  const [verLotesPrevio, setVerLotesPrevio] = useState(verLotes)
  if (verLotes !== verLotesPrevio) {
    setVerLotesPrevio(verLotes)
    if (!verLotes && !(map && vueloEnCurso(map))) {
      setSeleccionadoFml(null)
      setPopupAbierto(false)
    }
  }

  /**
   * Carga los detalles que faltan de las fracciones seleccionadas.
   * `enVuelo` evita fetches duplicados; el resultado siempre se cachea
   * (aunque la fracción se haya deseleccionado mientras cargaba).
   */
  const enVuelo = useRef(new Set<number>())
  useEffect(() => {
    for (const codigo of seleccion) {
      if (detalles[codigo] || enVuelo.current.has(codigo)) continue
      enVuelo.current.add(codigo)
      http<DetalleFraccion>(`/loteamientos/fracciones/${codigo}/detalle`)
        .then((data) => {
          setDetalles((prev) => ({ ...prev, [codigo]: { estado: 'ok', detalle: data } }))
        })
        .catch(() => {
          setDetalles((prev) => ({ ...prev, [codigo]: { estado: 'error' } }))
        })
        .finally(() => enVuelo.current.delete(codigo))
    }
  }, [seleccion, detalles])

  /** Detalles cargados de la selección, en el orden de selección. */
  const detallesOk = useMemo(
    () =>
      seleccion
        .map((codigo) => detalles[codigo])
        .filter((d): d is { estado: 'ok'; detalle: DetalleFraccion } => d?.estado === 'ok')
        .map((d) => d.detalle),
    [seleccion, detalles]
  )
  const cargando = seleccion.some((codigo) => !detalles[codigo])
  const conError = seleccion.filter((codigo) => detalles[codigo]?.estado === 'error')

  /**
   * Cámara con deep-link (?fraccion=...): al montar, vuela SOLO a la
   * última fracción de la selección inicial (con varias seleccionadas
   * NO se re-encuadran todas: la cámara acompaña siempre a la última).
   */
  const vueloInicial = useRef(false)
  useEffect(() => {
    if (!map || vueloInicial.current) return
    vueloInicial.current = true
    if (ultimaSeleccionada === null) return
    const fraccion = fracciones.find((f) => f.codigo === ultimaSeleccionada)
    if (fraccion) volarA(map, fraccion.centro, ZOOM_FRACCION)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  /** Lotes de todas las fracciones cargadas (carrusel + selección). */
  const lotes = useMemo(() => detallesOk.flatMap((d) => lotesDelDetalle(d)), [detallesOk])

  /** Estados presentes en los lotes cargados, con conteo y color. */
  const estadosDisponibles = useMemo<EstadoDisponible[]>(() => {
    /* Objetos planos: acá `Map` es el componente de Google Maps. */
    const conteos: Record<string, number> = {}
    for (const lote of lotes) {
      const estado = lote.properties.estado ?? 'SIN DATOS'
      conteos[estado] = (conteos[estado] ?? 0) + 1
    }
    /* En el orden de la tabla de colores (igual que Referencias). */
    const orden: Record<string, number> = {}
    colores.forEach((c, i) => {
      orden[c.estado] = i
    })
    return Object.entries(conteos)
      .map(([estado, cantidad]) => ({
        estado,
        cantidad,
        color: colores.find((c) => c.estado === estado)?.color ?? '#9aa3af',
      }))
      .sort((a, b) => (orden[a.estado] ?? 99) - (orden[b.estado] ?? 99))
  }, [lotes, colores])

  /** Lotes visibles según el filtro de estados (mapa + carrusel). */
  const lotesVisibles = useMemo(
    () => lotes.filter((l) => !estadosOcultos.has(l.properties.estado ?? 'SIN DATOS')),
    [lotes, estadosOcultos]
  )

  /**
   * Aplica un set de estados ocultos. Si el lote abierto queda escondido,
   * su ficha se cierra: dejarla sobre un polígono que ya no se dibuja
   * mostraba datos de un lote invisible.
   */
  const aplicarEstadosOcultos = useCallback(
    (siguiente: Set<string>) => {
      setEstadosOcultos(siguiente)
      const seleccionado = lotes.find((l) => l.properties.fml === seleccionadoFml)
      if (seleccionado && siguiente.has(seleccionado.properties.estado ?? 'SIN DATOS')) {
        setSeleccionadoFml(null)
        setPopupAbierto(false)
      }
    },
    [lotes, seleccionadoFml]
  )

  const alternarEstado = useCallback(
    (estado: string) => {
      const siguiente = new Set(estadosOcultos)
      if (siguiente.has(estado)) siguiente.delete(estado)
      else siguiente.add(estado)
      aplicarEstadosOcultos(siguiente)
    },
    [estadosOcultos, aplicarEstadosOcultos]
  )

  /** Atajo del modal: deja visible únicamente el estado LIBRE. */
  const soloLotesLibres = useCallback(() => {
    aplicarEstadosOcultos(
      new Set(estadosDisponibles.filter((e) => !esEstadoLibre(e.estado)).map((e) => e.estado))
    )
  }, [estadosDisponibles, aplicarEstadosOcultos])

  const loteSeleccionado = useMemo(
    () => lotes.find((l) => l.properties.fml === seleccionadoFml)?.properties ?? null,
    [lotes, seleccionadoFml]
  )

  /**
   * Cierra la ficha del lote y lo deselecciona. La X tiene que dejar todo
   * como antes de tocarlo: sin card resaltada, sin medidas de los lados
   * en el mapa y sin el polígono destacado. Es lo mismo que hace volver
   * a tocar el lote abierto.
   */
  const cerrarFichaLote = useCallback(() => {
    setSeleccionadoFml(null)
    setPopupAbierto(false)
  }, [])

  /**
   * Selección de un lote (desde el mapa o el carrusel): VUELO animado de
   * cámara hasta el lote (también entre lotes lejanos: panTo teletransporta
   * en saltos largos, volarA hace la parábola estilo Google Earth) + popup.
   * El offset deja el lote DEBAJO del centro para que el popup, que se
   * abre encima del polígono, quede en el medio de la pantalla.
   */
  const seleccionarLote = useCallback(
    (fml: string) => {
      /* Toggle, igual que las fracciones: volver a tocar el lote
         abierto lo deselecciona (cierra la ficha, saca el resaltado y
         devuelve las cards a su tamaño). La cámara se queda donde está:
         deseleccionar no es motivo para mover el mapa. */
      if (seleccionadoFml === fml && popupAbierto) {
        cerrarFichaLote()
        return
      }
      setSeleccionadoFml(fml)
      setPopupAbierto(true)
      const lote = lotes.find((l) => l.properties.fml === fml)
      if (map && lote?.properties.centro) {
        volarA(map, lote.properties.centro, ZOOM_LOTE, { offsetYPx: -140 })
      }
    },
    [map, lotes, seleccionadoFml, popupAbierto, cerrarFichaLote]
  )

  /** Toggle de fracción: agrega o quita de la selección (con tope). */
  const alternarFraccion = useCallback(
    (codigo: number) => {
      const actual = parseSeleccion(qs.get('fraccion'))
      let siguiente: number[]
      if (actual.includes(codigo)) {
        siguiente = actual.filter((c) => c !== codigo)
      } else if (actual.length >= MAX_FRACCIONES) {
        toast(`Podés comparar hasta ${MAX_FRACCIONES} fracciones a la vez`, 'warning')
        return
      } else {
        siguiente = [...actual, codigo]
        setUltimaSeleccionada(codigo)
        /**
         * Vuelo animado inmediato a la fracción agregada (sin esperar el
         * fetch del detalle). Siempre a la ÚLTIMA: con varias
         * seleccionadas no se re-encuadra el conjunto.
         */
        const fraccion = fracciones.find((f) => f.codigo === codigo)
        if (map && fraccion) volarA(map, fraccion.centro, ZOOM_FRACCION)
      }
      qs.aplicar({ fraccion: siguiente.length ? siguiente.join('-') : null })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qs.get, qs.aplicar, map, fracciones]
  )

  /** Distritos presentes en las fracciones listadas, con conteo. */
  const distritosDisponibles = useMemo<DistritoDisponible[]>(() => {
    const conteos: Record<number, { nombre: string; cantidad: number }> = {}
    for (const f of fracciones) {
      conteos[f.distritoCodigo] = {
        nombre: f.distritoNombre,
        cantidad: (conteos[f.distritoCodigo]?.cantidad ?? 0) + 1,
      }
    }
    return Object.entries(conteos)
      .map(([codigo, d]) => ({ codigo: Number(codigo), nombre: d.nombre, cantidad: d.cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [fracciones])

  /** Fracciones visibles: toggle + búsqueda + rango + distritos + disponibles. */
  const fraccionesVisibles = useMemo(() => {
    if (!verFracciones) return []
    const texto = normalizar(busqueda.trim())
    const limites = rangosCuota.find((r) => r.valor === rango) ?? null
    const filtradas = fracciones.filter((f) => {
      if (distritosOcultos.has(f.distritoCodigo)) return false
      if (limites && (f.cuotaMinima < limites.desde || f.cuotaMinima > limites.hasta)) return false
      if (texto && !normalizar(`${f.descripcion} ${f.distritoNombre}`).includes(texto)) return false
      return true
    })
    if (!texto) return filtradas

    /**
     * Con búsqueda activa la tira se ordena por relevancia, no por código:
     * sin esto, la fracción buscada podía quedar al final del carrusel
     * mientras matches débiles (por distrito o por partes no visibles del
     * nombre) ocupaban el frente. Empate: con lotes libres primero.
     */
    const relevancia = (f: FraccionMapa) => {
      const nombre = normalizar(f.descripcion)
      if (nombre.startsWith(texto)) return 0
      if (nombre.split(/\s+/).some((palabra) => palabra.startsWith(texto))) return 1
      if (nombre.includes(texto)) return 2
      return 3 // matchea solo por distrito
    }
    return filtradas
      .map((f, orden) => ({ f, orden, rango: relevancia(f) }))
      .sort(
        (a, b) =>
          a.rango - b.rango ||
          Number(b.f.disponibles > 0) - Number(a.f.disponibles > 0) ||
          a.orden - b.orden
      )
      .map((x) => x.f)
  }, [fracciones, verFracciones, distritosOcultos, busqueda, rango, rangosCuota])

  /**
   * Encuadra la cámara en las fracciones que pasan los filtros. Es lo
   * único que el tipeo no puede hacer solo (el texto ya filtra en vivo),
   * y por eso es lo que hace el botón "Buscar" de la barra.
   */
  const encuadrarVisibles = useCallback(() => {
    if (!map) return
    if (fraccionesVisibles.length === 0) {
      toast('Ninguna fracción coincide con estos filtros', 'warning')
      return
    }
    const bounds = new google.maps.LatLngBounds()
    for (const f of fraccionesVisibles) bounds.extend(f.centro)
    map.fitBounds(bounds, 80)
  }, [map, fraccionesVisibles])

  /**
   * Cámara con deep-link del home (?texto=&rango=&distrito=): al montar
   * con filtros activos se encuadran las fracciones que matchean.
   */
  const encuadreInicial = useRef(false)
  useEffect(() => {
    if (!map || encuadreInicial.current) return
    encuadreInicial.current = true
    const hayFiltros = filtros.texto !== '' || filtros.rango !== '' || filtros.distrito !== ''
    if (!hayFiltros || seleccion.length > 0 || fraccionesVisibles.length === 0) return
    encuadrarVisibles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  const alternarDistrito = useCallback(
    (codigo: number) => {
      const ocultando = !distritosOcultos.has(codigo)
      setDistritosOcultos((prev) => {
        const siguiente = new Set(prev)
        if (siguiente.has(codigo)) siguiente.delete(codigo)
        else siguiente.add(codigo)
        return siguiente
      })
      /* Las fracciones seleccionadas del distrito oculto salen del mapa. */
      if (ocultando) {
        const actual = parseSeleccion(qs.get('fraccion'))
        const restantes = actual.filter(
          (c) => fracciones.find((f) => f.codigo === c)?.distritoCodigo !== codigo
        )
        if (restantes.length !== actual.length) {
          qs.aplicar({ fraccion: restantes.length ? restantes.join('-') : null })
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [distritosOcultos, fracciones, qs.get, qs.aplicar]
  )

  /** Fracción del lote seleccionado (popup / modal de compra). */
  const fraccionDelLote = loteSeleccionado
    ? (detallesOk.find((d) => d.fraccion.codigo === loteSeleccionado.fraccionCodigo)?.fraccion ??
      null)
    : null

  /**
   * Abre el lightbox de una fracción. Si su detalle todavía no está en
   * cache (galería de una fracción no seleccionada), lo trae al vuelo.
   */
  const abrirLightbox = useCallback(
    (codigo: number) => {
      setLightboxCodigo(codigo)
      if (detalles[codigo] || enVuelo.current.has(codigo)) return
      enVuelo.current.add(codigo)
      http<DetalleFraccion>(`/loteamientos/fracciones/${codigo}/detalle`)
        .then((data) => {
          setDetalles((prev) => ({ ...prev, [codigo]: { estado: 'ok', detalle: data } }))
        })
        .catch(() => {
          setDetalles((prev) => ({ ...prev, [codigo]: { estado: 'error' } }))
        })
        .finally(() => enVuelo.current.delete(codigo))
    },
    [detalles]
  )

  const detalleLightbox =
    lightboxCodigo !== null && detalles[lightboxCodigo]?.estado === 'ok'
      ? (detalles[lightboxCodigo] as { estado: 'ok'; detalle: DetalleFraccion }).detalle
      : null

  /**
   * Ficha de lote abierta: la tira de fracciones y el carrusel de lotes
   * se achican para dejarle la pantalla al lote.
   */
  const fichaLoteAbierta = popupAbierto && loteSeleccionado !== null

  /**
   * "Limpiar filtros": vuelve todo al estado de recién entrado. NO toca
   * la selección de fracciones (eso es lo que hay abierto en el mapa,
   * no un filtro) ni el zoom.
   */
  const limpiarFiltros = useCallback(() => {
    setBusqueda('')
    setRango('')
    setDistritosOcultos(new Set())
    setVerFracciones(true)
    aplicarEstadosOcultos(new Set())
  }, [aplicarEstadosOcultos])

  /**
   * "Volver al inicio": la vista país no es solo un movimiento de cámara,
   * es el reset de la página. Alejarse dejando fracciones abiertas,
   * filtros puestos y cards ocultas devolvía un mapa lleno de cosas que
   * ya no se veían. Deja todo como recién entrado (la única preferencia
   * que sobrevive es la transparencia de los polígonos).
   */
  const volverAlInicio = useCallback(() => {
    if (map) volarA(map, CENTRO_INICIAL, ZOOM_INICIAL)
    qs.aplicar({ fraccion: null })
    cerrarFichaLote()
    setModalCompra(false)
    setLightboxCodigo(null)
    setVerCardsLote(true)
    setFiltrosAbiertos(false)
    limpiarFiltros()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, qs.aplicar, cerrarFichaLote, limpiarFiltros])

  /** Badge del botón de filtros y habilitación de "Limpiar filtros". */
  const filtrosActivos = contarFiltrosActivos({
    busqueda,
    rango,
    distritosOcultos,
    estadosOcultos,
    verFracciones,
  })

  const reintentar = useCallback(() => {
    setDetalles((prev) => {
      const siguiente = { ...prev }
      for (const [codigo, estado] of Object.entries(prev)) {
        if (estado.estado === 'error') delete siguiente[Number(codigo)]
      }
      return siguiente
    })
  }, [])

  return (
    <>
      <div className={styles.mapa}>
        <Map
          mapId={MAP_ID}
          defaultCenter={CENTRO_INICIAL}
          defaultZoom={ZOOM_INICIAL}
          mapTypeId="hybrid"
          gestureHandling="greedy"
          disableDefaultUI
          clickableIcons={false}
        >
          <FraccionMarkers
            fracciones={fraccionesVisibles}
            seleccionadas={seleccion}
            onSelect={alternarFraccion}
          />

          <LotesLayer
            detalles={detallesOk}
            opacidad={opacidad}
            verManzanas={verManzanas}
            verLotes={verLotes}
            estadosOcultos={estadosOcultos}
            seleccionadoFml={seleccionadoFml}
            onSelect={seleccionarLote}
          />

          {detallesOk.map((detalle) => (
            <DetalleOverlays
              key={detalle.fraccion.codigo}
              detalle={detalle}
              verManzanas={verManzanas}
              verLotes={verLotes}
              estadosOcultos={estadosOcultos}
              seleccionadoFml={seleccionadoFml}
            />
          ))}

          {popupAbierto && verLotes && loteSeleccionado && (
            <LoteInfoWindow
              lote={loteSeleccionado}
              fraccionDescripcion={fraccionDelLote?.descripcion ?? ''}
              whatsapp={whatsappVentas}
              tel={telVentas}
              onComprar={() => setModalCompra(true)}
              onClose={cerrarFichaLote}
            />
          )}
        </Map>
      </div>

      {/* Estado del detalle (loading / error con reintento) */}
      {cargando && (
        <div className={styles.detalleEstado} role="status">
          <Spinner />
          Cargando lotes...
        </div>
      )}
      {!cargando && conError.length > 0 && (
        <div className={styles.detalleEstado} role="alert">
          {texts.states.errorTitle}.
          <button style={{ color: 'var(--primary)', fontWeight: 700 }} onClick={reintentar}>
            {texts.common.retry}
          </button>
        </div>
      )}

      {/* Tira de fracciones: centrada verticalmente hasta la primera
          selección de fracción; con algo abierto en el mapa
          sube arriba en modo compacto (transición). El toggle de
          MapControls pliega todo el panel para despejar el mapa. */}
      {verPanelBusqueda && (
        <div
          className={[
            styles.zonaFracciones,
            seleccion.length === 0 ? styles.zonaFraccionesCentrada : '',
            fichaLoteAbierta ? styles.zonaFraccionesMini : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <FraccionesListPanel
            fracciones={fraccionesVisibles}
            seleccionadas={seleccion}
            ultimaSeleccionada={ultimaSeleccionada}
            compacta={fichaLoteAbierta}
            onSelect={alternarFraccion}
            onVerMedios={abrirLightbox}
            onLimpiarFiltros={limpiarFiltros}
          />

          <BuscadorBarra
            busqueda={busqueda}
            onBusqueda={setBusqueda}
            filtrosActivos={filtrosActivos}
            onAbrirFiltros={() => setFiltrosAbiertos(true)}
            onBuscar={encuadrarVisibles}
          />
        </div>
      )}

      <FiltrosModal
        abierto={filtrosAbiertos}
        onCerrar={() => setFiltrosAbiertos(false)}
        filtrosActivos={filtrosActivos}
        rango={rango}
        onRango={setRango}
        rangos={rangosCuota}
        distritos={distritosDisponibles}
        distritosOcultos={distritosOcultos}
        onToggleDistrito={alternarDistrito}
        onTodosLosDistritos={() => setDistritosOcultos(new Set())}
        onNingunDistrito={() =>
          setDistritosOcultos(new Set(distritosDisponibles.map((d) => d.codigo)))
        }
        estados={estadosDisponibles}
        estadosOcultos={estadosOcultos}
        onToggleEstado={alternarEstado}
        onTodosLosEstados={() => aplicarEstadosOcultos(new Set())}
        onNingunEstado={() =>
          aplicarEstadosOcultos(new Set(estadosDisponibles.map((e) => e.estado)))
        }
        onSoloLotesLibres={soloLotesLibres}
        seleccionadas={seleccion.length}
        onQuitarSeleccion={() => qs.aplicar({ fraccion: null })}
        totalFracciones={fracciones.length}
        fraccionesVisibles={fraccionesVisibles.length}
        verFracciones={verFracciones}
        onToggleFracciones={() => {
          /* Al ocultar, la selección del mapa se limpia también. */
          if (verFracciones && seleccion.length > 0) qs.aplicar({ fraccion: null })
          setVerFracciones((v) => !v)
        }}
        onLimpiar={limpiarFiltros}
      />

      <MapControls
        verPanelBusqueda={verPanelBusqueda}
        fraccionesOcultas={fraccionesVisibles.length}
        onTogglePanelBusqueda={alternarPanelBusqueda}
        hayCardsLote={verLotes && lotes.length > 0}
        verCardsLote={verCardsLote}
        cardsLoteOcultas={lotesVisibles.length}
        onToggleCardsLote={() => setVerCardsLote((v) => !v)}
        opacidad={opacidad}
        onOpacidad={setOpacidad}
        colores={colores}
        onVolverAlInicio={volverAlInicio}
      />

      {/* El carrusel de cards acompaña a los polígonos de lote: en cuanto
          los lotes salen del mapa (zoom < 17), se va con ellos. Misma
          banda que la ficha, para que todo aparezca y desaparezca junto.
          El toggle de MapControls lo pliega sin tocar la selección. */}
      {verLotes && lotes.length > 0 && verCardsLote && (
        <LotesCarousel
          lotes={lotesVisibles}
          seleccionadoFml={seleccionadoFml}
          compacto={fichaLoteAbierta}
          onSelect={seleccionarLote}
        />
      )}

      {loteSeleccionado && (
        <ComprarLoteModal
          lote={loteSeleccionado}
          fraccionDescripcion={fraccionDelLote?.descripcion ?? ''}
          open={modalCompra}
          onClose={() => setModalCompra(false)}
        />
      )}

      {detalleLightbox && (
        <LightboxMedios
          titulo={detalleLightbox.fraccion.descripcion}
          medios={detalleLightbox.fraccion.medios}
          onClose={() => setLightboxCodigo(null)}
        />
      )}
    </>
  )
}

/**
 * Shell estático para SSR y primer render de hidratación: la tira de
 * fracciones (contenido indexable) sin el mapa, que es estrictamente
 * client-side (Google Maps toca window/DOM).
 */
function PantallaEstatica(props: LoteamientosProps) {
  const { fracciones } = props
  return (
    <>
      <div className={styles.mapa} aria-hidden />
      <div className={[styles.zonaFracciones, styles.zonaFraccionesCentrada].join(' ')}>
        <FraccionesListPanel
          fracciones={fracciones}
          seleccionadas={[]}
          ultimaSeleccionada={null}
          onSelect={() => {}}
          onVerMedios={() => {}}
        />
      </div>
    </>
  )
}

/** Suscripción vacía para el guard de hidratación (useSyncExternalStore). */
const suscripcionNula = () => () => {}

export default function Loteamientos(props: LoteamientosProps) {
  const { props: pageProps } = usePage()
  const mapsApiKey = String(
    (pageProps as { config?: { mapsApiKey?: string } }).config?.mapsApiKey ?? ''
  )

  /**
   * Guard de SSR: el mapa se monta recién en el cliente. En el server (y en
   * el primer render de hidratación) vale false → se renderiza el shell
   * estático; React re-renderiza con true apenas hidrata.
   */
  const montado = useSyncExternalStore(
    suscripcionNula,
    () => true,
    () => false
  )

  /** Sin API key no hay mapa: aviso y contacto (no debería pasar en prod). */
  useEffect(() => {
    if (montado && !mapsApiKey) toast(texts.states.errorTitle, 'error')
  }, [montado, mapsApiKey])

  return (
    <>
      <Seo
        title="Loteamientos en el mapa"
        description="Loteamientos de Propar en un mapa interactivo: buscá tu lote por distrito y rango de cuota, con precios y disponibilidad actualizados."
      />
      {montado && mapsApiKey ? (
        <APIProvider apiKey={mapsApiKey} libraries={['marker']}>
          <Pantalla {...props} />
        </APIProvider>
      ) : (
        <PantallaEstatica {...props} />
      )}
    </>
  )
}

Loteamientos.layout = (page: ReactElement) => (
  <PublicFullscreenLayout>{page}</PublicFullscreenLayout>
)
