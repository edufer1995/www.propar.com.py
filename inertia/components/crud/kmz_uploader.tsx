/*
|--------------------------------------------------------------------------
| KmzUploader — campo .kmz/.kml del alta de planos
|--------------------------------------------------------------------------
|
| Al elegir el archivo lo manda a /app/planos/previsualizar-kmz (no guarda
| nada) y muestra lo que encontró: cantidad de manzanas y lotes, los
| errores que impiden importarlo y los avisos (capas ignoradas, plazas,
| lotes sin número…). Entrega el File + el resultado para el preview.
|
*/

import { useRef, useState } from 'react'
import { CircleAlert, CircleCheck, FileUp, Info, X } from 'lucide-react'

import { Button } from '~/components/ui'
import type { GeojsonPlano } from '~/components/planos/plano_viewer'
import { tokenXsrf } from '~/lib/subir_imagen'
import styles from './crud.module.css'

export const PESO_MAXIMO_KMZ = 10 * 1024 * 1024

export interface RevisionKmz {
  ok: boolean
  errores: string[]
  avisos: string[]
  resumen: { manzanas: number; lotes: number }
  geojson: GeojsonPlano
}

export interface ArchivoKmz {
  archivo: File
  revision: RevisionKmz
}

export interface KmzUploaderProps {
  valor: ArchivoKmz | null
  onChange: (valor: ArchivoKmz | null) => void
  /** Error del server (al importar) */
  error?: string
}

/** Primer mensaje de un 422 de validación, o un texto genérico */
async function mensajeDeError(res: Response): Promise<string> {
  try {
    const cuerpo = (await res.json()) as { errors?: { message?: string }[] }
    const mensaje = cuerpo.errors?.[0]?.message
    if (mensaje) return mensaje
  } catch {
    // respuesta sin JSON
  }
  if (res.status === 413) return 'El archivo supera el máximo de 10 MB'
  return 'No se pudo revisar el archivo. Probá de nuevo.'
}

export function KmzUploader({ valor, onChange, error }: KmzUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [errorCliente, setErrorCliente] = useState<string | null>(null)
  const [revisando, setRevisando] = useState(false)

  const mensajeError = errorCliente ?? error

  const elegir = async (archivo: File) => {
    setErrorCliente(null)
    onChange(null)

    if (!/\.(kmz|kml)$/i.test(archivo.name)) {
      setErrorCliente('El plano debe ser un archivo .kmz o .kml')
      return
    }
    if (archivo.size > PESO_MAXIMO_KMZ) {
      setErrorCliente('El archivo supera el máximo de 10 MB')
      return
    }

    const datos = new FormData()
    datos.append('archivoKmz', archivo)
    setRevisando(true)
    try {
      const res = await fetch('/app/planos/previsualizar-kmz', {
        method: 'POST',
        body: datos,
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json', 'X-XSRF-TOKEN': tokenXsrf() },
      })
      if (!res.ok) {
        setErrorCliente(await mensajeDeError(res))
        return
      }
      onChange({ archivo, revision: (await res.json()) as RevisionKmz })
    } catch {
      setErrorCliente('No hay conexión. Revisá internet y probá de nuevo.')
    } finally {
      setRevisando(false)
    }
  }

  const revision = valor?.revision

  return (
    <div className={styles.uploader}>
      <span style={{ fontWeight: 600, fontSize: 14 }}>
        Archivo del plano <span style={{ color: 'var(--danger)' }}>*</span>
      </span>
      <span className={styles.uploaderRequisitos}>
        KMZ o KML con las capas POLIGONO, MAN, MAN_TEXT, LOTE y LOTE_TEXT · máx 10 MB
      </span>

      <div className={styles.uploaderZona}>
        <div className={styles.uploaderAcciones}>
          {valor && revision ? (
            <span className={styles.archivoElegido}>
              {revision.ok ? (
                <CircleCheck size={16} style={{ color: 'var(--success)' }} />
              ) : (
                <CircleAlert size={16} style={{ color: 'var(--danger)' }} />
              )}
              {valor.archivo.name} · {revision.resumen.manzanas} manzanas · {revision.resumen.lotes}{' '}
              lotes
            </span>
          ) : null}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              type="button"
              variant="secondary"
              loading={revisando}
              loadingText="Revisando..."
              onClick={() => inputRef.current?.click()}
            >
              <FileUp size={16} /> {valor ? 'Cambiar archivo' : 'Elegir archivo'}
            </Button>
            {valor && (
              <Button type="button" variant="ghost" onClick={() => onChange(null)}>
                <X size={16} /> Quitar
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".kmz,.kml,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml"
        style={{ display: 'none' }}
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) void elegir(archivo)
          e.target.value = ''
        }}
      />

      {mensajeError && (
        <span className={styles.kmzMensaje} style={{ color: 'var(--danger)' }} role="alert">
          <CircleAlert size={14} /> {mensajeError}
        </span>
      )}

      {revision && revision.errores.length > 0 && (
        <div className={styles.kmzLista} role="alert">
          <strong style={{ color: 'var(--danger)' }}>
            Hay que corregir el plano antes de importarlo:
          </strong>
          <ul>
            {revision.errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {revision && revision.avisos.length > 0 && (
        <div className={styles.kmzLista}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Info size={14} /> Para tener en cuenta (no impide importar):
          </strong>
          <ul>
            {revision.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
