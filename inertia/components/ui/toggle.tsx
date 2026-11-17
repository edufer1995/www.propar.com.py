import { useId } from 'react'
import styles from './ui.module.css'

export interface ToggleFieldProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
  disabled?: boolean
}

/**
 * Switch accesible (checkbox estilizado). Target táctil ≥ 44px y estado
 * comunicado también por texto (Activo/Inactivo), no solo por color.
 */
export function ToggleField({ label, checked, onChange, hint, disabled }: ToggleFieldProps) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label className={styles.toggleRow} htmlFor={id}>
        <span className={styles.label}>{label}</span>
        <span className={styles.toggleControl}>
          <input
            id={id}
            type="checkbox"
            role="switch"
            className={styles.toggleInput}
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className={styles.toggleTrack} aria-hidden>
            <span className={styles.toggleThumb} />
          </span>
          <span className={styles.toggleEstado}>{checked ? 'Activo' : 'Inactivo'}</span>
        </span>
      </label>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}
