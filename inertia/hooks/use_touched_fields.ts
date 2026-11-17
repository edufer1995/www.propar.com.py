import { useState } from 'react'

/**
 * Estados pristine/touched a nivel de formulario (ui-standards): los errores
 * de validación de cliente solo se muestran cuando el campo fue tocado
 * (onBlur). Los errores del server se muestran siempre (implican submit).
 *
 * Uso:
 *   const { touch, isTouched } = useTouchedFields<'email' | 'password'>()
 *   <InputField onBlur={touch('email')}
 *     error={serverError ?? (isTouched('email') ? clientError : undefined)} />
 */
export function useTouchedFields<K extends string>() {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({})

  const touch = (key: K) => () => {
    setTouched((current) => (current[key] ? current : { ...current, [key]: true }))
  }

  const isTouched = (key: K) => Boolean(touched[key])

  /** Vuelve todo a pristine (p. ej. tras un submit exitoso). */
  const reset = () => setTouched({})

  return { touch, isTouched, reset }
}
