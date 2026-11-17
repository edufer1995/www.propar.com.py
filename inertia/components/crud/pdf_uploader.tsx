/*
|--------------------------------------------------------------------------
| PdfUploader — campo documento PDF del motor CRUD
|--------------------------------------------------------------------------
|
| Mismo contrato que ImageUploader pero para documentos (ej. bases y
| condiciones de una promoción): muestra los requisitos de la spec, valida
| en cliente (tipo + peso), sube a /api/uploads con barra de progreso y
| entrega el id del upload. Sin preview de imagen: muestra el nombre del
| archivo con enlace para abrirlo.
|
*/

import { useId, useRef, useState } from 'react'
import { CircleAlert, FileText, FileUp, Trash2 } from 'lucide-react'

import { Button } from '~/components/ui'
import { subirImagen, validarPdfCliente, type SpecCliente } from '~/lib/subir_imagen'
import type { ValorArchivo } from './tipos'
import styles from './crud.module.css'

export interface PdfUploaderProps {
  etiqueta: string
  requerido?: boolean
  /** Aclaración de para qué se usa el documento (va debajo de los requisitos) */
  hint?: string
  spec: SpecCliente
  /** Nombre de la spec para el endpoint de uploads (ej. 'basesPromocion') */
  specNombre: string
  valor: ValorArchivo | null
  onChange: (valor: ValorArchivo | null) => void
  /** Error del server (validación del recurso) */
  error?: string
}

export function PdfUploader({
  etiqueta,
  requerido,
  hint,
  spec,
  specNombre,
  valor,
  onChange,
  error,
}: PdfUploaderProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [progreso, setProgreso] = useState<number | null>(null)
  const [errorCliente, setErrorCliente] = useState<string | null>(null)

  const subiendo = progreso !== null
  const mensajeError = errorCliente ?? error

  const elegirArchivo = async (archivo: File) => {
    setErrorCliente(null)

    const rechazo = validarPdfCliente(archivo, spec)
    if (rechazo) {
      setErrorCliente(rechazo)
      return
    }

    setProgreso(0)
    try {
      const resultado = await subirImagen(archivo, specNombre, setProgreso)
      onChange({ id: resultado.id, url: resultado.url, nombre: archivo.name })
    } catch (e) {
      setErrorCliente(e instanceof Error ? e.message : 'No se pudo subir el PDF')
    } finally {
      setProgreso(null)
    }
  }

  return (
    <div className={styles.uploader}>
      <label htmlFor={id} style={{ fontWeight: 600, fontSize: 14 }}>
        {etiqueta} {requerido && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      {/* Requisitos visibles ANTES de elegir el archivo */}
      <span className={styles.uploaderRequisitos}>{spec.texto}</span>
      {hint && <span className={styles.uploaderRequisitos}>{hint}</span>}

      <div className={styles.uploaderZona}>
        {valor?.url && (
          <a
            href={valor.url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              minWidth: 0,
            }}
            title="Abrir el PDF en otra pestaña"
          >
            <FileText size={16} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {valor.nombre ?? 'Documento adjunto (PDF)'}
            </span>
          </a>
        )}

        <div className={styles.uploaderAcciones}>
          {subiendo ? (
            <>
              <div className={styles.progreso} role="progressbar" aria-valuenow={progreso ?? 0}>
                <div className={styles.progresoBarra} style={{ width: `${progreso}%` }} />
              </div>
              <span className={styles.progresoTexto}>Subiendo... {progreso}%</span>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
                <FileUp size={16} /> {valor?.url ? 'Cambiar PDF' : 'Adjuntar PDF'}
              </Button>
              {valor?.url && (
                <Button type="button" variant="ghost" onClick={() => onChange(null)}>
                  <Trash2 size={16} /> Quitar PDF
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) void elegirArchivo(archivo)
          // Permite volver a elegir el mismo archivo tras un error
          e.target.value = ''
        }}
      />

      {mensajeError && (
        <span
          style={{
            fontSize: 13,
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          role="alert"
        >
          <CircleAlert size={14} /> {mensajeError}
        </span>
      )}
    </div>
  )
}
