/*
|--------------------------------------------------------------------------
| GeojsonUploader — campo de archivo .geojson del alta de planos
|--------------------------------------------------------------------------
|
| Lee el archivo en el navegador, lo valida con las mismas reglas que el
| server (parse JSON, FeatureCollection, Polygons, MZ/LT según el tipo,
| máx 2 MB) y entrega el File + los features parseados (para el preview).
|
*/

import { useRef, useState } from 'react'
import { CircleAlert, CircleCheck, FileUp, X } from 'lucide-react'

import { Button } from '~/components/ui'
import {
  PESO_MAXIMO_GEOJSON,
  parsearGeoJsonPlano,
  type FeaturePlanoCliente,
  type TipoArchivoPlano,
} from '~/lib/geojson_plano'
import styles from './crud.module.css'

export interface ArchivoPlano {
  archivo: File
  features: FeaturePlanoCliente[]
}

export interface GeojsonUploaderProps {
  etiqueta: string
  tipo: TipoArchivoPlano
  hint?: string
  valor: ArchivoPlano | null
  onChange: (valor: ArchivoPlano | null) => void
  /** Error del server (validación del import) */
  error?: string
}

export function GeojsonUploader({
  etiqueta,
  tipo,
  hint,
  valor,
  onChange,
  error,
}: GeojsonUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [errorCliente, setErrorCliente] = useState<string | null>(null)

  const mensajeError = errorCliente ?? error

  const elegir = async (archivo: File) => {
    setErrorCliente(null)

    if (archivo.size > PESO_MAXIMO_GEOJSON) {
      setErrorCliente('El archivo supera el máximo de 2 MB')
      onChange(null)
      return
    }

    try {
      const features = parsearGeoJsonPlano(await archivo.text(), tipo)
      onChange({ archivo, features })
    } catch (e) {
      setErrorCliente(e instanceof Error ? e.message : 'No se pudo leer el archivo')
      onChange(null)
    }
  }

  return (
    <div className={styles.uploader}>
      <span style={{ fontWeight: 600, fontSize: 14 }}>
        {etiqueta} <span style={{ color: 'var(--danger)' }}>*</span>
      </span>
      <span className={styles.uploaderRequisitos}>
        {hint ?? 'GeoJSON (FeatureCollection de polígonos) · máx 2 MB'}
      </span>

      <div className={styles.uploaderZona}>
        <div className={styles.uploaderAcciones}>
          {valor ? (
            <span className={styles.archivoElegido}>
              <CircleCheck size={16} style={{ color: 'var(--success)' }} />
              {valor.archivo.name} · {valor.features.length} feature
              {valor.features.length === 1 ? '' : 's'}
            </span>
          ) : null}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
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
        accept=".geojson,.json,application/geo+json,application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) void elegir(archivo)
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
