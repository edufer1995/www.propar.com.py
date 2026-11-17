import { type ReactNode } from 'react'
import { Inbox, TriangleAlert } from 'lucide-react'
import styles from './ui.module.css'
import { Button } from './button'
import { texts } from '~/lib/texts'

/** Estado vacío con CTA opcional (regla de oro: vista 2 de 4). */
export function EmptyState({
  title = texts.states.emptyTitle,
  body,
  cta,
  onCta,
}: {
  title?: string
  body?: string
  cta?: string
  onCta?: () => void
}) {
  return (
    <div className={styles.stateBox}>
      <Inbox size={40} className={styles.stateIcon} />
      <div className={styles.stateTitle}>{title}</div>
      {body && <div>{body}</div>}
      {cta && onCta && (
        <Button variant="primary" onClick={onCta}>
          {cta}
        </Button>
      )}
    </div>
  )
}

/** Estado de error con reintentar (regla de oro: vista 3 de 4). */
export function ErrorState({
  title = texts.states.errorTitle,
  body = texts.states.errorBody,
  onRetry,
}: {
  title?: string
  body?: string
  onRetry?: () => void
}) {
  return (
    <div className={styles.stateBox} role="alert">
      <TriangleAlert size={40} className={styles.stateIcon} />
      <div className={styles.stateTitle}>{title}</div>
      <div>{body}</div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {texts.common.retry}
        </Button>
      )}
    </div>
  )
}

/** Placeholder con forma del contenido para cargas parciales. */
export function Skeleton({
  width,
  height = 16,
  style,
}: {
  width?: number | string
  height?: number | string
  style?: React.CSSProperties
}) {
  return <div className={styles.skeleton} style={{ width, height, ...style }} aria-hidden />
}

export function SkeletonRows({ rows = 5, height = 40 }: { rows?: number; height?: number }) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      aria-label="Cargando"
      role="status"
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  )
}

export function Card({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')} style={style}>
      {children}
    </div>
  )
}
