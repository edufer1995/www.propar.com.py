import { useState, type ReactElement, type ReactNode } from 'react'
import { Head } from '@inertiajs/react'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  InputField,
  LottiePlayer,
  Modal,
  SelectField,
  SkeletonRows,
  TextareaField,
} from '~/components/ui'
import { confirmDelete, toast } from '~/lib/swal'
import { formatDate, formatGs, formatM2 } from '~/lib/format'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 20, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      {children}
    </div>
  )
}

export default function Styleguide() {
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  return (
    <>
      <Head title="Styleguide" />
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 28 }}>Propar · Styleguide</h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Referencia viva del sistema de diseño (solo desarrollo).
            </p>
          </div>
        </header>

        <Section title="Paleta y degradados">
          <Row>
            {[
              '--brand-blue',
              '--brand-green',
              '--brand-sky',
              '--brand-gray',
              '--brand-teal-dark',
            ].map((v) => (
              <div key={v} style={{ textAlign: 'center', fontSize: 12 }}>
                <div
                  style={{
                    width: 84,
                    height: 56,
                    borderRadius: 10,
                    background: `var(${v})`,
                    border: '1px solid var(--border)',
                  }}
                />
                {v}
              </div>
            ))}
          </Row>
          <Row>
            {['--grad-primary', '--grad-accent', '--grad-hero', '--grad-danger'].map((v) => (
              <div key={v} style={{ textAlign: 'center', fontSize: 12 }}>
                <div
                  style={{ width: 130, height: 56, borderRadius: 10, background: `var(${v})` }}
                />
                {v}
              </div>
            ))}
          </Row>
        </Section>

        <Section title="Tipografía">
          <h1 style={{ fontSize: 32 }}>Montserrat 800 — Títulos display</h1>
          <h3>Montserrat 700 — Subtítulos</h3>
          <p>
            Nunito Sans 400 — cuerpo de texto. <strong>Nunito Sans 700 — énfasis.</strong> Formatos
            es-PY: {formatGs(11700000)} · {formatDate(new Date())} · {formatM2(360)}
          </p>
        </Section>

        <Section title="Botones">
          <Row>
            <Button>Primario</Button>
            <Button variant="accent">Acento</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Peligro</Button>
            <Button disabled>Deshabilitado</Button>
            <Button
              loading={saving}
              loadingText="Guardando..."
              onClick={() => {
                setSaving(true)
                setTimeout(() => {
                  setSaving(false)
                  toast('Guardado correctamente')
                }, 1600)
              }}
            >
              Guardar (demo)
            </Button>
          </Row>
        </Section>

        <Section title="Formulario (validación inline, estados touched)">
          <Card>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 16,
              }}
            >
              <InputField
                label="Nombre"
                required
                placeholder="Juan Pérez"
                hint="Como figura en tu cédula"
              />
              <InputField
                label="Correo"
                type="email"
                required
                error="Ingresá un correo válido"
                defaultValue="no-es-correo"
              />
              <SelectField label="Asunto" required defaultValue="">
                <option value="" disabled>
                  Elegí un asunto
                </option>
                <option>Interesado en comprar un lote</option>
                <option>Interesado en vender una propiedad</option>
              </SelectField>
              <TextareaField label="Consulta" placeholder="Contanos en qué te ayudamos" />
            </div>
          </Card>
        </Section>

        <Section title="Alertas (SweetAlert2 tematizado)">
          <Row>
            <Button variant="secondary" onClick={() => toast('Operación exitosa')}>
              Toast éxito
            </Button>
            <Button variant="secondary" onClick={() => toast('Algo salió mal', 'error')}>
              Toast error
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (await confirmDelete('Sucursal Villa Elisa')) toast('Eliminado')
              }}
            >
              Confirmación destructiva
            </Button>
          </Row>
        </Section>

        <Section title="Modal">
          <Row>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Abrir modal
            </Button>
          </Row>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Ejemplo de modal"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setModalOpen(false)}>Guardar</Button>
              </>
            }
          >
            <p>
              Focus trap, Esc para cerrar, autofocus en el primer campo y casi fullscreen en mobile.
              El foco vuelve al botón que lo abrió.
            </p>
            <div style={{ marginTop: 16 }}>
              <InputField label="Campo de ejemplo" placeholder="Autofocus acá" />
            </div>
          </Modal>
        </Section>

        <Section title="Estados de carga / vacío / error (regla de oro)">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            <Card>
              <SkeletonRows rows={4} />
            </Card>
            <Card>
              <EmptyState cta="Crear el primero" onCta={() => toast('¡A crear!')} />
            </Card>
            <Card>
              <ErrorState onRetry={() => toast('Reintentando...', 'info')} />
            </Card>
          </div>
        </Section>

        <Section title="Lottie de marca">
          <Row>
            <LottiePlayer src="/lotties/btn-buscar.json" size={72} />
            <LottiePlayer src="/lotties/flecha-ir.json" size={72} />
          </Row>
        </Section>
      </div>
    </>
  )
}

// Página standalone: no usa el layout global por defecto.
Styleguide.layout = (page: ReactElement) => page
