import { Search, SlidersHorizontal, X, XCircle } from 'lucide-react'
import type { FormEvent } from 'react'

import { Button, Modal, SelectField, ToggleField } from '~/components/ui'

import styles from './map.module.css'

export type DistritoDisponible = {
  codigo: number
  nombre: string
  cantidad: number
}

export type RangoCuotaOpcion = {
  valor: string
  etiqueta: string
  desde: number
  hasta: number
}

export type EstadoDisponible = {
  estado: string
  color: string
  cantidad: number
}

/** "RESERVA DE PROPIETARIO" → "Reserva de propietario". */
function capitalizar(estado: string): string {
  const bajo = estado.toLowerCase()
  return bajo.charAt(0).toUpperCase() + bajo.slice(1)
}

/**
 * Estado "libre" del ERP, con la misma tolerancia que usa el server para
 * cruzar estados (relleno de Oracle, tildes, mayúsculas). Solo LIBRE a
 * secas: "LIBRE/MEJORAS" es otro estado, igual que en el backend.
 */
export function esEstadoLibre(estado: string): boolean {
  return estado.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim() === 'LIBRE'
}

/**
 * Cuántos filtros se apartan del estado inicial. Lo usa el badge del
 * botón de la botonera y el "Limpiar filtros" del modal, así los dos
 * cuentan exactamente lo mismo.
 */
export function contarFiltrosActivos({
  busqueda,
  rango,
  distritosOcultos,
  estadosOcultos,
  verFracciones,
}: {
  busqueda: string
  rango: string
  distritosOcultos: Set<number>
  estadosOcultos: Set<string>
  verFracciones: boolean
}): number {
  return [
    busqueda.trim() !== '',
    rango !== '',
    distritosOcultos.size > 0,
    estadosOcultos.size > 0,
    !verFracciones,
  ].filter(Boolean).length
}

/**
 * Modal de filtros del mapa: TODO lo que se puede filtrar en un solo
 * lugar. Lo abre el botón de la botonera flotante (MapControls). Antes
 * esto era una fila de pills debajo de la tira de fracciones más un pill
 * de estados pegado al carrusel: dos barras que competían con el mapa por
 * la pantalla y que en móvil se envolvían en varias líneas. Todo sigue
 * filtrando client-side.
 */
export function FiltrosModal({
  abierto,
  onCerrar,
  filtrosActivos,
  rango,
  onRango,
  rangos,
  distritos,
  distritosOcultos,
  onToggleDistrito,
  onTodosLosDistritos,
  onNingunDistrito,
  estados,
  estadosOcultos,
  onToggleEstado,
  onTodosLosEstados,
  onNingunEstado,
  onSoloLotesLibres,
  seleccionadas,
  onQuitarSeleccion,
  totalFracciones,
  fraccionesVisibles,
  verFracciones,
  onToggleFracciones,
  onLimpiar,
}: {
  abierto: boolean
  onCerrar: () => void
  /** Contador de contarFiltrosActivos: habilita "Limpiar filtros" */
  filtrosActivos: number
  rango: string
  onRango: (valor: string) => void
  rangos: RangoCuotaOpcion[]
  distritos: DistritoDisponible[]
  distritosOcultos: Set<number>
  onToggleDistrito: (codigo: number) => void
  /** Vuelve a mostrar todos los distritos de una */
  onTodosLosDistritos: () => void
  /** Desmarca todos los distritos de una (nada en el mapa) */
  onNingunDistrito: () => void
  /** Estados de lote de las fracciones ABIERTAS (vacío = ninguna abierta) */
  estados: EstadoDisponible[]
  estadosOcultos: Set<string>
  onToggleEstado: (estado: string) => void
  /** Marca todos los estados de una */
  onTodosLosEstados: () => void
  /** Desmarca todos los estados de una */
  onNingunEstado: () => void
  /** Atajo: deja marcado únicamente el estado LIBRE */
  onSoloLotesLibres: () => void
  /** Fracciones abiertas en el mapa (habilita "Quitar del mapa") */
  seleccionadas: number
  onQuitarSeleccion: () => void
  /** Fracciones cargadas y cuántas pasan los filtros (para el botón de cierre) */
  totalFracciones: number
  fraccionesVisibles: number
  verFracciones: boolean
  onToggleFracciones: () => void
  /** Deja los filtros como recién entrado (no toca la selección del mapa) */
  onLimpiar: () => void
}) {
  const distritosActivos = distritos.filter((d) => !distritosOcultos.has(d.codigo))
  const estadosActivos = estados.filter((e) => !estadosOcultos.has(e.estado))
  const hayEstadoLibre = estados.some((e) => esEstadoLibre(e.estado))

  return (
    <Modal
      open={abierto}
      onClose={onCerrar}
      title="Filtros"
      footer={
        <>
          <Button variant="secondary" onClick={onLimpiar} disabled={filtrosActivos === 0}>
            Limpiar filtros
          </Button>
          <Button variant="primary" onClick={onCerrar}>
            Ver {fraccionesVisibles} {fraccionesVisibles === 1 ? 'fracción' : 'fracciones'}
          </Button>
        </>
      }
    >
      {/* La búsqueda por texto vive en la barra, no acá: un solo input
          atado a ese estado. */}
      <div className={styles.filtrosGrupo}>
        <SelectField
          label="Precio de cuota"
          name="rango"
          value={rango}
          onChange={(e) => onRango(e.target.value)}
        >
          <option value="">Todos los precios</option>
          {rangos.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.etiqueta}
            </option>
          ))}
        </SelectField>
      </div>

      {/* Los distritos salen de las fracciones cargadas: sin fracciones
            no hay lista que mostrar. */}
      {distritos.length > 0 && (
        <div className={styles.filtrosGrupo}>
          <div className={styles.filtrosGrupoHeader}>
            <span className={styles.filtrosGrupoTitulo}>
              Distritos ({distritosActivos.length}/{distritos.length})
            </span>
            {/* Marcar todo o nada de una: cada atajo se esconde cuando ya
                no cambia nada (todo marcado / todo desmarcado). */}
            <span className={styles.filtrosAtajos}>
              {distritosOcultos.size > 0 && (
                <button type="button" className={styles.filtrosAtajo} onClick={onTodosLosDistritos}>
                  Todos
                </button>
              )}
              {distritosActivos.length > 0 && (
                <button type="button" className={styles.filtrosAtajo} onClick={onNingunDistrito}>
                  Ninguno
                </button>
              )}
            </span>
          </div>
          <div className={styles.filtrosLista}>
            {distritos.map(({ codigo, nombre, cantidad }) => (
              <label key={codigo} className={styles.cuotaOpcion}>
                <input
                  type="checkbox"
                  className={styles.estadoCheck}
                  checked={!distritosOcultos.has(codigo)}
                  onChange={() => onToggleDistrito(codigo)}
                />
                <span className={styles.distritoOpcionNombre}>{nombre}</span>
                <span className={styles.distritoOpcionCantidad}>{cantidad}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Estados de lote: los lotes llegan con el detalle de cada fracción,
          así que la lista se llena recién al abrir una. La sección se
          muestra igual —con la nota— para que se sepa que el filtro
          existe; antes desaparecía entera y parecía que no estaba. */}
      {totalFracciones > 0 && (
        <div className={styles.filtrosGrupo}>
          <div className={styles.filtrosGrupoHeader}>
            <span className={styles.filtrosGrupoTitulo}>
              {estados.length > 0
                ? `Estados de lote (${estadosActivos.length}/${estados.length})`
                : 'Estados de lote'}
            </span>
            {estados.length > 0 && (
              <span className={styles.filtrosAtajos}>
                {estadosOcultos.size > 0 && (
                  <button type="button" className={styles.filtrosAtajo} onClick={onTodosLosEstados}>
                    Todos
                  </button>
                )}
                {estadosActivos.length > 0 && (
                  <button type="button" className={styles.filtrosAtajo} onClick={onNingunEstado}>
                    Ninguno
                  </button>
                )}
                {hayEstadoLibre && (
                  <button type="button" className={styles.filtrosAtajo} onClick={onSoloLotesLibres}>
                    Solo libres
                  </button>
                )}
              </span>
            )}
          </div>
          {estados.length === 0 ? (
            <p className={styles.filtrosNota}>
              Seleccioná una fracción en el mapa para ver los estados de sus lotes.
            </p>
          ) : (
            <div className={styles.filtrosLista}>
              {estados.map(({ estado, color, cantidad }) => (
                <label key={estado} className={styles.cuotaOpcion}>
                  <input
                    type="checkbox"
                    className={styles.estadoCheck}
                    checked={!estadosOcultos.has(estado)}
                    onChange={() => onToggleEstado(estado)}
                  />
                  <span className={styles.leyendaColor} style={{ backgroundColor: color }} />
                  <span className={styles.distritoOpcionNombre}>{capitalizar(estado)}</span>
                  <span className={styles.distritoOpcionCantidad}>{cantidad}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Solo si hay fracciones cargadas: sin ellas no hay nada que
          mostrar ni ocultar. */}
      {totalFracciones > 0 && (
        <div className={styles.filtrosGrupo}>
          <span className={styles.filtrosGrupoTitulo}>Qué se ve en el mapa</span>

          {totalFracciones > 0 && (
            <ToggleField
              label={`Fracciones (${totalFracciones})`}
              checked={verFracciones}
              onChange={onToggleFracciones}
            />
          )}
        </div>
      )}

      {seleccionadas > 0 && (
        <div className={styles.filtrosGrupo}>
          <Button type="button" variant="secondary" onClick={onQuitarSeleccion}>
            <XCircle size={16} /> Quitar del mapa las {seleccionadas} fracciones abiertas
          </Button>
        </div>
      )}
    </Modal>
  )
}

/**
 * Barra de búsqueda de la zona de fracciones: input largo + acceso al
 * modal de filtros + submit. Vive debajo de la tira y acompaña sus tres
 * tamaños (hero / compacto / mini) por CSS, para que forme un bloque con
 * las cards en vez de flotar suelta.
 *
 * El texto filtra EN VIVO mientras se tipea (son pocas fracciones y todo
 * es client-side); "Buscar" hace lo otro que hace falta y el tipeo no
 * puede hacer solo: encuadrar la cámara en lo que quedó filtrado.
 */
export function BuscadorBarra({
  busqueda,
  onBusqueda,
  filtrosActivos,
  onAbrirFiltros,
  onBuscar,
}: {
  busqueda: string
  onBusqueda: (texto: string) => void
  /** Contador de contarFiltrosActivos: pinta el botón y llena el badge */
  filtrosActivos: number
  onAbrirFiltros: () => void
  /** Submit: encuadra el mapa en las fracciones que pasan los filtros */
  onBuscar: () => void
}) {
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    onBuscar()
  }

  return (
    <form className={styles.buscadorBarra} onSubmit={enviar} role="search">
      <input
        type="search"
        className={styles.buscadorBarraInput}
        placeholder="Nombre del loteamiento o de la zona"
        aria-label="Buscar fracción o distrito"
        autoComplete="off"
        value={busqueda}
        onChange={(e) => onBusqueda(e.target.value)}
      />

      {busqueda !== '' && (
        <button
          type="button"
          className={styles.buscadorBarraLimpiar}
          onClick={() => onBusqueda('')}
          aria-label="Borrar la búsqueda"
          title="Borrar la búsqueda"
        >
          <X size={16} />
        </button>
      )}

      <button
        type="button"
        className={[
          styles.buscadorBarraBoton,
          filtrosActivos > 0 ? styles.buscadorBarraBotonActivo : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={onAbrirFiltros}
        aria-label={filtrosActivos > 0 ? `Filtros (${filtrosActivos} activos)` : 'Filtros'}
        title="Filtros"
      >
        <SlidersHorizontal size={17} />
        <span className={styles.buscadorBarraTexto}>Filtros</span>
        {filtrosActivos > 0 && (
          <span className={styles.buscadorBarraBadge} aria-hidden>
            {filtrosActivos}
          </span>
        )}
      </button>

      <button
        type="submit"
        className={[styles.buscadorBarraBoton, styles.buscadorBarraSubmit].join(' ')}
        aria-label="Buscar: encuadrar el mapa en los resultados"
        title="Encuadrar el mapa en los resultados"
      >
        <Search size={17} />
        <span className={styles.buscadorBarraTexto}>Buscar</span>
      </button>
    </form>
  )
}
