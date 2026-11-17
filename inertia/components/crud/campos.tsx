/*
|--------------------------------------------------------------------------
| Motor de campos tipados del admin (compartido)
|--------------------------------------------------------------------------
|
| Render, validación de cliente y armado de payload de los campos
| declarativos (Campo de tipos.ts). Lo usan el ResourceFormModal (CRUD)
| y el SingletonEditor (páginas institucionales): un solo lugar define
| cómo se ve y se envía cada tipo de campo.
|
*/

import { InputField, SelectField, TextareaField, ToggleField } from '~/components/ui'
import { ImageUploader } from './image_uploader'
import { PdfUploader } from './pdf_uploader'
import { GaleriaUploader } from './galeria_uploader'
import { MapPicker } from './map_picker'
import type { Campo, SpecCliente, Valores, ValorArchivo, ValorImagen } from './tipos'
import styles from './crud.module.css'

export function primerError(error?: string | string[]): string | undefined {
  return Array.isArray(error) ? error[0] : error
}

/** Clave del payload/errores del server para un campo dado */
export function nombreServerDe(campo: Campo): string {
  if (campo.tipo === 'image' || campo.tipo === 'pdf') return `${campo.nombre}UploadId`
  if (campo.tipo === 'images') return `${campo.nombre}UploadIds`
  return campo.nombre
}

/** Errores de cliente: requeridos + validación extra de la config */
export function validarCliente(
  campos: Campo[],
  valores: Valores,
  validarExtra?: (v: Valores) => Record<string, string>
) {
  const errores: Record<string, string> = {}

  for (const campo of campos) {
    if (!campo.requerido) continue
    const valor = valores[campo.nombre]

    const vacio =
      valor === null ||
      valor === undefined ||
      (typeof valor === 'string' && valor.trim() === '') ||
      ((campo.tipo === 'image' || campo.tipo === 'pdf') && !valor) ||
      (campo.tipo === 'latlng' &&
        (!valor ||
          (valor as { lat: unknown }).lat === '' ||
          (valor as { lng: unknown }).lng === ''))

    if (vacio) {
      errores[campo.nombre] =
        campo.tipo === 'image'
          ? 'Subí una imagen'
          : campo.tipo === 'pdf'
            ? 'Adjuntá un PDF'
            : `Ingresá ${campo.etiqueta.toLowerCase()}`
    }
  }

  return { ...errores, ...(validarExtra?.(valores) ?? {}) }
}

/** Payload para el server según el tipo de cada campo */
export function armarPayload(campos: Campo[], valores: Valores, imagenesTocadas: Set<string>) {
  const payload: Record<string, unknown> = {}

  for (const campo of campos) {
    const valor = valores[campo.nombre]

    switch (campo.tipo) {
      case 'number':
        payload[campo.nombre] =
          valor === '' || valor === null || valor === undefined ? null : Number(valor)
        break
      case 'toggle':
        payload[campo.nombre] = Boolean(valor)
        break
      case 'date':
        payload[campo.nombre] = valor === '' || !valor ? null : valor
        break
      case 'image':
      case 'pdf': {
        // Convención: no tocado → no se envía (sin cambios); null → quitar
        if (!imagenesTocadas.has(campo.nombre)) break
        const imagen = valor as ValorImagen | null
        payload[`${campo.nombre}UploadId`] = imagen?.id ?? null
        break
      }
      case 'images': {
        if (!imagenesTocadas.has(campo.nombre)) break
        const imagenes = (valor as ValorImagen[]) ?? []
        payload[`${campo.nombre}UploadIds`] = imagenes.map((i) => i.id).filter(Boolean)
        break
      }
      case 'latlng': {
        const coordenadas = (valor as { lat: unknown; lng: unknown } | null) ?? { lat: '', lng: '' }
        payload.lat = coordenadas.lat === '' ? null : Number(coordenadas.lat)
        payload.lng = coordenadas.lng === '' ? null : Number(coordenadas.lng)
        break
      }
      default:
        payload[campo.nombre] = typeof valor === 'string' && valor.trim() === '' ? null : valor
    }
  }

  return payload
}

export interface CampoInputProps {
  campo: Campo
  valores: Valores
  specs: Record<string, SpecCliente>
  error?: string
  setValor: (nombre: string, valor: unknown) => void
  /** Marca un campo imagen/galería como tocado (para el payload) */
  marcarImagen: (nombre: string) => void
  /** Handler de blur del hook useTouchedFields */
  touch: (nombre: string) => () => void
}

/** Render de UN campo declarativo (todos los tipos del motor) */
export function CampoInput({
  campo,
  valores,
  specs,
  error,
  setValor,
  marcarImagen,
  touch,
}: CampoInputProps) {
  switch (campo.tipo) {
    case 'text':
      return (
        <InputField
          label={campo.etiqueta}
          required={campo.requerido}
          hint={campo.hint}
          maxLength={campo.maxLength}
          value={String(valores[campo.nombre] ?? '')}
          onChange={(e) => setValor(campo.nombre, e.target.value)}
          onBlur={touch(campo.nombre)}
          error={error}
        />
      )
    case 'textarea':
      return (
        <TextareaField
          label={campo.etiqueta}
          required={campo.requerido}
          hint={campo.hint}
          rows={campo.filas ?? 3}
          maxLength={campo.maxLength}
          value={String(valores[campo.nombre] ?? '')}
          onChange={(e) => setValor(campo.nombre, e.target.value)}
          onBlur={touch(campo.nombre)}
          error={error}
        />
      )
    case 'number':
      return (
        <InputField
          type="number"
          label={campo.etiqueta}
          required={campo.requerido}
          hint={campo.hint}
          min={campo.min}
          max={campo.max}
          step={campo.step}
          value={
            valores[campo.nombre] === null || valores[campo.nombre] === undefined
              ? ''
              : String(valores[campo.nombre])
          }
          onChange={(e) => setValor(campo.nombre, e.target.value)}
          onBlur={touch(campo.nombre)}
          error={error}
        />
      )
    case 'select':
      return (
        <SelectField
          label={campo.etiqueta}
          required={campo.requerido}
          hint={campo.hint}
          value={String(valores[campo.nombre] ?? '')}
          onChange={(e) => setValor(campo.nombre, e.target.value)}
          onBlur={touch(campo.nombre)}
          error={error}
        >
          {!campo.requerido && <option value="">—</option>}
          {campo.opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </SelectField>
      )
    case 'date':
      return (
        <InputField
          type="date"
          label={campo.etiqueta}
          required={campo.requerido}
          hint={campo.hint}
          value={String(valores[campo.nombre] ?? '')}
          onChange={(e) => setValor(campo.nombre, e.target.value)}
          onBlur={touch(campo.nombre)}
          error={error}
        />
      )
    case 'toggle':
      return (
        <ToggleField
          label={campo.etiqueta}
          hint={campo.hint}
          checked={Boolean(valores[campo.nombre])}
          onChange={(checked) => setValor(campo.nombre, checked)}
        />
      )
    case 'image':
      return (
        <ImageUploader
          etiqueta={campo.etiqueta}
          requerido={campo.requerido}
          hint={campo.hint}
          spec={specs[campo.spec]}
          specNombre={campo.spec}
          valor={(valores[campo.nombre] as ValorImagen | null) ?? null}
          onChange={(valor) => {
            marcarImagen(campo.nombre)
            setValor(campo.nombre, valor)
          }}
          error={error}
        />
      )
    case 'pdf':
      return (
        <PdfUploader
          etiqueta={campo.etiqueta}
          requerido={campo.requerido}
          hint={campo.hint}
          spec={specs[campo.spec]}
          specNombre={campo.spec}
          valor={(valores[campo.nombre] as ValorArchivo | null) ?? null}
          onChange={(valor) => {
            marcarImagen(campo.nombre)
            setValor(campo.nombre, valor)
          }}
          error={error}
        />
      )
    case 'images':
      return (
        <GaleriaUploader
          etiqueta={campo.etiqueta}
          spec={specs[campo.spec]}
          specNombre={campo.spec}
          maximo={campo.maximo}
          modo={campo.modo}
          valor={(valores[campo.nombre] as ValorImagen[] | null) ?? []}
          onChange={(valor) => {
            marcarImagen(campo.nombre)
            setValor(campo.nombre, valor)
          }}
          error={error}
        />
      )
    case 'latlng': {
      const coordenadas = (valores[campo.nombre] as { lat: unknown; lng: unknown } | null) ?? {
        lat: '',
        lng: '',
      }
      return (
        <div className={styles.form} style={{ gap: 'var(--space-2)' }}>
          <div className={styles.formFilaDoble}>
            <InputField
              type="number"
              step="any"
              label={`${campo.etiqueta} — latitud`}
              required={campo.requerido}
              value={coordenadas.lat === null ? '' : String(coordenadas.lat)}
              onChange={(e) => setValor(campo.nombre, { ...coordenadas, lat: e.target.value })}
              onBlur={touch(campo.nombre)}
              error={error}
              hint="Ej.: -25.283782"
            />
            <InputField
              type="number"
              step="any"
              label={`${campo.etiqueta} — longitud`}
              required={campo.requerido}
              value={coordenadas.lng === null ? '' : String(coordenadas.lng)}
              onChange={(e) => setValor(campo.nombre, { ...coordenadas, lng: e.target.value })}
              hint="Ej.: -57.632466"
            />
          </div>
          {campo.mapa && (
            <MapPicker
              lat={
                coordenadas.lat === '' || coordenadas.lat === null ? '' : Number(coordenadas.lat)
              }
              lng={
                coordenadas.lng === '' || coordenadas.lng === null ? '' : Number(coordenadas.lng)
              }
              onChange={(valor) => setValor(campo.nombre, valor)}
            />
          )}
        </div>
      )
    }
  }
}
