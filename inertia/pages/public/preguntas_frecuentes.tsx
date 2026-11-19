import { useState, type ReactElement } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { Seo } from '~/components/public/seo'
import PublicLayout, { type PiePagina } from '~/layouts/public'
import { BandaAccion, PageHero } from '~/components/public/propar'
import { EmptyState } from '~/components/ui'
import s from '~/components/public/propar.module.css'

type Props = {
  preguntas: { id: number; categoria: string; pregunta: string; respuesta: string }[]
  categorias: { valor: string; etiqueta: string }[]
  piePagina: PiePagina
}

export default function PreguntasFrecuentes({ preguntas, categorias }: Props) {
  const [categoria, setCategoria] = useState<string | null>(null)
  const visibles = categoria ? preguntas.filter((p) => p.categoria === categoria) : preguntas

  return (
    <>
      <Seo
        title="Preguntas frecuentes"
        description="Respuestas sobre cuotas, títulos y trámites de tu lote en Propar Inmobiliaria."
      />
      <PageHero
        miga="Preguntas frecuentes"
        titulo="Preguntas frecuentes"
        bajada="Lo que más nos consultan sobre cuotas, títulos y trámites."
      />

      <section className={s.seccion}>
        <div className={s.in}>
          {preguntas.length === 0 ? (
            <EmptyState
              title="Todavía no hay preguntas cargadas"
              body="Escríbenos y un asesor te responde."
            />
          ) : (
            <>
              {categorias.length > 1 && (
                <div className={s.cats} role="group" aria-label="Filtrar por tema">
                  <button
                    type="button"
                    className={s.cat}
                    aria-pressed={categoria === null}
                    onClick={() => setCategoria(null)}
                  >
                    Todas
                  </button>
                  {categorias.map((c) => (
                    <button
                      key={c.valor}
                      type="button"
                      className={s.cat}
                      aria-pressed={categoria === c.valor}
                      onClick={() => setCategoria(c.valor)}
                    >
                      {c.etiqueta}
                    </button>
                  ))}
                </div>
              )}
              <div className={s.faqs}>
                {visibles.map((p, i) => (
                  <details key={p.id} className={s.faq} open={i === 0}>
                    <summary>{p.pregunta}</summary>
                    <p>{p.respuesta}</p>
                  </details>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <BandaAccion
        titulo="¿No encontraste tu respuesta?"
        texto="Escríbenos y un asesor te responde."
        accion={
          <Link route="public.contacto.show" className={`${s.btn} ${s.btnBlanco}`}>
            Ir a contacto
          </Link>
        }
      />
    </>
  )
}

PreguntasFrecuentes.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
