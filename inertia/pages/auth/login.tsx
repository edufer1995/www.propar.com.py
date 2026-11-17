import { useState, type ReactElement } from 'react'
import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import AuthLayout from '~/layouts/auth'
import { FlashAlert } from '~/components/flash_alert'
import { Button, InputField, PasswordField } from '~/components/ui'
import { useTouchedFields } from '~/hooks/use_touched_fields'

/** Los errores de VineJS llegan como string o array; el campo muestra uno. */
function firstError(error?: string | string[]): string | undefined {
  return Array.isArray(error) ? error[0] : error
}

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { touch, isTouched } = useTouchedFields<'username' | 'password'>()

  /** Validación de cliente (UX): inline al salir del campo, vía pristine/touched. */
  const clientErrors = {
    username: username.trim() ? undefined : 'Ingresá tu usuario o email',
    password: password ? undefined : 'Ingresá tu contraseña',
  }
  const isValid = !clientErrors.username && !clientErrors.password

  return (
    <>
      <Head title="Iniciar sesión" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20 }}>Iniciar sesión</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Ingresá con tu usuario del administrador
        </p>
      </div>

      <FlashAlert />

      <Form route="auth.login">
        {({ errors, processing }) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <InputField
              label="Usuario o email"
              name="username"
              autoComplete="username"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={touch('username')}
              error={
                firstError(errors.username) ??
                (isTouched('username') ? clientErrors.username : undefined)
              }
            />

            <PasswordField
              label="Contraseña"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={touch('password')}
              error={
                firstError(errors.password) ??
                (isTouched('password') ? clientErrors.password : undefined)
              }
            />

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                minHeight: 'var(--tap-target)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                name="remember"
                value="true"
                style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
              />
              Recordarme en este equipo
            </label>

            <Button
              type="submit"
              loading={processing}
              loadingText="Ingresando..."
              disabled={!isValid}
            >
              Ingresar
            </Button>

            <div style={{ textAlign: 'center', fontSize: 14 }}>
              <Link route="auth.forgot.show">¿Olvidaste tu contraseña?</Link>
            </div>
          </div>
        )}
      </Form>
    </>
  )
}

Login.layout = (page: ReactElement) => <AuthLayout>{page}</AuthLayout>
