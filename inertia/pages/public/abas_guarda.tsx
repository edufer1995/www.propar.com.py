import { type ReactElement } from 'react'
import { Clock, Download, KeyRound, MapPin, Navigation, Ruler, ShieldCheck } from 'lucide-react'
import { Seo } from '~/components/public/seo'
import { IconoWhatsApp } from '~/components/public/icons'
import PublicLayout, { type PiePagina } from '~/layouts/public'
import { ABAS_GUARDA, linkWhatsAppAbasGuarda } from '~/lib/abas_guarda'
import layoutStyles from '~/layouts/public.module.css'
import styles from '~/components/public/abas_guarda.module.css'

type AbasGuardaProps = {
  /** Lo consume el layout público (footer). */
  piePagina: PiePagina
}

const CIFRAS = [
  { valor: '254', unidad: '', texto: 'depósitos individuales' },
  { valor: '1.057', unidad: 'm²', texto: 'de superficie de guardado' },
  { valor: '24', unidad: 'hs', texto: 'de vigilancia, todos los días' },
]

const BENEFICIOS = [
  {
    icono: ShieldCheck,
    titulo: 'Seguridad 24/7',
    texto: 'Predio cerrado, guardias y cámaras CCTV en todo el complejo.',
  },
  {
    icono: Ruler,
    titulo: 'Espacios a tu medida',
    texto: 'Depósitos individuales de 3,5 a 7 m², con contrato simple y disponibilidad inmediata.',
  },
  {
    icono: MapPin,
    titulo: 'Ubicación estratégica',
    texto:
      'En el centro de Ciudad del Este, con tres accesos y estacionamiento propio para cargar y descargar.',
  },
  {
    icono: KeyRound,
    titulo: 'Acceso controlado',
    texto:
      'Solo ingresan los inquilinos del complejo, con calle interna pavimentada hasta tu unidad.',
  },
]

export default function AbasGuarda(_props: AbasGuardaProps) {
  const whatsapp = linkWhatsAppAbasGuarda()

  return (
    <>
      <Seo
        title="Abas Guarda: depósitos en Ciudad del Este"
        description="Abas Guarda, tu espacio seguro: depósitos individuales de 3,5 a 7 m² en el centro de Ciudad del Este, con seguridad 24/7. Próximamente apertura."
      />
      <div className={layoutStyles.container}>
        <section className={styles.portada}>
          <div className={styles.portadaTexto}>
            <img
              src="/img/abas-guarda/logo-blanco.png"
              alt="Abas Guarda — tu espacio seguro"
              className={styles.logo}
            />
            <span className={styles.leyenda}>Próximamente apertura en Ciudad del Este</span>
            <h1>
              Tu espacio extra, <em>a un paso del centro</em>
            </h1>
            <p>
              Depósitos individuales en contenedores para personas y comercios que necesitan guardar
              mercadería, muebles, archivos o equipamiento, en un predio propio y seguro junto al
              estacionamiento ABAS.
            </p>
            <div className={styles.acciones}>
              <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.btnPrimario}>
                <IconoWhatsApp size={20} /> Consultá por WhatsApp
              </a>
              <a
                href={ABAS_GUARDA.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.btnSecundario}
              >
                <Navigation size={18} /> Cómo llegar
              </a>
            </div>
          </div>
          <img
            src="/img/abas-guarda/afiche.webp"
            alt="Abas Guarda: muy pronto. Seguridad 24/7, espacios a tu medida, ubicación estratégica y acceso sin restricciones."
            className={styles.afiche}
            width={1092}
            height={1440}
          />
        </section>

        <section className={styles.cifras} aria-label="El complejo en números">
          {CIFRAS.map((c) => (
            <div key={c.texto} className={styles.cifra}>
              <strong>
                {c.valor}
                {c.unidad && <span> {c.unidad}</span>}
              </strong>
              <p>{c.texto}</p>
            </div>
          ))}
        </section>

        <section className={styles.seccion}>
          <h2 className={styles.titulo}>Guardar, sin complicaciones</h2>
          <div className={styles.beneficios}>
            {BENEFICIOS.map(({ icono: Icono, titulo, texto }) => (
              <article key={titulo} className={styles.beneficio}>
                <span className={styles.beneficioIcono}>
                  <Icono size={24} />
                </span>
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.seccion} ${styles.contacto}`}>
          <div className={styles.contactoTexto}>
            <h2 className={styles.titulo}>Beneficios exclusivos de lanzamiento</h2>
            <p>Consultá las condiciones especiales para los primeros clientes de Abas Guarda.</p>
            <ul className={styles.datos}>
              <li>
                <IconoWhatsApp size={18} />
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  {ABAS_GUARDA.whatsappVisible}
                </a>
              </li>
              <li>
                <MapPin size={18} />
                <a href={ABAS_GUARDA.mapsUrl} target="_blank" rel="noreferrer">
                  {ABAS_GUARDA.direccion}
                </a>
              </li>
              <li>
                <Clock size={18} />
                <span>
                  {ABAS_GUARDA.horarios.map((h) => (
                    <span key={h} className={styles.linea}>
                      {h}
                    </span>
                  ))}
                </span>
              </li>
            </ul>
          </div>

          <div className={styles.qr}>
            <img
              src="/img/abas-guarda/qr-abas-guarda.svg"
              alt="Código QR a la página de Abas Guarda"
              width={180}
              height={180}
            />
            <p>Escaneá el código para abrir esta página en tu celular</p>
            <a
              href="/img/abas-guarda/qr-abas-guarda.png"
              download="qr-abas-guarda.png"
              className={styles.descargar}
            >
              <Download size={16} /> Descargar QR
            </a>
          </div>
        </section>
      </div>
    </>
  )
}

AbasGuarda.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
