/*
|--------------------------------------------------------------------------
| ResourceFormModal — formulario modal generado desde la config
|--------------------------------------------------------------------------
|
| Renderiza los campos tipados del RecursoConfig con el motor compartido
| de campos (campos.tsx), valida en cliente (requeridos + validar() de la
| config) y envía por Inertia. Los errores del server (VineJS) llegan por
| props y se muestran inline.
|
| Cambios sin guardar: beforeunload + confirmación SweetAlert al cerrar.
|
*/

import { useMemo, useState } from 'react'
import { router, usePage } from '@inertiajs/react'

import { Button, Modal } from '~/components/ui'
import { useTouchedFields } from '~/hooks/use_touched_fields'
import { useUnsavedChanges } from '~/hooks/use_unsaved_changes'
import { texts } from '~/lib/texts'
import { CampoInput, armarPayload, nombreServerDe, primerError, validarCliente } from './campos'
import type { Campo, RecursoConfig, SpecCliente, Valores } from './tipos'
import styles from './crud.module.css'

interface Props<Fila extends { id: number }> {
  config: RecursoConfig<Fila>
  specs: Record<string, SpecCliente>
  /** null = crear */
  fila: Fila | null
  onClose: () => void
}

export function ResourceFormModal<Fila extends { id: number }>({
  config,
  specs,
  fila,
  onClose,
}: Props<Fila>) {
  const { props } = usePage()
  const erroresServer = (props.errors ?? {}) as Record<string, string | string[]>

  const iniciales = useMemo(
    () => (fila ? config.valoresDe(fila) : config.valoresNuevo),
    [fila, config]
  )

  /** Al editar se ocultan los campos soloCrear (ej. username) */
  const campos = useMemo(
    () => config.campos.filter((campo) => !fila || !campo.soloCrear),
    [config, fila]
  )

  const [valores, setValores] = useState<Valores>(iniciales)
  const [imagenesTocadas, setImagenesTocadas] = useState<Set<string>>(new Set())
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const { touch, isTouched } = useTouchedFields<string>()

  const dirty = useMemo(
    () => JSON.stringify(valores) !== JSON.stringify(iniciales),
    [valores, iniciales]
  )
  const { confirmarCierre } = useUnsavedChanges(dirty)

  const erroresCliente = validarCliente(campos, valores, config.validar)
  const esValido = Object.keys(erroresCliente).length === 0

  const setValor = (nombre: string, valor: unknown) =>
    setValores((v) => ({ ...v, [nombre]: valor }))

  const marcarImagen = (nombre: string) => setImagenesTocadas((s) => new Set(s).add(nombre))

  const cerrar = async () => {
    if (await confirmarCierre()) onClose()
  }

  const enviar = () => {
    if (!esValido || enviando) return
    setEnviado(true)

    // El payload es dinámico (campos por config): se castea al tipo de Inertia
    const payload = armarPayload(campos, valores, imagenesTocadas) as Record<string, never>
    const opciones = {
      preserveScroll: true,
      preserveState: true,
      onStart: () => setEnviando(true),
      onFinish: () => setEnviando(false),
      onSuccess: () => onClose(),
    }

    if (fila) {
      router.put(`${config.baseUrl}/${fila.id}`, payload, opciones)
    } else {
      router.post(config.baseUrl, payload, opciones)
    }
  }

  /** Error a mostrar: el del server (tras enviar) o el de cliente si el campo fue tocado */
  const errorDe = (campo: Campo): string | undefined => {
    if (campo.tipo === 'latlng') {
      const servidor = primerError(erroresServer.lat) ?? primerError(erroresServer.lng)
      if (enviado && servidor) return servidor
      return isTouched(campo.nombre) || enviado ? erroresCliente[campo.nombre] : undefined
    }

    const servidor = primerError(erroresServer[nombreServerDe(campo)])
    if (enviado && servidor) return servidor
    return isTouched(campo.nombre) || enviado ? erroresCliente[campo.nombre] : undefined
  }

  return (
    <Modal
      open
      onClose={() => void cerrar()}
      title={fila ? config.tituloEditar : config.tituloCrear}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => void cerrar()}>
            {texts.common.cancel}
          </Button>
          <Button
            type="submit"
            form="crud-form"
            loading={enviando}
            loadingText={texts.common.saving}
            disabled={!esValido}
          >
            {texts.common.save}
          </Button>
        </>
      }
    >
      <form
        id="crud-form"
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          enviar()
        }}
      >
        {fila && config.avisoEditar && <p className={styles.avisoForm}>{config.avisoEditar}</p>}
        {campos.map((campo) => (
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
      </form>
    </Modal>
  )
}
