import { lazy, Suspense } from 'react'
import styles from './ui.module.css'
import { Spinner } from './spinner'

// lottie-react v3: export nombrado `Lottie`, prop `src` acepta URL u objeto.
// lottie-web es pesado: solo entra al bundle cuando se usa (lazy).
const Lottie = lazy(() => import('lottie-react').then((m) => ({ default: m.Lottie })))

export function LottiePlayer({
  src,
  size = 120,
  loop = true,
  className,
}: {
  /** Ruta pública, ej: /lotties/flecha-ir.json */
  src: string
  size?: number
  loop?: boolean
  className?: string
}) {
  return (
    <Suspense fallback={<Spinner />}>
      <Lottie
        src={src}
        autoplay
        loop={loop}
        style={{ width: size, height: size }}
        className={className}
      />
    </Suspense>
  )
}

/** Loader full-page (regla de oro: vista 1 de 4 en cargas completas). */
export function FullPageLoader({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className={styles.fullLoader} role="status" aria-label={label}>
      <Spinner />
      <span>{label}</span>
    </div>
  )
}
