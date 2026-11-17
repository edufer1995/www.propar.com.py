import { type ReactElement } from 'react'
import { Seo } from '~/components/public/seo'
import { Check, Clock, ExternalLink, MapPin } from 'lucide-react'
import PublicLayout, { type PiePagina } from '~/layouts/public'
import { Button, EmptyState } from '~/components/ui'
import styles from '~/components/public/public.module.css'
import layoutStyles from '~/layouts/public.module.css'

type ParkingProps = {
  parking: {
    titulo: string | null
    parrafoUno: string | null
    parrafoDos: string | null
    parrafoTres: string | null
    imagenUno: string | null
    imagenDos: string | null
  } | null
  ofrecemos: { items: string[]; imagenes: string[] }
  horarios: string[]
  direcciones: string[]
  mapsUrl: string
  /** Lo consume el layout público (footer). */
  piePagina: PiePagina
}

export default function Parking({
  parking,
  ofrecemos,
  horarios,
  direcciones,
  mapsUrl,
}: ParkingProps) {
  return (
    <>
      <Seo
        title="Estacionamiento en Ciudad del Este"
        description="Estacionamiento ABAS en el microcentro de Ciudad del Este: predio propio para 360 vehículos, alquiler mensual, por día y por hora."
      />
      <div className={layoutStyles.container}>
        {!parking ? (
          <EmptyState
            title="Contenido en preparación"
            body="Todavía no hay información del estacionamiento cargada."
          />
        ) : (
          <>
            <div
              className={styles.portada}
              style={
                parking.imagenUno ? { backgroundImage: `url(${parking.imagenUno})` } : undefined
              }
            >
              <div className={styles.portadaTexto}>
                <h1>{parking.titulo ?? 'Estacionamiento ABAS'}</h1>
                {parking.parrafoUno && <p>{parking.parrafoUno}</p>}
              </div>
            </div>

            <div className={styles.prosa} style={{ marginTop: 'var(--space-6)' }}>
              {parking.parrafoDos && <p>{parking.parrafoDos}</p>}
              {parking.parrafoTres && <p>{parking.parrafoTres}</p>}
              {parking.imagenDos && (
                <img
                  className={styles.imagenSola}
                  src={parking.imagenDos}
                  alt={parking.titulo ?? 'Estacionamiento ABAS'}
                />
              )}

              {ofrecemos.items.length > 0 && (
                <>
                  <h2>Ofrecemos</h2>
                  <ul className={styles.listaCheck}>
                    {ofrecemos.items.map((item) => (
                      <li key={item.slice(0, 40)}>
                        <Check size={18} /> {item}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {ofrecemos.imagenes.length > 0 && (
                <div className={styles.imagenesGrid}>
                  {ofrecemos.imagenes.map((img) => (
                    <img key={img} src={img} alt="Estacionamiento ABAS" />
                  ))}
                </div>
              )}

              {horarios.length > 0 && (
                <>
                  <h2>Nuestros horarios</h2>
                  <ul className={styles.listaCheck}>
                    {horarios.map((h) => (
                      <li key={h.slice(0, 40)}>
                        <Clock size={18} /> {h}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {direcciones.length > 0 && (
                <>
                  <h2>Dirección y contacto</h2>
                  <ul className={styles.listaCheck}>
                    {direcciones.map((d) => (
                      <li key={d.slice(0, 40)}>
                        <MapPin size={18} /> {d}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Fase 1: sin iframe de Maps — link directo a Google Maps. */}
              <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                <a href={mapsUrl} target="_blank" rel="noreferrer">
                  <Button variant="primary" tabIndex={-1}>
                    <ExternalLink size={16} /> Ver ubicación en Google Maps
                  </Button>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

Parking.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
