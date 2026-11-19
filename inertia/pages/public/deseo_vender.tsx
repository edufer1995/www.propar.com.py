import { type FormEvent, type ReactElement } from 'react'
import { useForm } from '@inertiajs/react'
import { Seo } from '~/components/public/seo'
import PublicLayout, { type PiePagina } from '~/layouts/public'
import { PageHero } from '~/components/public/propar'
import { Button, InputField, TextareaField } from '~/components/ui'
import { useTouchedFields } from '~/hooks/use_touched_fields'
import s from '~/components/public/propar.module.css'

type Campo = 'ubicacion' | 'tamano' | 'precio' | 'nombre' | 'telefono' | 'correo' | 'comentarios'

function firstError(error?: string | string[]): string | undefined {
  return Array.isArray(error) ? error[0] : error
}

const PASOS = [
  'Completas el formulario con los datos del terreno.',
  'Un asesor revisa la ubicación y te contacta.',
  'Coordinamos una visita y te hacemos una propuesta.',
]

export default function DeseoVender(_props: { piePagina: PiePagina }) {
  const { touch, isTouched } = useTouchedFields<Campo>()
  const form = useForm({
    ubicacion: '',
    tamano: '',
    precio: '',
    nombre: '',
    telefono: '',
    correo: '',
    comentarios: '',
  })

  const clientErrors: Partial<Record<Campo, string>> = {
    ubicacion:
      form.data.ubicacion.trim().length >= 5
        ? undefined
        : 'Indica dónde está el terreno (dirección, coordenadas o link de Google Maps)',
    tamano: form.data.tamano.trim().length >= 2 ? undefined : 'Indica el tamaño del terreno',
    nombre: form.data.nombre.trim().length >= 3 ? undefined : 'Ingresa tu nombre (mínimo 3 letras)',
    telefono: form.data.telefono.trim().length >= 6 ? undefined : 'Ingresa un teléfono válido',
    correo:
      form.data.correo.trim() === '' || /.+@.+\..+/.test(form.data.correo)
        ? undefined
        : 'Ingresa un correo válido',
  }
  const isValid = Object.values(clientErrors).every((e) => !e)

  const errorDe = (campo: Campo) =>
    firstError((form.errors as Record<string, string | string[]>)[campo]) ??
    (isTouched(campo) ? clientErrors[campo] : undefined)

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    /** Los opcionales vacíos no viajan: el validator los toma como ausentes. */
    form.transform((d) =>
      Object.fromEntries(Object.entries(d).filter(([, v]) => String(v).trim() !== ''))
    )
    form.post('/deseo-vender', { preserveScroll: true, onSuccess: () => form.reset() })
  }

  const campo = (nombre: Campo) => ({
    name: nombre,
    value: form.data[nombre],
    onChange: (e: { target: { value: string } }) => form.setData(nombre, e.target.value),
    onBlur: touch(nombre),
    error: errorDe(nombre),
  })

  return (
    <>
      <Seo
        title="Deseo vender mi terreno"
        description="¿Tienes un terreno para vender? Cuéntanos dónde está, sus medidas y el precio: un asesor de Propar te contacta para evaluarlo."
      />
      <PageHero
        marron
        miga="Deseo vender"
        titulo="¿Quieres vender tu terreno?"
        bajada="Cuéntanos dónde está, sus medidas y el precio. Un asesor de Propar te contacta para evaluarlo."
      />

      <section className={s.seccion}>
        <div className={s.in} style={{ display: 'grid', gap: 28 }}>
          <ol className={s.steps} style={{ listStyle: 'none' }}>
            {PASOS.map((paso, i) => (
              <li key={paso} className={s.step}>
                <b aria-hidden>{i + 1}</b>
                <span>{paso}</span>
              </li>
            ))}
          </ol>

          <form className={s.formCard} onSubmit={enviar} noValidate>
            <div className={s.full}>
              <InputField
                label="Ubicación"
                placeholder="Dirección, coordenadas o link de Google Maps"
                hint="Si lo tienes, pega el link de Google Maps del terreno."
                required
                {...campo('ubicacion')}
              />
            </div>
            <InputField
              label="Tamaño"
              placeholder="Ej.: 2 hectáreas o 12 × 30 m"
              required
              {...campo('tamano')}
            />
            <InputField label="Precio pretendido" placeholder="Gs." {...campo('precio')} />
            <InputField
              label="Nombre"
              placeholder="Ingresa tu nombre"
              autoComplete="name"
              required
              {...campo('nombre')}
            />
            <InputField
              label="Teléfono"
              type="tel"
              placeholder="0981 123 456"
              autoComplete="tel"
              required
              {...campo('telefono')}
            />
            <div className={s.full}>
              <InputField
                label="Correo (opcional)"
                type="email"
                placeholder="tu@correo.com"
                autoComplete="email"
                {...campo('correo')}
              />
            </div>
            <div className={s.full}>
              <TextareaField
                label="Comentarios"
                rows={4}
                placeholder="Accesos, servicios, documentación del terreno…"
                {...campo('comentarios')}
              />
            </div>
            <div className={s.full}>
              <Button
                type="submit"
                loading={form.processing}
                loadingText="Enviando..."
                disabled={!isValid}
              >
                Enviar datos del terreno
              </Button>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}

DeseoVender.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
