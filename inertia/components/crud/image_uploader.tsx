/*
|--------------------------------------------------------------------------
| ImageUploader — campo imagen del motor CRUD
|--------------------------------------------------------------------------
|
| Muestra los requisitos de la spec ANTES de elegir, valida el archivo en
| cliente (peso/tipo/dimensiones/proporción), previsualiza con objectURL,
| sube a /api/uploads con barra de progreso y entrega el id del upload.
|
*/

import { useId, useRef, useState } from 'react'
import { CircleAlert, ImagePlus, Trash2 } from 'lucide-react'

import { Button } from '~/components/ui'
import { subirImagen, validarImagenCliente, type SpecCliente } from '~/lib/subir_imagen'
import type { ValorImagen } from './tipos'
import styles from './crud.module.css'

export interface ImageUploaderProps {
  etiqueta: string
  requerido?: boolean
  /** Aclaración de para qué se usa la imagen (va debajo de los requisitos) */
  hint?: string
  spec: SpecCliente
  /** Nombre de la spec para el endpoint de uploads (ej. 'carrusel') */
  specNombre: string
  valor: ValorImagen | null
  onChange: (valor: ValorImagen | null) => void
  /** Error del server (validación del recurso) */
  error?: string
}

export function ImageUploader({
  etiqueta,
  requerido,
  hint,
  spec,
  specNombre,
  valor,
  onChange,
  error,
}: ImageUploaderProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [progreso, setProgreso] = useState<number | null>(null)
  const [errorCliente, setErrorCliente] = useState<string | null>(null)

  const subiendo = progreso !== null
  const mensajeError = errorCliente ?? error

  const elegirArchivo = async (archivo: File) => {
    setErrorCliente(null)

    // Validación en cliente ANTES de subir (la misma que hará el server)
    const rechazo = await validarImagenCliente(archivo, spec)
    if (rechazo) {
      setErrorCliente(rechazo)
      return
    }

    // Preview inmediato con objectURL mientras sube
    const previewUrl = URL.createObjectURL(archivo)
    setProgreso(0)
    try {
      const resultado = await subirImagen(archivo, specNombre, setProgreso)
      onChange({ id: resultado.id, url: previewUrl })
    } catch (e) {
      URL.revokeObjectURL(previewUrl)
      setErrorCliente(e instanceof Error ? e.message : 'No se pudo subir la imagen')
    } finally {
      setProgreso(null)
    }
  }

  const cuadrada = spec.aspecto === 'cuadrada'

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
          <span className={styles.uploaderPreviewWrap}>
            <img
              src={valor.url}
              alt="Vista previa"
              className={[styles.uploaderPreview, cuadrada ? styles.uploaderPreviewCuadrada : '']
                .filter(Boolean)
                .join(' ')}
            />
          </span>
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
                <ImagePlus size={16} /> {valor?.url ? 'Cambiar imagen' : 'Elegir imagen'}
              </Button>
              {valor?.url && (
                <Button type="button" variant="ghost" onClick={() => onChange(null)}>
                  <Trash2 size={16} /> Quitar imagen
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
        accept="image/png,image/jpeg,image/webp"
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
