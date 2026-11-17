/*
|--------------------------------------------------------------------------
| ResourcePage — pantalla completa de un recurso CRUD
|--------------------------------------------------------------------------
|
| Header + botón Crear + DataTable + ResourceFormModal, todo cableado por
| el RecursoConfig. La página de cada recurso queda en una línea:
|   <ResourcePage config={config} registros={registros} specs={specs} />
|
*/

import { useState, type ReactNode } from 'react'
import { Head, router } from '@inertiajs/react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '~/components/ui'
import { DataTable, type MetaTabla } from '~/components/datatable/data_table'
import { useQueryState } from '~/hooks/use_query_state'
import { confirmDelete, confirmDeleteMasivo } from '~/lib/swal'
import { texts } from '~/lib/texts'
import { ResourceFormModal } from './resource_form_modal'
import type { RecursoConfig, SpecCliente } from './tipos'
import tabla from '~/components/datatable/data_table.module.css'
import styles from './crud.module.css'

export interface ResourcePageProps<Fila extends { id: number }> {
  config: RecursoConfig<Fila>
  registros: { data: Fila[]; meta: MetaTabla }
  specs?: Record<string, SpecCliente>
  /** Contenido extra bajo el header (avisos, ayudas) */
  children?: ReactNode
}

export function ResourcePage<Fila extends { id: number }>({
  config,
  registros,
  specs = {},
  children,
}: ResourcePageProps<Fila>) {
  const { get, aplicar } = useQueryState()
  /** Modal: cerrado | crear | editar fila */
  const [modal, setModal] = useState<{ abierto: boolean; fila: Fila | null }>({
    abierto: false,
    fila: null,
  })

  const eliminar = async (fila: Fila) => {
    if (!(await confirmDelete(config.etiquetaFila(fila)))) return
    router.delete(`${config.baseUrl}/${fila.id}`, { preserveScroll: true, preserveState: true })
  }

  const eliminarSeleccion = async (ids: number[]) => {
    if (!(await confirmDeleteMasivo(ids.length))) return
    router.post(
      `${config.baseUrl}/destroy-masivo`,
      { ids },
      { preserveScroll: true, preserveState: true }
    )
  }

  const filtros = config.filtros?.length ? (
    <>
      {config.filtros.map((filtro) => (
        <select
          key={filtro.parametro}
          className={tabla.selectPerPage}
          value={get(filtro.parametro)}
          onChange={(e) =>
            aplicar({ [filtro.parametro]: e.target.value, page: null }, { only: ['registros'] })
          }
          aria-label={filtro.etiqueta}
        >
          <option value="">{filtro.etiqueta}: todos</option>
          {filtro.opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      ))}
    </>
  ) : undefined

  return (
    <>
      <Head title={config.titulo} />

      <div className={styles.pagina}>
        <div className={styles.encabezado}>
          <div className={styles.encabezadoTextos}>
            <h1 className={styles.titulo}>{config.titulo}</h1>
            {config.descripcion && <p className={styles.descripcion}>{config.descripcion}</p>}
          </div>
          {!config.soloLectura && !config.sinCrear && (
            <Button type="button" onClick={() => setModal({ abierto: true, fila: null })}>
              <Plus size={16} /> {texts.common.create}
            </Button>
          )}
        </div>

        {children}

        <DataTable
          data={registros.data}
          meta={registros.meta}
          columnas={config.columnas}
          busquedaPlaceholder={config.busquedaPlaceholder}
          filtros={filtros}
          exportUrl={`${config.baseUrl}/export`}
          only={['registros']}
          onEliminarSeleccion={
            config.sinEliminar ? undefined : (ids) => void eliminarSeleccion(ids)
          }
          vacio={{
            titulo: config.vacioTitulo,
            cta: config.soloLectura || config.sinCrear ? undefined : texts.states.emptyCta,
            onCta:
              config.soloLectura || config.sinCrear
                ? undefined
                : () => setModal({ abierto: true, fila: null }),
          }}
          acciones={(fila) => (
            <>
              {config.accionesExtra?.(fila)}
              {!config.soloLectura && (
                <button
                  type="button"
                  className={tabla.btnIcono}
                  onClick={() => setModal({ abierto: true, fila })}
                  aria-label={texts.common.edit}
                  title={texts.common.edit}
                >
                  <Pencil size={16} />
                </button>
              )}
              {!config.sinEliminar && (config.puedeEliminar?.(fila) ?? true) && (
                <button
                  type="button"
                  className={[tabla.btnIcono, tabla.btnIconoPeligro].join(' ')}
                  onClick={() => void eliminar(fila)}
                  aria-label={texts.common.delete}
                  title={texts.common.delete}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
        />
      </div>

      {modal.abierto && (
        <ResourceFormModal
          key={modal.fila?.id ?? 'nuevo'}
          config={config}
          specs={specs}
          fila={modal.fila}
          onClose={() => setModal({ abierto: false, fila: null })}
        />
      )}
    </>
  )
}

/** Badge Activo/Inactivo para las columnas de estado */
export function BadgeActivo({ activo, genero = 'm' }: { activo: boolean; genero?: 'f' | 'm' }) {
  const texto = activo ? 'Activo' : 'Inactivo'
  return (
    <span className={[styles.badge, activo ? styles.badgeOk : styles.badgeOff].join(' ')}>
      {genero === 'f' ? `${texto.slice(0, -1)}a` : texto}
    </span>
  )
}

/** Miniatura para columnas de imagen ("—" si no hay) */
export function Miniatura({ url, cuadrada }: { url: string | null; cuadrada?: boolean }) {
  if (!url) return <>—</>
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      className={[styles.miniatura, cuadrada ? styles.miniaturaCuadrada : '']
        .filter(Boolean)
        .join(' ')}
    />
  )
}
