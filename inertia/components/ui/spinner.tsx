import styles from './ui.module.css'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={[styles.spinner, className].filter(Boolean).join(' ')}
      role="status"
      aria-label="Cargando"
    />
  )
}
