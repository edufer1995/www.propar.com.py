import { Link } from '@adonisjs/inertia/react'
import { Seo } from '~/components/public/seo'
import s from '~/components/public/propar.module.css'

/**
 * Cuerpo común de las páginas de error (404 y 500) con la marca. No
 * recibe datos: un 500 puede venir de la base caída, así que el pie se
 * dibuja sin sucursales ni redes en vez de volver a consultarlas.
 */
export function PaginaError({
  codigo,
  titulo,
  texto,
}: {
  codigo: string
  titulo: string
  texto: string
}) {
  return (
    <>
      <Seo title={titulo} description={texto} />
      <section className={s.in} style={{ paddingBlock: 'var(--space-8)', textAlign: 'center' }}>
        <p
          style={{
            fontSize: 'clamp(64px, 14vw, 120px)',
            fontWeight: 800,
            lineHeight: 1,
            color: 'var(--primary)',
          }}
        >
          {codigo}
        </p>
        <h1 style={{ fontSize: 28, marginTop: 'var(--space-3)' }}>{titulo}</h1>
        <p
          style={{
            color: 'var(--text-muted)',
            maxWidth: '46ch',
            margin: 'var(--space-3) auto var(--space-5)',
          }}
        >
          {texto}
        </p>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/" className={`${s.btn} ${s.btnVerde}`}>
            Ir al inicio
          </Link>
          <Link href="/loteamientos" className={`${s.btn} ${s.btnBorde}`}>
            Ver loteamientos
          </Link>
        </div>
      </section>
    </>
  )
}
