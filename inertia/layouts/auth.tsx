import { type ReactNode } from 'react'
import styles from './auth.module.css'

/**
 * Layout de las pantallas de autenticación: card centrada sobre un
 * degradado de marca sutil.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.screen}>
      <main className={styles.card}>
        <div className={styles.brand}>
          <img src="/img/logo.png" alt="Propar Inmobiliaria" className={styles.logoImg} />
          <span className={styles.tagline}>Propar Inmobiliaria — Administración</span>
        </div>
        {children}
      </main>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} Inmobiliaria Propar S.R.L.
      </footer>
    </div>
  )
}
