import styles from './ui.module.css'

/**
 * Fuerza 0-4 por longitud + variedad de caracteres. Es un indicador de UX,
 * no una política: la validación real vive en el backend (min 8).
 */
export function passwordStrength(value: string): number {
  if (!value) return 0
  let score = 0
  if (value.length >= 8) score++
  if (value.length >= 12) score++
  const variedad =
    Number(/[a-z]/.test(value)) +
    Number(/[A-Z]/.test(value)) +
    Number(/\d/.test(value)) +
    Number(/[^a-zA-Z0-9]/.test(value))
  if (variedad >= 2) score++
  if (variedad >= 3 && value.length >= 10) score++
  return score
}

const NIVELES = [
  { label: 'Muy débil', color: 'var(--danger)' },
  { label: 'Muy débil', color: 'var(--danger)' },
  { label: 'Débil', color: 'var(--warning)' },
  { label: 'Aceptable', color: 'var(--brand-verde)' },
  { label: 'Fuerte', color: 'var(--success)' },
] as const

/**
 * Barra de fuerza en vivo para formularios de contraseña nueva.
 * Se actualiza por tecla (excepción explícita de ui-standards).
 */
export function PasswordStrengthMeter({ value }: { value: string }) {
  const score = passwordStrength(value)
  const nivel = NIVELES[score]
  const activo = value.length > 0

  return (
    <div className={styles.meter} aria-live="polite">
      <div className={styles.meterTrack}>
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className={styles.meterSegment}
            style={{ background: activo && score >= seg ? nivel.color : 'var(--surface-2)' }}
          />
        ))}
      </div>
      <span className={styles.meterLabel} style={activo ? { color: nivel.color } : undefined}>
        {activo
          ? `Fuerza: ${nivel.label}`
          : 'Mínimo 8 caracteres; mejor con mayúsculas, números y símbolos'}
      </span>
    </div>
  )
}
