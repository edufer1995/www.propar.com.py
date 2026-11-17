import { useEffect, type FormEvent } from 'react'
import { useForm } from '@inertiajs/react'

import { Button, InputField, Modal, TextareaField } from '~/components/ui'
import { texts } from '~/lib/texts'

import type { PropiedadesLote } from './types'
import styles from './map.module.css'

/**
 * Modal "Comprar": nombre + teléfono + comentario opcional, con el lote y
 * la fracción precargados en modo lectura. El backend revalida contra el
 * ERP (existencia + LIBRE) y guarda el lead con snapshot de precios.
 */
export function ComprarLoteModal({
  lote,
  fraccionDescripcion,
  open,
  onClose,
}: {
  lote: PropiedadesLote
  fraccionDescripcion: string
  open: boolean
  onClose: () => void
}) {
  const form = useForm({
    nombre: '',
    telefono: '',
    comentario: '',
    fraccion: lote.fraccionCodigo,
    manzana: lote.manzanaCodigo,
    lote: lote.loteCodigo,
  })

  /** Si cambia el lote elegido, precarga la terna nueva. */
  useEffect(() => {
    form.setData((datos) => ({
      ...datos,
      fraccion: lote.fraccionCodigo,
      manzana: lote.manzanaCodigo,
      lote: lote.loteCodigo,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lote.fml])

  const valido = form.data.nombre.trim().length >= 3 && form.data.telefono.trim().length >= 6

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    form.post('/loteamientos/comprar', {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        form.reset('nombre', 'telefono', 'comentario')
        onClose()
      },
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={`Comprar lote ${lote.fml}`}>
      <form onSubmit={enviar}>
        <div className={styles.compraResumen}>
          <span>
            <strong>Fracción:</strong> {fraccionDescripcion}
          </span>
          <span>
            <strong>Lote (F-M-L):</strong> {lote.fml}
          </span>
        </div>

        <InputField
          label="Nombre y apellido"
          name="nombre"
          required
          autoComplete="name"
          value={form.data.nombre}
          onChange={(e) => form.setData('nombre', e.target.value)}
          error={form.errors.nombre}
        />
        <InputField
          label="Teléfono"
          name="telefono"
          type="tel"
          required
          autoComplete="tel"
          placeholder="Ej: 0981 123 456"
          value={form.data.telefono}
          onChange={(e) => form.setData('telefono', e.target.value)}
          error={form.errors.telefono}
        />
        <TextareaField
          label="Comentario (opcional)"
          name="comentario"
          rows={3}
          value={form.data.comentario}
          onChange={(e) => form.setData('comentario', e.target.value)}
          error={form.errors.comentario}
        />

        {form.errors.lote && (
          <p className={styles.compraError} role="alert">
            {form.errors.lote}
          </p>
        )}

        <div className={styles.compraAcciones}>
          <Button type="button" variant="ghost" onClick={onClose}>
            {texts.common.cancel}
          </Button>
          <Button
            type="submit"
            variant="accent"
            disabled={!valido}
            loading={form.processing}
            loadingText={texts.common.sending}
          >
            Enviar solicitud
          </Button>
        </div>
      </form>
    </Modal>
  )
}
