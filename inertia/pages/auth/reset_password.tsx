import { useState, type ReactElement } from 'react'
import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { TriangleAlert } from 'lucide-react'
import AuthLayout from '~/layouts/auth'
import { FlashAlert } from '~/components/flash_alert'
import { Button, PasswordField, PasswordStrengthMeter } from '~/components/ui'
import { useTouchedFields } from '~/hooks/use_touched_fields'

function firstError(error?: string | string[]): string | undefined {
  return Array.isArray(error) ? error[0] : error
}

export default function ResetPassword({
  token,
  tokenValido,
}: {
  token: string
  tokenValido: boolean
}) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const { touch, isTouched } = useTouchedFields<'password' | 'confirmation'>()

  /**
   * Enlace vencido/usado/inexistente: estado de error con salida clara
   * (regla de oro: nunca dejar al usuario varado).
   */
  if (!tokenValido) {
    return (
      <>
        <Head title="Enlace vencido" />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
            textAlign: 'center',
          }}
          role="alert"
        >
          <TriangleAlert size={40} style={{ color: 'var(--warning)' }} />
          <h1 style={{ fontSize: 20 }}>Este enlace ya no sirve</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            El enlace para restablecer tu contraseña venció, ya fue usado o no es válido. Pedí uno
            nuevo y usalo dentro de la hora.
          </p>
          <Link route="auth.forgot.show">
            <Button type="button">Pedir un enlace nuevo</Button>
          </Link>
        </div>
      </>
    )
  }

  const clientErrors = {
    password: !password
      ? 'Ingresá tu contraseña nueva'
      : password.length < 8
        ? 'La contraseña debe tener al menos 8 caracteres'
        : undefined,
    confirmation: !confirmation
      ? 'Repetí la contraseña nueva'
      : confirmation !== password
        ? 'Las contraseñas no coinciden'
        : undefined,
  }
  const isValid = !clientErrors.password && !clientErrors.confirmation

  return (
    <>
      <Head title="Nueva contraseña" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20 }}>Elegí tu nueva contraseña</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Después vas a poder iniciar sesión con ella
        </p>
      </div>

      <FlashAlert />

      <Form route="auth.reset" routeParams={{ token }}>
        {({ errors, processing }) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <PasswordField
              label="Contraseña nueva"
              name="password"
              autoComplete="new-password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={touch('password')}
              error={
                firstError(errors.password) ??
                (isTouched('password') ? clientErrors.password : undefined)
              }
            />

            <PasswordStrengthMeter value={password} />

            <PasswordField
              label="Repetir contraseña nueva"
              name="passwordConfirmation"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              onBlur={touch('confirmation')}
              error={
                firstError(errors.passwordConfirmation) ??
                (isTouched('confirmation') ? clientErrors.confirmation : undefined)
              }
            />

            <Button
              type="submit"
              loading={processing}
              loadingText="Guardando..."
              disabled={!isValid}
            >
              Guardar contraseña
            </Button>

            <div style={{ textAlign: 'center', fontSize: 14 }}>
              <Link route="auth.login.show">Volver a iniciar sesión</Link>
            </div>
          </div>
        )}
      </Form>
    </>
  )
}

ResetPassword.layout = (page: ReactElement) => <AuthLayout>{page}</AuthLayout>
