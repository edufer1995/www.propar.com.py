/*
|--------------------------------------------------------------------------
| DataTable — tabla server-side del admin (ui-standards)
|--------------------------------------------------------------------------
|
| Recibe {data, meta} por props Inertia y navega con el estado en la
| query string (back/forward funcionan, el link se comparte). Búsqueda
| con debounce 350ms, orden por columna, contador, export CSV respetando
| filtros, selección múltiple con acciones masivas, skeleton durante la
| navegación y cards en mobile (<768px).
|
*/

import { useEffect, useState, type ReactNode } from 'react'
import { router, usePage } from '@inertiajs/react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Search,
  Trash2,
} from 'lucide-react'

import { Button, EmptyState, ErrorState, SkeletonRows } from '~/components/ui'
import { useDebounce } from '~/hooks/use_debounce'
import { useIsMobile } from '~/hooks/use_media_query'
import { useQueryState } from '~/hooks/use_query_state'
import { texts } from '~/lib/texts'
import styles from './data_table.module.css'

export interface MetaTabla {
  total: number
  porPagina: number
  pagina: number
  ultimaPagina: number
}

export interface ColumnaTabla<Fila> {
  /** Clave del DTO; si es ordenable debe existir en los ordenables del server */
  clave: string
  titulo: string
  sortable?: boolean
  render?: (fila: Fila) => ReactNode
  /** Esta columna es el título de la card en mobile */
  esTituloCard?: boolean
  /** No mostrar este campo en las cards de mobile */
  soloDesktop?: boolean
}

export interface DataTableProps<Fila extends { id: number }> {
  data: Fila[]
  meta: MetaTabla
  columnas: ColumnaTabla<Fila>[]
  busquedaPlaceholder?: string
  /** Controles extra de filtro (selects) que viven en la toolbar */
  filtros?: ReactNode
  /** Endpoint de export: se le agrega la query string actual */
  exportUrl?: string
  /** Acciones por fila (editar/eliminar) */
  acciones?: (fila: Fila) => ReactNode
  /** Habilita selección múltiple; recibe los ids al pedir eliminar */
  onEliminarSeleccion?: (ids: number[]) => void
  /** Estado vacío sin filtros activos (CTA crear) */
  vacio?: { titulo?: string; cta?: string; onCta?: () => void }
  /** Mensaje de error del server (vista 3 de 4) */
  error?: string | null
  /** Partial reload: props a refrescar al navegar (ej. ['registros']) */
  only?: string[]
}

function valorCelda<Fila extends { id: number }>(fila: Fila, columna: ColumnaTabla<Fila>) {
  if (columna.render) return columna.render(fila)
  const crudo = (fila as Record<string, unknown>)[columna.clave]
  if (crudo === null || crudo === undefined || crudo === '') return '—'
  return String(crudo)
}

/** Páginas a mostrar: 1 … (actual±1) … última */
function paginasVisibles(actual: number, ultima: number): (number | '…')[] {
  const set = new Set<number>()
  for (const p of [1, 2, actual - 1, actual, actual + 1, ultima - 1, ultima]) {
    if (p >= 1 && p <= ultima) set.add(p)
  }
  const orden = [...set].sort((a, b) => a - b)
  const resultado: (number | '…')[] = []
  let anterior = 0
  for (const p of orden) {
    if (anterior && p - anterior > 1) resultado.push('…')
    resultado.push(p)
    anterior = p
  }
  return resultado
}

export function DataTable<Fila extends { id: number }>({
  data,
  meta,
  columnas,
  busquedaPlaceholder,
  filtros,
  exportUrl,
  acciones,
  onEliminarSeleccion,
  vacio,
  error,
  only,
}: DataTableProps<Fila>) {
  const { url } = usePage()
  const isMobile = useIsMobile()
  const { get, aplicar, limpiar } = useQueryState()

  const sort = get('sort')
  const order = get('order') === 'desc' ? 'desc' : 'asc'

  /* ---- Búsqueda con debounce 350ms, sincronizada con la URL ---- */
  const [busqueda, setBusqueda] = useState(get('q'))
  const [qUrlPrev, setQUrlPrev] = useState(get('q'))
  // Back/forward u otro filtro cambió la URL → sincronizar el input
  if (get('q') !== qUrlPrev) {
    setQUrlPrev(get('q'))
    setBusqueda(get('q'))
  }

  const busquedaDebounced = useDebounce(busqueda, 350)
  useEffect(() => {
    if (busquedaDebounced !== get('q')) {
      aplicar({ q: busquedaDebounced, page: null }, { only })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaDebounced])

  /* ---- Indicador de carga durante la navegación de la tabla ---- */
  const [cargando, setCargando] = useState(false)
  useEffect(() => {
    const offStart = router.on('start', () => setCargando(true))
    const offFinish = router.on('finish', () => setCargando(false))
    return () => {
      offStart()
      offFinish()
    }
  }, [])

  /* ---- Selección múltiple (se limpia cuando cambian las filas) ---- */
  const [seleccion, setSeleccion] = useState<number[]>([])
  const idsActuales = data.map((f) => f.id).join(',')
  const [idsPrev, setIdsPrev] = useState(idsActuales)
  if (idsActuales !== idsPrev) {
    setIdsPrev(idsActuales)
    setSeleccion([])
  }

  const toggleFila = (id: number) =>
    setSeleccion((s) => (s.includes(id) ? s.filter((v) => v !== id) : [...s, id]))
  const todosSeleccionados = data.length > 0 && seleccion.length === data.length
  const togglePagina = () => setSeleccion(todosSeleccionados ? [] : data.map((f) => f.id))

  /* ---- Orden por columna ---- */
  const ordenarPor = (clave: string) => {
    const nuevaDir = sort === clave && order === 'asc' ? 'desc' : 'asc'
    aplicar({ sort: clave, order: nuevaDir, page: null }, { only })
  }

  const irAPagina = (p: number) => aplicar({ page: p === 1 ? null : String(p) }, { only })

  /* ---- Export: misma query string que la vista actual ---- */
  const idx = url.indexOf('?')
  const qsActual = idx === -1 ? '' : url.slice(idx)
  const hrefExport = exportUrl ? `${exportUrl}${qsActual}` : null

  /** Hay búsqueda o filtros de datos activos (page/orden/perPage no cuentan) */
  const paramsFiltro = new URLSearchParams(qsActual)
  for (const clave of ['page', 'perPage', 'sort', 'order']) paramsFiltro.delete(clave)
  const hayFiltros = [...paramsFiltro.values()].some((v) => v !== '')

  const desde = meta.total === 0 ? 0 : (meta.pagina - 1) * meta.porPagina + 1
  const hasta = Math.min(meta.total, meta.pagina * meta.porPagina)

  const seleccionable = Boolean(onEliminarSeleccion)
  const columnaTitulo = columnas.find((c) => c.esTituloCard) ?? columnas[0]

  /* ---- Cuerpo según los 4 estados ---- */
  let cuerpo: ReactNode
  if (cargando) {
    cuerpo = <SkeletonRows rows={Math.max(3, Math.min(data.length || 5, 8))} height={44} />
  } else if (error) {
    cuerpo = <ErrorState body={error} onRetry={() => router.reload()} />
  } else if (data.length === 0) {
    cuerpo = hayFiltros ? (
      <EmptyState title={texts.states.noResults} cta="Limpiar filtros" onCta={limpiar} />
    ) : (
      <EmptyState
        title={vacio?.titulo ?? texts.states.emptyTitle}
        cta={vacio?.cta}
        onCta={vacio?.onCta}
      />
    )
  } else if (isMobile) {
    cuerpo = (
      <div className={styles.cards}>
        {data.map((fila) => (
          <div className={styles.card} key={fila.id}>
            <div className={styles.cardHeader}>
              {seleccionable && (
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={seleccion.includes(fila.id)}
                  onChange={() => toggleFila(fila.id)}
                  aria-label="Seleccionar"
                />
              )}
              <span className={styles.cardTitulo}>{valorCelda(fila, columnaTitulo)}</span>
            </div>
            <div className={styles.cardCampos}>
              {columnas
                .filter((c) => c !== columnaTitulo && !c.soloDesktop)
                .map((c) => (
                  <div className={styles.cardCampo} key={c.clave}>
                    <span className={styles.cardEtiqueta}>{c.titulo}</span>
                    <span className={styles.cardValor}>{valorCelda(fila, c)}</span>
                  </div>
                ))}
            </div>
            {acciones && <div className={styles.cardAcciones}>{acciones(fila)}</div>}
          </div>
        ))}
      </div>
    )
  } else {
    cuerpo = (
      <div className={styles.tablaWrap}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              {seleccionable && (
                <th className={styles.celdaCheckbox}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={todosSeleccionados}
                    onChange={togglePagina}
                    aria-label="Seleccionar toda la página"
                  />
                </th>
              )}
              {columnas.map((c) => (
                <th
                  key={c.clave}
                  className={c.sortable ? styles.thOrdenable : undefined}
                  onClick={c.sortable ? () => ordenarPor(c.clave) : undefined}
                  aria-sort={
                    sort === c.clave ? (order === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  <span className={styles.thContenido}>
                    {c.titulo}
                    {c.sortable &&
                      (sort === c.clave ? (
                        order === 'asc' ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )
                      ) : (
                        <ChevronsUpDown size={14} opacity={0.55} />
                      ))}
                  </span>
                </th>
              ))}
              {acciones && <th aria-label="Acciones" />}
            </tr>
          </thead>
          <tbody>
            {data.map((fila) => (
              <tr
                key={fila.id}
                className={seleccion.includes(fila.id) ? styles.filaSeleccionada : undefined}
              >
                {seleccionable && (
                  <td className={styles.celdaCheckbox}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={seleccion.includes(fila.id)}
                      onChange={() => toggleFila(fila.id)}
                      aria-label="Seleccionar fila"
                    />
                  </td>
                )}
                {columnas.map((c) => (
                  <td key={c.clave}>{valorCelda(fila, c)}</td>
                ))}
                {acciones && (
                  <td className={styles.celdaAcciones}>
                    <span className={styles.acciones}>{acciones(fila)}</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.buscador}>
          <Search size={16} className={styles.buscadorIcono} />
          <input
            type="search"
            className={styles.buscadorInput}
            placeholder={busquedaPlaceholder ?? texts.common.search}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label={texts.common.search}
          />
        </div>

        {filtros}

        <div className={styles.toolbarDerecha}>
          <select
            className={styles.selectPerPage}
            value={get('perPage') || '10'}
            onChange={(e) =>
              aplicar(
                { perPage: e.target.value === '10' ? null : e.target.value, page: null },
                { only }
              )
            }
            aria-label="Registros por página"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n} por pág.
              </option>
            ))}
          </select>

          {hrefExport && (
            <a href={hrefExport} className={styles.exportLink} download>
              <Button type="button" variant="secondary">
                <Download size={16} /> Exportar CSV
              </Button>
            </a>
          )}
        </div>
      </div>

      {seleccion.length > 0 && onEliminarSeleccion && (
        <div className={styles.barraSeleccion} role="status">
          <span className={styles.barraSeleccionTexto}>
            {texts.table.selected(seleccion.length)}
          </span>
          <Button type="button" variant="danger" onClick={() => onEliminarSeleccion(seleccion)}>
            <Trash2 size={16} /> {texts.common.delete}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSeleccion([])}>
            {texts.common.cancel}
          </Button>
        </div>
      )}

      {cuerpo}

      <div className={styles.pie}>
        <span className={styles.contador}>
          {meta.total === 0 ? 'Sin registros' : texts.table.showing(desde, hasta, meta.total)}
        </span>

        {meta.ultimaPagina > 1 && (
          <nav className={styles.paginacion} aria-label="Paginación">
            <button
              type="button"
              className={styles.btnPagina}
              disabled={meta.pagina <= 1}
              onClick={() => irAPagina(meta.pagina - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            {paginasVisibles(meta.pagina, meta.ultimaPagina).map((p, i) =>
              p === '…' ? (
                <span key={`p-${i}`} className={styles.puntos}>
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={p}
                  className={[styles.btnPagina, p === meta.pagina ? styles.btnPaginaActual : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => irAPagina(p)}
                  aria-current={p === meta.pagina ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              className={styles.btnPagina}
              disabled={meta.pagina >= meta.ultimaPagina}
              onClick={() => irAPagina(meta.pagina + 1)}
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
