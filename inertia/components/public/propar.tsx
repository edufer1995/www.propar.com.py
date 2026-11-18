import type { ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import s from './propar.module.css'

/** Banda verde (o marrón) con miga, título y bajada: cabecera de las páginas internas. */
export function PageHero({
  miga,
  titulo,
  bajada,
  marron = false,
}: {
  miga: string
  titulo: string
  bajada?: string
  marron?: boolean
}) {
  return (
    <div className={`${s.pageHero} ${marron ? s.pageHeroMarron : ''}`}>
      <div className={s.in}>
        <span className={s.crumb}>
          <Link route="home">Inicio</Link> / {miga}
        </span>
        <h1>{titulo}</h1>
        {bajada && <p>{bajada}</p>}
      </div>
    </div>
  )
}

/** Banda marrón de llamada a la acción, al pie de las páginas. */
export function BandaAccion({
  titulo,
  texto,
  accion,
}: {
  titulo: string
  texto: string
  accion: ReactNode
}) {
  return (
    <section>
      <div className={s.in}>
        <div className={s.banda}>
          <div>
            <h2>{titulo}</h2>
            <p>{texto}</p>
          </div>
          {accion}
        </div>
      </div>
    </section>
  )
}
