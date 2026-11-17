import { useState, type ReactElement } from 'react'
import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import AuthLayout from '~/layouts/auth'
import { FlashAlert } from '~/components/flash_alert'
import { Button, InputField } from '~/components/ui'
import { useTouchedFields } from '~/hooks/use_touched_fields'

function firstError(error?: string | string[]): string | undefined {
  return Array.isArray(error) ? error[0] : error
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const { touch, isTouched, reset } = useTouchedFields<'email'>()
  /** Remonta el form tras un envío exitoso (resetea estados touched). */
  const [formKey, setFormKey] = useState(0)

  const clientError = !email.trim()
    ? 'Ingresá tu email'
    : !EMAIL_RE.test(email.trim())
      ? 'Ingresá un email válido'
      : undefined

  return (
    <>
      <Head title="Olvidé mi contraseña" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20 }}>Restablecer contraseña</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Te enviamos un enlace por email para elegir una contraseña nueva
        </p>
      </div>

      <FlashAlert />

      <Form
        key={formKey}
        route="auth.forgot"
        resetOnSuccess
        onSuccess={() => {
          setEmail('')
          reset()
          setFormKey((k) => k + 1)
        }}
      >
        {({ errors, processing }) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <InputField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={touch('email')}
              error={firstError(errors.email) ?? (isTouched('email') ? clientError : undefined)}
              hint="El de tu cuenta del administrador"
            />

            <Button
              type="submit"
              loading={processing}
              loadingText="Enviando..."
              disabled={Boolean(clientError)}
            >
              Enviar enlace
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

ForgotPassword.layout = (page: ReactElement) => <AuthLayout>{page}</AuthLayout>
