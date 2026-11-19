import { useEffect, useState, type ReactElement } from 'react'
import { Seo } from '~/components/public/seo'
import { Link } from '@adonisjs/inertia/react'
import { usePage } from '@inertiajs/react'
import { Clock, FileText, Maximize2, MapPin, Phone } from 'lucide-react'
import PublicLayout, { type PiePagina } from '~/layouts/public'
import { IconoRed } from '~/components/public/icons'
import { Button, Modal } from '~/components/ui'
import { formatGs } from '~/lib/format'
import { Seccion } from '~/components/public/seccion'
import { SearchBox } from '~/components/public/search_box'
import { useCarousel } from '~/components/public/use_carousel'
import { HeroCarousel, type SlideCarrusel } from '~/components/public/hero_carousel'
import { LightboxMedios } from '~/components/map/lightbox_medios'
import { BandaAccion } from '~/components/public/propar'
import styles from '~/components/public/public.module.css'
import pr from '~/components/public/propar.module.css'
import layoutStyles from '~/layouts/public.module.css'

type Promocion = {
  id: number
  titulo: string
  descripcion: string | null
  url: string | null
  /** El admin la marcó para abrirse sola en un modal al entrar. */
  modal: boolean
  imagenUrl: string | null
  /** Bases y condiciones (PDF) adjuntas desde el ABM */
  pdfUrl: string | null
}

type Distrito = {
  codigo: number
  nombre: string
  fracciones: number
  lotesLibres: number
  cuotaMinima: number
  imagenUrl: string | null
}

type HomeProps = {
  carrusel: SlideCarrusel[]
  promociones: Promocion[]
  distritos: Distrito[]
  rangosCuota: { valor: string; etiqueta: string }[]
  piePagina: PiePagina
}

/**
 * Subtítulo de la card de red: el usuario que sale de la URL cargada en el
 * admin (…/proparsrl → @proparsrl). En los enlaces de
 * WhatsApp el último tramo es el número, y se muestra como tal.
 */
function cuentaDeRed(url: string): string {
  try {
    const { hostname, pathname } = new URL(url)
    const tramo = pathname.split('/').filter(Boolean).pop()
    const dominio = hostname.replace(/^www\./, '')
    if (!tramo) return dominio
    if (/^\d+$/.test(tramo)) return `+${tramo}`
    return tramo.startsWith('@') ? tramo : `@${tramo}`
  } catch {
    return url
  }
}

export default function Home({
  carrusel,
  promociones,
  distritos,
  rangosCuota,
  piePagina,
}: HomeProps) {
  /**
   * Los carruseles de cards giran solos, como el de portada: loop + un
   * intervalo propio para que no roten los dos al mismo tiempo. La
   * interacción del usuario reinicia el timer (lo hace useCarousel).
   */
  const {
    viewportRef: distritosViewportRef,
    scrollPrev: distritosPrev,
    scrollNext: distritosNext,
  } = useCarousel({ loop: true, align: 'start' }, 5000)
  const {
    viewportRef: redesViewportRef,
    scrollPrev: redesPrev,
    scrollNext: redesNext,
  } = useCarousel({ loop: true, align: 'start' }, 6500)
  const {
    viewportRef: promosViewportRef,
    scrollPrev: promosPrev,
    scrollNext: promosNext,
  } = useCarousel({ loop: true, align: 'start' }, 7500)
  const [sucursalId, setSucursalId] = useState<number | null>(piePagina.sucursales[0]?.id ?? null)
  const sucursal = piePagina.sucursales.find((s) => s.id === sucursalId)
  const { props } = usePage()
  const linkWhatsApp = `https://wa.me/${String(props.whatsappVentas ?? '+595976522694').replace(/\D/g, '')}?text=${encodeURIComponent('Hola Propar, vengo del sitio web y quisiera más información.')}`

  /** Red cuya imagen está abierta en el lightbox (solo las que cargaron una). */
  const [redAmpliadaId, setRedAmpliadaId] = useState<number | null>(null)
  const redAmpliada = piePagina.redes.find((r) => r.id === redAmpliadaId) ?? null

  /** Promoción cuyo afiche está abierto en el lightbox. */
  const [promoAmpliadaId, setPromoAmpliadaId] = useState<number | null>(null)
  const promoAmpliada = promociones.find((p) => p.id === promoAmpliadaId) ?? null

  /**
   * Promoción destacada: la más reciente marcada como modal en el ABM.
   * Se abre una vez por sesión del navegador (volver al home desde otra
   * página no la repite) y con un respiro para que la portada pinte
   * primero. Arranca cerrada, así el SSR y la hidratación coinciden.
   */
  const promoModal = promociones.find((p) => p.modal) ?? null
  const [promoAbierta, setPromoAbierta] = useState(false)

  useEffect(() => {
    if (!promoModal) return
    const clave = `propar:promo-modal:${promoModal.id}`
    if (sessionStorage.getItem(clave)) return
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(clave, '1')
      setPromoAbierta(true)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [promoModal])

  return (
    <>
      <Seo
        title="Lotes en cuotas en Paraguay"
        description="Inmobiliaria Propar S.R.L.: venta de lotes en cuotas y loteamientos en Paraguay."
      />

      {/* (a) Carrusel de portada */}
      <HeroCarousel slides={carrusel} />

      {/* (b) Buscador principal */}
      <SearchBox
        rangos={rangosCuota}
        distritos={distritos.map((d) => ({ codigo: d.codigo, nombre: d.nombre }))}
      />

      <div className={layoutStyles.container}>
        {/* (c) Promociones activas: si no hay, la sección no se renderiza.
            Carrusel como el resto del home; cada slide muestra el afiche
            ENTERO en área vertical 4:5 (el formato del material real). */}
        {promociones.length > 0 && (
          <Seccion
            eyebrow="Promociones"
            titulo="Aprovecha los beneficios vigentes"
            onPrev={promosPrev}
            onNext={promosNext}
          >
            <div className={styles.embla} ref={promosViewportRef}>
              <div className={styles.emblaContainer}>
                {promociones.map((promo) => (
                  <div key={promo.id} className={styles.promoSlide}>
                    {/* La card es un div con un enlace "estirado" (no un <a>):
                        así el PDF de bases puede ser otro enlace adentro sin
                        anidar anchors (HTML inválido que rompe la hidratación). */}
                    <div className={styles.promo}>
                      {promo.url && (
                        <a
                          className={styles.promoStretch}
                          href={promo.url}
                          aria-label={promo.titulo}
                        />
                      )}
                      {promo.imagenUrl && (
                        /* El click en el afiche también amplía (si la promo
                           tiene URL, el enlace estirado queda encima y gana). */
                        <div
                          className={styles.promoAfiche}
                          onClick={() => setPromoAmpliadaId(promo.id)}
                        >
                          <img className={styles.promoImg} src={promo.imagenUrl} alt="" />
                          <button
                            type="button"
                            className={styles.redAmpliar}
                            onClick={() => setPromoAmpliadaId(promo.id)}
                            aria-label={`Ver el afiche de ${promo.titulo} en grande`}
                            title="Ver en grande"
                          >
                            <Maximize2 size={16} />
                          </button>
                        </div>
                      )}
                      <div className={styles.promoBody}>
                        <span className={styles.promoBadge}>Promo vigente</span>
                        <h3>{promo.titulo}</h3>
                        {promo.descripcion && <p>{promo.descripcion}</p>}
                        {promo.pdfUrl && (
                          <a
                            className={styles.promoBases}
                            href={promo.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <FileText size={15} /> Bases y condiciones (PDF)
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Seccion>
        )}

        {/* (d) Lotes por distrito: carrusel (antes era una grilla de tiles) */}
        {distritos.length > 0 && (
          <Seccion
            eyebrow="Lotes por distrito"
            titulo="Elige la ciudad donde quieres vivir"
            onPrev={distritosPrev}
            onNext={distritosNext}
          >
            <div className={styles.embla} ref={distritosViewportRef}>
              <div className={styles.emblaContainer}>
                {distritos.map((d) => (
                  <div key={d.codigo} className={styles.cardSlide}>
                    <Link
                      route="public.loteamientos"
                      qs={{ distrito: String(d.codigo) }}
                      className={styles.distritoTile}
                      style={d.imagenUrl ? { backgroundImage: `url(${d.imagenUrl})` } : undefined}
                    >
                      <div className={styles.distritoInfo}>
                        <h3>{d.nombre}</h3>
                        <div className={styles.distritoStats}>
                          <span className={styles.distritoStat}>
                            {d.fracciones} {d.fracciones === 1 ? 'fracción' : 'fracciones'}
                          </span>
                          <span className={styles.distritoStat}>
                            {d.lotesLibres} {d.lotesLibres === 1 ? 'lote libre' : 'lotes libres'}
                          </span>
                        </div>
                        {d.cuotaMinima > 0 && (
                          <span className={styles.distritoCuota}>
                            Cuotas desde <b>{formatGs(d.cuotaMinima)}</b>
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </Seccion>
        )}

        {/* (e) Carrusel de redes sociales. La card muestra la imagen cargada
            en el ABM —con botón para verla en grande— y cae al icono de la
            marca cuando la red no tiene imagen. */}
        {piePagina.redes.length > 0 && (
          <Seccion
            eyebrow="Redes"
            titulo="Síguenos en redes"
            subtitulo="Novedades, lanzamientos y promos al día."
            onPrev={redesPrev}
            onNext={redesNext}
          >
            <div className={styles.embla} ref={redesViewportRef}>
              <div className={styles.emblaContainer}>
                {piePagina.redes.map((red) => (
                  <div key={red.id} className={styles.cardSlide}>
                    <article className={styles.propCard}>
                      {red.imagenUrl ? (
                        /* Área 4:3 (la proporción que exige el ABM): la imagen
                           se ve entera, con fondo difuminado por si no es exacta. */
                        <div className={`${styles.propCardImagen} ${styles.redImagenArea}`}>
                          <img
                            className={styles.redImagenFondo}
                            src={red.imagenUrl}
                            alt=""
                            aria-hidden
                          />
                          <img
                            className={styles.redImagen}
                            src={red.imagenUrl}
                            alt={red.nombre}
                            loading="lazy"
                            onClick={() => setRedAmpliadaId(red.id)}
                          />
                          <button
                            type="button"
                            className={styles.redAmpliar}
                            onClick={() => setRedAmpliadaId(red.id)}
                            aria-label={`Ver la imagen de ${red.nombre} en grande`}
                            title="Ver en grande"
                          >
                            <Maximize2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className={`${styles.propCardImagen} ${styles.redMedia}`}>
                          {red.iconoUrl ? (
                            <img className={styles.redMediaIcono} src={red.iconoUrl} alt="" />
                          ) : (
                            <IconoRed nombre={red.nombre} size={64} />
                          )}
                        </div>
                      )}
                      <div className={styles.propCardBody}>
                        <h3 className={styles.propCardTitulo}>{red.nombre}</h3>
                        <span className={styles.propCardUbicacion}>{cuentaDeRed(red.url)}</span>
                      </div>
                      <div className={styles.propCardFooter}>
                        <a href={red.url} target="_blank" rel="noreferrer">
                          <Button variant="primary" style={{ width: '100%' }} tabIndex={-1}>
                            Seguir
                          </Button>
                        </a>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </div>
          </Seccion>
        )}

        {/* (f) Sucursales: lista a la izquierda, ficha con mapa a la derecha */}
        {piePagina.sucursales.length > 0 && (
          <Seccion eyebrow="Sucursales" titulo="Visítanos en la más cercana">
            <div className={styles.sucursales}>
              <div className={styles.sucursalLista} role="tablist" aria-label="Sucursales">
                {piePagina.sucursales.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={s.id === sucursal?.id}
                    aria-controls="ficha-sucursal"
                    className={styles.sucursalBoton}
                    onClick={() => setSucursalId(s.id)}
                  >
                    <b>{s.titulo}</b>
                    {s.horarios && <span>{s.horarios}</span>}
                  </button>
                ))}
              </div>

              {sucursal && (
                <div className={styles.sucursalFicha} id="ficha-sucursal" role="tabpanel">
                  <div className={styles.sucursalMapa}>
                    {sucursal.coordenadas && (
                      <iframe
                        title={`Mapa de la sucursal ${sucursal.titulo}`}
                        src={`https://maps.google.com/maps?q=${sucursal.coordenadas.lat},${sucursal.coordenadas.lng}&z=15&output=embed`}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                      />
                    )}
                  </div>
                  <div className={styles.sucursalInfo}>
                    <h3>{sucursal.titulo}</h3>
                    {sucursal.direccion && (
                      <p>
                        <MapPin size={16} /> {sucursal.direccion}
                      </p>
                    )}
                    {sucursal.horarios && (
                      <p>
                        <Clock size={16} /> {sucursal.horarios}
                      </p>
                    )}
                    {sucursal.telefonos && (
                      <p>
                        <Phone size={16} />
                        <a href={`tel:${sucursal.telefonos.replace(/\s/g, '')}`}>
                          {sucursal.telefonos}
                        </a>
                      </p>
                    )}
                    <div className={styles.sucursalAcciones}>
                      {sucursal.coordenadas && (
                        <a
                          className={`${pr.btn} ${pr.btnVerde}`}
                          href={`https://www.google.com/maps/dir/?api=1&destination=${sucursal.coordenadas.lat},${sucursal.coordenadas.lng}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MapPin size={16} /> Cómo llegar
                        </a>
                      )}
                      <a
                        className={`${pr.btn} ${pr.btnBorde}`}
                        href={linkWhatsApp}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Escribir por WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Seccion>
        )}
      </div>

      {/* (g) Banda marrón: Deseo vender */}
      <div style={{ marginTop: 'var(--space-8)' }}>
        <BandaAccion
          titulo="¿Quieres vender tu terreno?"
          texto="Cuéntanos dónde está, sus medidas y el precio. Un asesor de Propar te contacta para evaluarlo."
          accion={
            <Link route="public.vender.show" className={`${pr.btn} ${pr.btnBlanco}`}>
              Deseo vender
            </Link>
          }
        />
      </div>

      {/* (h) Imagen de una red a pantalla completa (mismo lightbox que el
          mapa: una sola foto, sin flechas). */}
      {redAmpliada?.imagenUrl && (
        <LightboxMedios
          titulo={redAmpliada.nombre}
          medios={{ fotos: [redAmpliada.imagenUrl], videos: [] }}
          onClose={() => setRedAmpliadaId(null)}
        />
      )}

      {/* Afiche de una promoción a pantalla completa (mismo lightbox). */}
      {promoAmpliada?.imagenUrl && (
        <LightboxMedios
          titulo={promoAmpliada.titulo}
          medios={{ fotos: [promoAmpliada.imagenUrl], videos: [] }}
          onClose={() => setPromoAmpliadaId(null)}
        />
      )}

      {/* (i) Promoción destacada: modal de bienvenida */}
      {promoModal && (
        <Modal
          open={promoAbierta}
          onClose={() => setPromoAbierta(false)}
          title={promoModal.titulo}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPromoAbierta(false)}>
                Cerrar
              </Button>
              {promoModal.url && (
                <a href={promoModal.url} onClick={() => setPromoAbierta(false)}>
                  <Button variant="primary" tabIndex={-1}>
                    Ver promoción
                  </Button>
                </a>
              )}
            </>
          }
        >
          {promoModal.imagenUrl && (
            <img className={styles.promoModalImg} src={promoModal.imagenUrl} alt="" />
          )}
          {promoModal.descripcion && <p>{promoModal.descripcion}</p>}
          {promoModal.pdfUrl && (
            <p>
              <a
                className={styles.promoModalBases}
                href={promoModal.pdfUrl}
                target="_blank"
                rel="noreferrer"
              >
                <FileText size={15} /> Bases y condiciones (PDF)
              </a>
            </p>
          )}
        </Modal>
      )}
    </>
  )
}

Home.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
