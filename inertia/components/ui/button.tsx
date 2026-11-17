import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import styles from './ui.module.css'
import { Spinner } from './spinner'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'

const variantClass: Record<Variant, string> = {
  primary: styles.btnPrimary,
  accent: styles.btnAccent,
  secondary: styles.btnSecondary,
  ghost: styles.btnGhost,
  danger: styles.btnDanger,
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** Estado de envío: deshabilita (anti doble-submit) y muestra spinner + texto alternativo. */
  loading?: boolean
  loadingText?: string
  children: ReactNode
}

export function Button({
  variant = 'primary',
  loading = false,
  loadingText,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[styles.btn, variantClass[variant], className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {loading ? (loadingText ?? children) : children}
    </button>
  )
}
