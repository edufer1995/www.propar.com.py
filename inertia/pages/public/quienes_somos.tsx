import { type ReactElement } from 'react'
import { Seo } from '~/components/public/seo'
import { Check } from 'lucide-react'
import PublicLayout, { type PiePagina } from '~/layouts/public'
import { EmptyState } from '~/components/ui'
import styles from '~/components/public/public.module.css'
import layoutStyles from '~/layouts/public.module.css'

type BloqueEditorial = {
  titulo: string | null
  parrafo: string | null
  imagen: string | null
}

type QuienesSomosProps = {
  quienesSomos: {
    titulo: string | null
    parrafos: (string | null)[]
    imagenUno: string | null
    imagenDos: string | null
    imagenTres: string | null
  } | null
  trayectoria: {
    titulo: string | null
    parrafos: (string | null)[]
    imagen: string | null
  } | null
  mision: BloqueEditorial | null
  vision: BloqueEditorial | null
  producto: BloqueEditorial | null
  /** Lo consume el layout público (footer). */
  piePagina: PiePagina
}

/** Bloque de valores estático (mismo contenido que el sitio viejo). */
const VALORES = [
  'Responsabilidad',
  'Compromiso',
  'Trabajo en equipo',
  'Honestidad',
  'Transparencia',
  'Calidad',
]

function BloqueSimple({ bloque }: { bloque: BloqueEditorial }) {
  return (
    <>
      {bloque.titulo && <h2>{bloque.titulo}</h2>}
      {bloque.parrafo && <p>{bloque.parrafo}</p>}
      {bloque.imagen && (
        <img className={styles.imagenSola} src={bloque.imagen} alt={bloque.titulo ?? ''} />
      )}
    </>
  )
}

export default function QuienesSomos({
  quienesSomos,
  trayectoria,
  mision,
  vision,
  producto,
}: QuienesSomosProps) {
  const parrafos = (quienesSomos?.parrafos ?? []).filter((p): p is string => Boolean(p))

  return (
    <>
      <Seo
        title="Quiénes somos"
        description="Historia, trayectoria, misión y visión de Elias A. Saba S.A. Inmobiliaria, pionera en loteamientos en Paraguay."
      />
      <div className={layoutStyles.container}>
        {!quienesSomos && !trayectoria && !mision ? (
          <EmptyState
            title="Contenido en preparación"
            body="Todavía no hay contenido institucional cargado."
          />
        ) : (
          <>
            {/* Portada editorial con la imagen principal */}
            <div
              className={styles.portada}
              style={
                quienesSomos?.imagenUno
                  ? { backgroundImage: `url(${quienesSomos.imagenUno})` }
                  : undefined
              }
            >
              <div className={styles.portadaTexto}>
                <h1>{quienesSomos?.titulo ?? 'Quiénes somos'}</h1>
                {parrafos[0] && <p>{parrafos[0]}</p>}
              </div>
            </div>

            <div className={styles.prosa} style={{ marginTop: 'var(--space-6)' }}>
              {parrafos.slice(1).map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}

              {(quienesSomos?.imagenDos || quienesSomos?.imagenTres) && (
                <div className={styles.imagenesGrid}>
                  {quienesSomos.imagenDos && (
                    <img src={quienesSomos.imagenDos} alt="ABAS Inmobiliaria" />
                  )}
                  {quienesSomos.imagenTres && (
                    <img src={quienesSomos.imagenTres} alt="ABAS Inmobiliaria" />
                  )}
                </div>
              )}

              {trayectoria && (
                <>
                  {trayectoria.titulo && <h2>{trayectoria.titulo}</h2>}
                  {trayectoria.parrafos
                    .filter((p): p is string => Boolean(p))
                    .map((p) => (
                      <p key={p.slice(0, 40)}>{p}</p>
                    ))}
                  {trayectoria.imagen && (
                    <img
                      className={styles.imagenSola}
                      src={trayectoria.imagen}
                      alt={trayectoria.titulo ?? 'Trayectoria'}
                    />
                  )}
                </>
              )}

              {mision && <BloqueSimple bloque={mision} />}
              {vision && <BloqueSimple bloque={vision} />}
              {producto && <BloqueSimple bloque={producto} />}

              <h2>Valores</h2>
              <div className={styles.valores}>
                {VALORES.map((valor) => (
                  <div key={valor} className={styles.valor}>
                    <Check size={18} /> {valor}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

QuienesSomos.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
