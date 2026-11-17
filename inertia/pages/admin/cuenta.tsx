import { useState, type ReactElement } from 'react'
import { Head, usePage } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import { Camera } from 'lucide-react'
import AdminLayout from '~/layouts/admin'
import { Button, Card, PasswordField, PasswordStrengthMeter } from '~/components/ui'
import { useTouchedFields } from '~/hooks/use_touched_fields'
import { formatDate } from '~/lib/format'

type Perfil = {
  username: string
  nombre: string | null
  email: string | null
  rol: string
  miembroDesde: string
}

function firstError(error?: string | string[]): string | undefined {
  return Array.isArray(error) ? error[0] : error
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 15 }}>{value}</span>
    </div>
  )
}

export default function Cuenta({ perfil }: { perfil: Perfil }) {
  const { props } = usePage()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const { touch, isTouched, reset } = useTouchedFields<'current' | 'password' | 'confirmation'>()
  /** Remonta el form tras un cambio exitoso (resetea estados touched). */
  const [formKey, setFormKey] = useState(0)

  const clientErrors = {
    current: current ? undefined : 'Ingresá tu contraseña actual',
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
  const isValid = !clientErrors.current && !clientErrors.password && !clientErrors.confirmation

  return (
    <>
      <Head title="Mi cuenta" />

      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 640 }}
      >
        <div>
          <h1 style={{ fontSize: 24 }}>Mi cuenta</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Tus datos y tu contraseña</p>
        </div>

        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--grad-primary)',
                  color: 'var(--primary-contrast)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 24,
                  flex: 'none',
                }}
                aria-hidden
              >
                {props.user?.initials}
              </span>
              {/* La foto de perfil llega con el upload_service (Etapa 3). */}
              <span title="Próximamente" style={{ display: 'inline-flex' }}>
                <Button variant="secondary" disabled>
                  <Camera size={16} /> Cambiar foto
                </Button>
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-4)',
              }}
            >
              <Dato label="Usuario" value={perfil.username} />
              <Dato label="Nombre" value={perfil.nombre ?? '—'} />
              <Dato label="Email" value={perfil.email ?? 'Sin email cargado'} />
              <Dato label="Rol" value={perfil.rol} />
              <Dato label="Miembro desde" value={formatDate(perfil.miembroDesde)} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 17 }}>Cambiar contraseña</h2>

            <Form
              key={formKey}
              route="app.perfil.password"
              resetOnSuccess
              onSuccess={() => {
                setCurrent('')
                setPassword('')
                setConfirmation('')
                reset()
                setFormKey((k) => k + 1)
              }}
            >
              {({ errors, processing }) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <PasswordField
                    label="Contraseña actual"
                    name="currentPassword"
                    autoComplete="current-password"
                    required
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    onBlur={touch('current')}
                    error={
                      firstError(errors.currentPassword) ??
                      (isTouched('current') ? clientErrors.current : undefined)
                    }
                  />

                  <PasswordField
                    label="Contraseña nueva"
                    name="password"
                    autoComplete="new-password"
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

                  <div>
                    <Button
                      type="submit"
                      loading={processing}
                      loadingText="Guardando..."
                      disabled={!isValid}
                    >
                      Guardar contraseña
                    </Button>
                  </div>
                </div>
              )}
            </Form>
          </div>
        </Card>
      </div>
    </>
  )
}

Cuenta.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
