import { type ReactElement, type ReactNode } from 'react'
import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Image, LandPlot, Map, MessageSquare, Users } from 'lucide-react'
import AdminLayout from '~/layouts/admin'
import { formatNumber } from '~/lib/format'

type Counts = {
  carruseles: number
  fracciones: number
  lotes: number
  leads: number
  usuarios: number
}

const TILES: {
  key: keyof Counts
  label: string
  ruta: 'app.carruseles.index' | 'app.planos.index' | 'app.leads.index' | 'app.usuarios.index'
  icon: ReactNode
}[] = [
  {
    key: 'carruseles',
    label: 'Carruseles',
    ruta: 'app.carruseles.index',
    icon: <Image size={22} />,
  },
  { key: 'fracciones', label: 'Planos', ruta: 'app.planos.index', icon: <Map size={22} /> },
  { key: 'lotes', label: 'Lotes', ruta: 'app.planos.index', icon: <LandPlot size={22} /> },
  { key: 'leads', label: 'Leads', ruta: 'app.leads.index', icon: <MessageSquare size={22} /> },
  { key: 'usuarios', label: 'Usuarios', ruta: 'app.usuarios.index', icon: <Users size={22} /> },
]

export default function Dashboard({ counts }: { counts: Counts }) {
  return (
    <>
      <Head title="Inicio" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div>
          <h1 style={{ fontSize: 24 }}>Inicio</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Resumen del contenido cargado en el sitio
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {TILES.map((tile) => (
            <Link
              key={tile.key}
              route={tile.ruta}
              style={{ textDecoration: 'none', color: 'inherit' }}
              aria-label={`${tile.label}: ${formatNumber(counts[tile.key])} registros`}
            >
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-sm)',
                  padding: 'var(--space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  height: '100%',
                }}
              >
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--grad-primary)',
                    color: 'var(--primary-contrast)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-hidden
                >
                  {tile.icon}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 30,
                    lineHeight: 1.1,
                  }}
                >
                  {formatNumber(counts[tile.key])}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{tile.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

Dashboard.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
