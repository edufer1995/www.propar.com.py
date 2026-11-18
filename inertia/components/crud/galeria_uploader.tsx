/*
|--------------------------------------------------------------------------
| GaleriaUploader — campo images (galería múltiple con orden)
|--------------------------------------------------------------------------
|
| Reusa la validación/subida del ImageUploader pero acumula varios
| uploads y permite reordenarlos (el orden del array es el orden que se
| envía al server como `<campo>UploadIds`).
|
| Ningún recurso de la Etapa 5a lo usa todavía: queda listo para
| otras galerías.
|
*/

import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CircleAlert, ImagePlus, Video, X } from 'lucide-react'

import { Button } from '~/components/ui'
import {
  subirImagen,
  validarImagenCliente,
  validarVideoCliente,
  type SpecCliente,
} from '~/lib/subir_imagen'
import type { ValorImagen } from './tipos'
import styles from './crud.module.css'

export interface GaleriaUploaderProps {
  etiqueta: string
  spec: SpecCliente
  specNombre: string
  valor: ValorImagen[]
  onChange: (valor: ValorImagen[]) => void
  maximo?: number
  /** 'video' acepta MP4 y muestra previews de <video> (default imagen) */
  modo?: 'imagen' | 'video'
  error?: string
}

export function GaleriaUploader({
  etiqueta,
  spec,
  specNombre,
  valor,
  onChange,
  maximo = 12,
  modo = 'imagen',
  error,
}: GaleriaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progreso, setProgreso] = useState<number | null>(null)
  const [errorCliente, setErrorCliente] = useState<string | null>(null)

  const mensajeError = errorCliente ?? error

  const esVideo = modo === 'video'

  const agregar = async (archivo: File) => {
    setErrorCliente(null)
    if (valor.length >= maximo) {
      setErrorCliente(`La galería admite hasta ${maximo} ${esVideo ? 'videos' : 'imágenes'}`)
      return
    }

    const rechazo = esVideo
      ? validarVideoCliente(archivo, spec)
      : await validarImagenCliente(archivo, spec)
    if (rechazo) {
      setErrorCliente(rechazo)
      return
    }

    const previewUrl = URL.createObjectURL(archivo)
    setProgreso(0)
    try {
      const resultado = await subirImagen(archivo, specNombre, setProgreso)
      onChange([...valor, { id: resultado.id, url: previewUrl }])
    } catch (e) {
      URL.revokeObjectURL(previewUrl)
      setErrorCliente(
        e instanceof Error ? e.message : `No se pudo subir ${esVideo ? 'el video' : 'la imagen'}`
      )
    } finally {
      setProgreso(null)
    }
  }

  const mover = (desde: number, hacia: number) => {
    if (hacia < 0 || hacia >= valor.length) return
    const copia = [...valor]
    const [item] = copia.splice(desde, 1)
    copia.splice(hacia, 0, item)
    onChange(copia)
  }

  const quitar = (indice: number) => onChange(valor.filter((_, i) => i !== indice))

  return (
    <div className={styles.uploader}>
      <span style={{ fontWeight: 600, fontSize: 14 }}>{etiqueta}</span>
      <span className={styles.uploaderRequisitos}>{spec.texto}</span>

      <div className={styles.galeria}>
        {valor.map((imagen, i) => (
          <div className={styles.galeriaItem} key={imagen.id ?? imagen.url ?? i}>
            {imagen.url &&
              (esVideo ? (
                <video
                  src={imagen.url}
                  className={styles.uploaderPreview}
                  preload="metadata"
                  muted
                />
              ) : (
                <img src={imagen.url} alt={`Imagen ${i + 1}`} className={styles.uploaderPreview} />
              ))}
            <div className={styles.galeriaControles}>
              <button
                type="button"
                className={styles.btnIcono}
                onClick={() => mover(i, i - 1)}
                disabled={i === 0}
                aria-label="Mover a la izquierda"
              >
                <ArrowLeft size={14} />
              </button>
              <button
                type="button"
                className={styles.btnIcono}
                onClick={() => quitar(i)}
                aria-label="Quitar imagen"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                className={styles.btnIcono}
                onClick={() => mover(i, i + 1)}
                disabled={i === valor.length - 1}
                aria-label="Mover a la derecha"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {progreso !== null ? (
        <>
          <div className={styles.progreso} role="progressbar" aria-valuenow={progreso}>
            <div className={styles.progresoBarra} style={{ width: `${progreso}%` }} />
          </div>
          <span className={styles.progresoTexto}>Subiendo... {progreso}%</span>
        </>
      ) : (
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={valor.length >= maximo}
          >
            {esVideo ? <Video size={16} /> : <ImagePlus size={16} />}
            {esVideo ? ' Agregar video' : ' Agregar imagen'}
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={esVideo ? 'video/mp4' : 'image/png,image/jpeg,image/webp'}
        style={{ display: 'none' }}
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) void agregar(archivo)
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
