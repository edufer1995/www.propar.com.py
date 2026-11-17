import { useId, type InputHTMLAttributes } from 'react'
import styles from './ui.module.css'

export interface RangeSliderProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange'
> {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (valor: number) => void
  /** Texto del valor actual mostrado a la derecha del label (ej. "70%") */
  valueLabel?: string
}

/**
 * Slider de rango del kit UI (input range accesible, label real y valor
 * visible). Usado por la transparencia de polígonos del mapa.
 */
export function RangeSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  valueLabel,
  ...rest
}: RangeSliderProps) {
  const id = useId()
  /** Porcentaje recorrido, para pintar la barra de progreso del track. */
  const progreso = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <div className={styles.rangeWrap}>
      <div className={styles.rangeHeader}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        {valueLabel && (
          <span className={styles.rangeValue} aria-hidden>
            {valueLabel}
          </span>
        )}
      </div>
      <input
        id={id}
        type="range"
        className={styles.range}
        style={{ '--range-fill': `${progreso}%` } as React.CSSProperties}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={valueLabel}
        {...rest}
      />
    </div>
  )
}
