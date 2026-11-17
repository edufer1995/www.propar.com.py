/*
|--------------------------------------------------------------------------
| /app/colores — colores por estado de lote (14 filas fijas)
|--------------------------------------------------------------------------
|
| Cada estado del ERP tiene su color en el mapa público /loteamientos
| (fill de los polígonos + leyenda). Editor simple: swatch que abre un
| color picker (react-colorful) + campo hex editable, preview del
| contraste con texto blanco/negro automático, y UN botón que guarda
| todos los cambios juntos (transacción en el server).
|
*/

import { useMemo, useState, type ReactElement } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { HexColorPicker } from 'react-colorful'
import { RotateCcw } from 'lucide-react'

import AdminLayout from '~/layouts/admin'
import { Button } from '~/components/ui'
import { useUnsavedChanges } from '~/hooks/use_unsaved_changes'
import { texts } from '~/lib/texts'
import crud from '~/components/crud/crud.module.css'
import styles from './colores.module.css'

/** Tipo (no interface): el render tipado de Inertia exige index signature implícita */
type ColorFila = {
  id: number
  estado: string
  color: string
  descripcion: string | null
}

const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/

/** Texto blanco o negro según la luminancia del fondo (WCAG aproximado) */
function textoSobre(hex: string): '#ffffff' | '#111111' {
  if (!HEX_VALIDO.test(hex)) return '#111111'
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255
  const canal = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminancia = 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
  return luminancia > 0.35 ? '#111111' : '#ffffff'
}

function FilaColor({
  fila,
  valor,
  abierto,
  onToggle,
  onChange,
}: {
  fila: ColorFila
  valor: string
  abierto: boolean
  onToggle: () => void
  onChange: (hex: string) => void
}) {
  const valido = HEX_VALIDO.test(valor)
  const cambiado = valor.toUpperCase() !== fila.color.toUpperCase()

  return (
    <div className={styles.fila}>
      <div className={styles.filaCabecera}>
        <button
          type="button"
          className={styles.swatch}
          style={{ background: valido ? valor : 'var(--surface-2)' }}
          onClick={onToggle}
          aria-label={`Elegir color de ${fila.estado}`}
          aria-expanded={abierto}
        />
        <div className={styles.filaTextos}>
          <span
            className={styles.preview}
            style={
              valido
                ? { background: valor, color: textoSobre(valor) }
                : { background: 'var(--surface-2)', color: 'var(--text-muted)' }
            }
          >
            {fila.estado}
          </span>
          {cambiado && <span className={styles.cambiado}>modificado</span>}
        </div>
        <div className={styles.filaHex}>
          <input
            className={[styles.inputHex, !valido ? styles.inputHexError : '']
              .filter(Boolean)
              .join(' ')}
            value={valor}
            maxLength={7}
            onChange={(e) => {
              const crudo = e.target.value.trim()
              onChange(crudo.startsWith('#') || crudo === '' ? crudo : `#${crudo}`)
            }}
            aria-label={`Color hex de ${fila.estado}`}
            spellCheck={false}
          />
          {cambiado && (
            <button
              type="button"
              className={styles.deshacer}
              onClick={() => onChange(fila.color)}
              aria-label={`Volver al color guardado de ${fila.estado}`}
              title="Volver al guardado"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {!valido && (
        <span className={styles.errorHex} role="alert">
          Usá el formato #rrggbb (ej. #99CD68)
        </span>
      )}

      {abierto && (
        <div className={styles.picker}>
          <HexColorPicker color={valido ? valor : fila.color} onChange={onChange} />
        </div>
      )}
    </div>
  )
}

export default function Colores(props: { colores: ColorFila[] }) {
  const { props: pageProps } = usePage()
  const erroresServer = (pageProps.errors ?? {}) as Record<string, unknown>

  const [valores, setValores] = useState<Record<number, string>>(() =>
    Object.fromEntries(props.colores.map((c) => [c.id, c.color]))
  )
  const [abierto, setAbierto] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)

  /** Al volver del server con datos frescos, resincroniza lo guardado. */
  const firmaServer = props.colores.map((c) => `${c.id}:${c.color}`).join('|')
  const [firmaPrevia, setFirmaPrevia] = useState(firmaServer)
  if (firmaServer !== firmaPrevia) {
    setFirmaPrevia(firmaServer)
    setValores(Object.fromEntries(props.colores.map((c) => [c.id, c.color])))
  }

  const cambios = useMemo(
    () =>
      props.colores.filter(
        (c) => (valores[c.id] ?? c.color).toUpperCase() !== c.color.toUpperCase()
      ),
    [props.colores, valores]
  )
  const todosValidos = props.colores.every((c) => HEX_VALIDO.test(valores[c.id] ?? ''))
  const dirty = cambios.length > 0

  useUnsavedChanges(dirty)

  const guardar = () => {
    if (!dirty || !todosValidos || enviando) return
    router.post(
      '/app/colores',
      {
        colores: cambios.map((c) => ({ id: c.id, color: valores[c.id] })),
      } as unknown as Record<string, never>,
      {
        preserveScroll: true,
        onStart: () => setEnviando(true),
        onFinish: () => setEnviando(false),
      }
    )
  }

  const hayErrorServer = Object.keys(erroresServer).length > 0

  return (
    <>
      <Head title="Colores" />

      <div className={crud.pagina}>
        <div className={crud.encabezado}>
          <div className={crud.encabezadoTextos}>
            <h1 className={crud.titulo}>Colores de estados</h1>
            <p className={crud.descripcion}>
              Colores de los lotes en el mapa público /loteamientos (polígonos y leyenda). El
              preview muestra el contraste del texto sobre cada color.
            </p>
          </div>
          <Button
            type="button"
            onClick={guardar}
            loading={enviando}
            loadingText={texts.common.saving}
            disabled={!dirty || !todosValidos}
          >
            {dirty
              ? `Guardar ${cambios.length} cambio${cambios.length === 1 ? '' : 's'}`
              : 'Sin cambios'}
          </Button>
        </div>

        {hayErrorServer && (
          <p className={crud.avisoForm} role="alert">
            No se pudieron guardar los colores: revisá que todos tengan formato #rrggbb.
          </p>
        )}

        {props.colores.length === 0 ? (
          <p className={crud.descripcion}>
            No hay estados cargados: se importan con el ETL desde el sitio viejo.
          </p>
        ) : (
          <div className={styles.lista}>
            {props.colores.map((fila) => (
              <FilaColor
                key={fila.id}
                fila={fila}
                valor={valores[fila.id] ?? fila.color}
                abierto={abierto === fila.id}
                onToggle={() => setAbierto((actual) => (actual === fila.id ? null : fila.id))}
                onChange={(hex) => setValores((v) => ({ ...v, [fila.id]: hex }))}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

Colores.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
