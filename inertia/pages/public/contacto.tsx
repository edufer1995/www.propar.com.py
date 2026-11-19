import { useMemo, type FormEvent, type ReactElement } from 'react'
import { useForm, usePage } from '@inertiajs/react'
import { Seo } from '~/components/public/seo'
import { Clock, MapPin, Phone } from 'lucide-react'
import PublicLayout, { type PiePagina } from '~/layouts/public'
import { IconoRed } from '~/components/public/icons'
import { Button, InputField, SelectField, TextareaField } from '~/components/ui'
import { useTouchedFields } from '~/hooks/use_touched_fields'
import styles from '~/components/public/public.module.css'
import layoutStyles from '~/layouts/public.module.css'

type ContactoProps = {
  asuntos: { valor: string; etiqueta: string }[]
  piePagina: PiePagina
}

type Campo = 'nombre' | 'apellido' | 'telefono' | 'correo' | 'asunto' | 'consulta'

/** Los errores de VineJS llegan como string o array; el campo muestra uno. */
function firstError(error?: string | string[]): string | undefined {
  return Array.isArray(error) ? error[0] : error
}

export default function Contacto({ asuntos, piePagina }: ContactoProps) {
  const { url } = usePage()
  const { touch, isTouched } = useTouchedFields<Campo>()

  /** Preselección por query: ?asunto=<slug> y ?fraccion=<N o nombre>. */
  const inicial = useMemo(() => {
    const search = url.includes('?') ? url.slice(url.indexOf('?') + 1) : ''
    const params = new URLSearchParams(search)
    const asuntoParam = params.get('asunto') ?? ''
    const fraccion = params.get('fraccion') ?? ''

    const asunto = asuntos.some((a) => a.valor === asuntoParam)
      ? asuntoParam
      : fraccion
        ? 'proximo-desarrollo'
        : ''

    const consulta = fraccion
      ? `Me encuentro interesado/a en el próximo desarrollo "${fraccion}" y me gustaría hablar con un vendedor.`
      : ''

    return { asunto, consulta, fraccion }
  }, [url, asuntos])

  const form = useForm({
    nombre: '',
    apellido: '',
    telefono: '',
    correo: '',
    asunto: inicial.asunto,
    consulta: inicial.consulta,
    fraccion: inicial.fraccion,
  })

  /** Validación de cliente (UX): inline al salir del campo. */
  const clientErrors: Record<Campo, string | undefined> = {
    nombre: form.data.nombre.trim().length >= 3 ? undefined : 'Ingresa tu nombre (mínimo 3 letras)',
    apellido:
      form.data.apellido.trim().length >= 3 ? undefined : 'Ingresa tu apellido (mínimo 3 letras)',
    telefono: form.data.telefono.trim().length >= 6 ? undefined : 'Ingresa un teléfono válido',
    correo: /.+@.+\..+/.test(form.data.correo) ? undefined : 'Ingresa un correo válido',
    asunto: form.data.asunto ? undefined : 'Selecciona un asunto',
    consulta: form.data.consulta.trim().length >= 5 ? undefined : 'Cuéntanos tu consulta',
  }
  const isValid = Object.values(clientErrors).every((e) => !e)

  const errorDe = (campo: Campo) =>
    firstError((form.errors as Record<string, string | string[]>)[campo]) ??
    (isTouched(campo) ? clientErrors[campo] : undefined)

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    form.post('/contacto', {
      preserveScroll: true,
      onSuccess: () => form.reset(),
    })
  }

  return (
    <>
      <Seo
        title="Contacto y sucursales"
        description="Contacta con Propar Inmobiliaria: consultas sobre lotes y loteamientos. Sucursales, teléfonos y horarios."
      />
      <div className={layoutStyles.container}>
        <div className={styles.contactoGrid}>
          <div>
            <h1 style={{ fontSize: 30 }}>Contacto</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
              Déjanos tus consultas o sugerencias: nuestro equipo se comunicará contigo a la
              brevedad posible.
            </p>

            <form
              className={styles.formulario}
              style={{ marginTop: 'var(--space-5)' }}
              onSubmit={enviar}
            >
              <div className={styles.formularioFila}>
                <InputField
                  label="Nombre"
                  name="nombre"
                  placeholder="Ej: Eduardo"
                  autoComplete="given-name"
                  autoFocus
                  required
                  value={form.data.nombre}
                  onChange={(e) => form.setData('nombre', e.target.value)}
                  onBlur={touch('nombre')}
                  error={errorDe('nombre')}
                />
                <InputField
                  label="Apellido"
                  name="apellido"
                  placeholder="Ej: Ferreira"
                  autoComplete="family-name"
                  required
                  value={form.data.apellido}
                  onChange={(e) => form.setData('apellido', e.target.value)}
                  onBlur={touch('apellido')}
                  error={errorDe('apellido')}
                />
              </div>

              <InputField
                label="Teléfono o celular"
                name="telefono"
                type="tel"
                placeholder="Ej: 0981 987 654"
                autoComplete="tel"
                required
                value={form.data.telefono}
                onChange={(e) => form.setData('telefono', e.target.value)}
                onBlur={touch('telefono')}
                error={errorDe('telefono')}
              />

              <InputField
                label="Correo electrónico"
                name="correo"
                type="email"
                placeholder="Ej: nombre@correo.com"
                autoComplete="email"
                required
                value={form.data.correo}
                onChange={(e) => form.setData('correo', e.target.value)}
                onBlur={touch('correo')}
                error={errorDe('correo')}
              />

              <SelectField
                label="Asunto"
                name="asunto"
                required
                value={form.data.asunto}
                onChange={(e) => form.setData('asunto', e.target.value)}
                onBlur={touch('asunto')}
                error={errorDe('asunto')}
              >
                <option value="">— Seleccionar —</option>
                {asuntos.map((a) => (
                  <option key={a.valor} value={a.valor}>
                    {a.etiqueta}
                  </option>
                ))}
              </SelectField>

              <TextareaField
                label="Consulta"
                name="consulta"
                rows={5}
                placeholder="Ej: Estoy interesado en comprar un lote en Luque..."
                required
                value={form.data.consulta}
                onChange={(e) => form.setData('consulta', e.target.value)}
                onBlur={touch('consulta')}
                error={errorDe('consulta')}
              />

              <div>
                <Button
                  type="submit"
                  variant="accent"
                  loading={form.processing}
                  loadingText="Enviando..."
                  disabled={!isValid}
                >
                  Enviar consulta
                </Button>
              </div>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div>
              <h2 style={{ fontSize: 22 }}>Dónde puedes encontrarnos</h2>
              <div className={styles.sucursalesGrid} style={{ marginTop: 'var(--space-4)' }}>
                {piePagina.sucursales.map((s, i) => (
                  <div key={s.id} className={styles.sucursalCard}>
                    <strong>
                      {String(i + 1).padStart(2, '0')}. {s.titulo}
                    </strong>
                    {s.horarios && (
                      <span>
                        <Clock size={14} /> {s.horarios}
                      </span>
                    )}
                    {s.telefonos && (
                      <span>
                        <Phone size={14} /> {s.telefonos}
                      </span>
                    )}
                    {s.coordenadas && (
                      <span>
                        <MapPin size={14} />
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${s.coordenadas.lat},${s.coordenadas.lng}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Cómo llegar
                        </a>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {piePagina.redes.length > 0 && (
              <div>
                <h2 style={{ fontSize: 22 }}>Nuestras redes</h2>
                <div className={styles.contactoSocial} style={{ marginTop: 'var(--space-3)' }}>
                  {piePagina.redes.map((red) => (
                    <a
                      key={red.id}
                      href={red.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={red.nombre}
                      title={red.nombre}
                    >
                      <IconoRed nombre={red.nombre} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

Contacto.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
