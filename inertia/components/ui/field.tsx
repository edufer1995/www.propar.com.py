import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import styles from './ui.module.css'

interface FieldChrome {
  label: string
  required?: boolean
  hint?: string
  /** Error del server (VineJS via Inertia) o del cliente. */
  error?: string
}

function FieldWrapper({
  id,
  label,
  required,
  hint,
  error,
  showError,
  children,
}: FieldChrome & { id: string; showError: boolean; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      {children}
      {showError && error ? (
        <span className={styles.error} role="alert">
          <CircleAlert size={14} /> {error}
        </span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </div>
  )
}

/**
 * Estados pristine/touched según ui-standards: el error solo se muestra
 * cuando el campo fue tocado (onBlur) o cuando viene del submit del server.
 */
function useTouched(error?: string) {
  const [touched, setTouched] = useState(false)
  // Un error presente implica submit del server → siempre visible.
  const showError = touched || Boolean(error)
  return { showError, markTouched: () => setTouched(true) }
}

export interface InputFieldProps extends FieldChrome, InputHTMLAttributes<HTMLInputElement> {}

export function InputField({
  label,
  required,
  hint,
  error,
  onBlur,
  className,
  ...rest
}: InputFieldProps) {
  const id = useId()
  const { showError, markTouched } = useTouched(error)
  return (
    <FieldWrapper
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
      showError={showError}
    >
      <input
        id={id}
        className={[styles.input, showError && error ? styles.inputError : '', className]
          .filter(Boolean)
          .join(' ')}
        required={required}
        aria-invalid={Boolean(error)}
        onBlur={(e) => {
          markTouched()
          onBlur?.(e)
        }}
        {...rest}
      />
    </FieldWrapper>
  )
}

export interface PasswordFieldProps extends FieldChrome, InputHTMLAttributes<HTMLInputElement> {}

/**
 * Campo de contraseña con toggle mostrar/ocultar (target táctil ≥ 44px).
 */
export function PasswordField({
  label,
  required,
  hint,
  error,
  onBlur,
  className,
  ...rest
}: PasswordFieldProps) {
  const id = useId()
  const { showError, markTouched } = useTouched(error)
  const [visible, setVisible] = useState(false)
  return (
    <FieldWrapper
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
      showError={showError}
    >
      <div className={styles.passwordWrap}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={[
            styles.input,
            styles.passwordInput,
            showError && error ? styles.inputError : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          required={required}
          aria-invalid={Boolean(error)}
          onBlur={(e) => {
            markTouched()
            onBlur?.(e)
          }}
          {...rest}
        />
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </FieldWrapper>
  )
}

export interface TextareaFieldProps
  extends FieldChrome, TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function TextareaField({
  label,
  required,
  hint,
  error,
  onBlur,
  className,
  ...rest
}: TextareaFieldProps) {
  const id = useId()
  const { showError, markTouched } = useTouched(error)
  return (
    <FieldWrapper
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
      showError={showError}
    >
      <textarea
        id={id}
        className={[styles.input, showError && error ? styles.inputError : '', className]
          .filter(Boolean)
          .join(' ')}
        required={required}
        aria-invalid={Boolean(error)}
        onBlur={(e) => {
          markTouched()
          onBlur?.(e)
        }}
        {...rest}
      />
    </FieldWrapper>
  )
}

export interface SelectFieldProps extends FieldChrome, SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
}

export function SelectField({
  label,
  required,
  hint,
  error,
  onBlur,
  className,
  children,
  ...rest
}: SelectFieldProps) {
  const id = useId()
  const { showError, markTouched } = useTouched(error)
  return (
    <FieldWrapper
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
      showError={showError}
    >
      <select
        id={id}
        className={[styles.input, showError && error ? styles.inputError : '', className]
          .filter(Boolean)
          .join(' ')}
        required={required}
        aria-invalid={Boolean(error)}
        onBlur={(e) => {
          markTouched()
          onBlur?.(e)
        }}
        {...rest}
      >
        {children}
      </select>
    </FieldWrapper>
  )
}
