/*
|--------------------------------------------------------------------------
| SingletonEditor — formulario de página completa para singletons
|--------------------------------------------------------------------------
|
| Editor genérico de las páginas institucionales (quiénes somos, misión,
| visión, producto, trayectoria): una sola fila, sin lista.
| Reutiliza el motor de campos del CRUD (campos.tsx): GET show entrega
| los valores actuales y POST update persiste (useForm-like con Inertia
| router + unsaved changes + toast del flash).
|
| La página de cada singleton queda en:
|   <SingletonEditor config={config} valoresIniciales={...} specs={...} />
|
*/

import { useMemo, useState } from 'react'
import { Head, router, usePage } from '@inertiajs/react'

import { Button } from '~/components/ui'
import { useTouchedFields } from '~/hooks/use_touched_fields'
import { useUnsavedChanges } from '~/hooks/use_unsaved_changes'
import { texts } from '~/lib/texts'
import { CampoInput, armarPayload, nombreServerDe, primerError, validarCliente } from './campos'
import type { Campo, SpecCliente, Valores } from './tipos'
import styles from './crud.module.css'

export interface SingletonConfig {
  titulo: string
  /** Dónde impacta ("Se muestra en /quienes-somos") */
  descripcion?: string
  /** Ruta del POST update (ej. '/app/mision') */
  baseUrl: string
  campos: Campo[]
}

export interface SingletonEditorProps {
  config: SingletonConfig
  valoresIniciales: Valores
  specs?: Record<string, SpecCliente>
}

export function SingletonEditor({ config, valoresIniciales, specs = {} }: SingletonEditorProps) {
  const { props } = usePage()
  const erroresServer = (props.errors ?? {}) as Record<string, string | string[]>

  const [valores, setValores] = useState<Valores>(valoresIniciales)
  const [imagenesTocadas, setImagenesTocadas] = useState<Set<string>>(new Set())
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const { touch, isTouched } = useTouchedFields<string>()

  /** Referencia estable de los valores guardados para el dirty check */
  const [guardados, setGuardados] = useState(valoresIniciales)
  const dirty = useMemo(
    () => JSON.stringify(valores) !== JSON.stringify(guardados) || imagenesTocadas.size > 0,
    [valores, guardados, imagenesTocadas]
  )
  useUnsavedChanges(dirty)

  const erroresCliente = validarCliente(config.campos, valores)
  const esValido = Object.keys(erroresCliente).length === 0

  const setValor = (nombre: string, valor: unknown) =>
    setValores((v) => ({ ...v, [nombre]: valor }))

  const marcarImagen = (nombre: string) => setImagenesTocadas((s) => new Set(s).add(nombre))

  const enviar = () => {
    if (!esValido || enviando) return
    setEnviado(true)

    const payload = armarPayload(config.campos, valores, imagenesTocadas) as Record<string, never>
    router.post(config.baseUrl, payload, {
      preserveScroll: true,
      onStart: () => setEnviando(true),
      onFinish: () => setEnviando(false),
      onSuccess: () => {
        setGuardados(valores)
        setImagenesTocadas(new Set())
        setEnviado(false)
      },
    })
  }

  const errorDe = (campo: Campo): string | undefined => {
    const servidor = primerError(erroresServer[nombreServerDe(campo)])
    if (enviado && servidor) return servidor
    return isTouched(campo.nombre) || enviado ? erroresCliente[campo.nombre] : undefined
  }

  return (
    <>
      <Head title={config.titulo} />

      <div className={styles.pagina}>
        <div className={styles.encabezado}>
          <div className={styles.encabezadoTextos}>
            <h1 className={styles.titulo}>{config.titulo}</h1>
            {config.descripcion && <p className={styles.descripcion}>{config.descripcion}</p>}
          </div>
        </div>

        <form
          className={[styles.form, styles.formSingleton].join(' ')}
          onSubmit={(e) => {
            e.preventDefault()
            enviar()
          }}
        >
          {config.campos.map((campo) => (
            <CampoInput
              key={campo.nombre}
              campo={campo}
              valores={valores}
              specs={specs}
              error={errorDe(campo)}
              setValor={setValor}
              marcarImagen={marcarImagen}
              touch={touch}
            />
          ))}

          <div className={styles.formAcciones}>
            <Button
              type="submit"
              loading={enviando}
              loadingText={texts.common.saving}
              disabled={!esValido || !dirty}
            >
              {texts.common.save}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
