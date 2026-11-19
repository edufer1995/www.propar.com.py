/*
|--------------------------------------------------------------------------
| /app/planos — importación y gestión de planos cartográficos
|--------------------------------------------------------------------------
|
| Lista con el motor de tabla (búsqueda/orden/paginación/export server-
| side). El alta es una importación: descripcion + codigo + un .kmz/.kml
| (revisado en el server) o 3 .geojson (fracción/manzanas/lotes) validados
| en cliente, con previsualización en
| el PlanoViewer ANTES de guardar. Editar solo toca descripción/estado
| (re-dibujar el plano = eliminar y volver a crear). Eliminar borra en
| cascada manzanas y lotes (la confirmación dice cuántos).
|
*/

import { useMemo, useState, type ReactElement } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'

import AdminLayout from '~/layouts/admin'
import { Button, InputField, Modal, ToggleField } from '~/components/ui'
import { BadgeActivo } from '~/components/crud/resource_page'
import { DataTable, type MetaTabla } from '~/components/datatable/data_table'
import { GeojsonUploader, type ArchivoPlano } from '~/components/crud/geojson_uploader'
import { KmzUploader, type ArchivoKmz } from '~/components/crud/kmz_uploader'
import { PlanoViewer, type GeojsonPlano } from '~/components/planos/plano_viewer'
import { geojsonDePreview } from '~/lib/geojson_plano'
import { useTouchedFields } from '~/hooks/use_touched_fields'
import { useUnsavedChanges } from '~/hooks/use_unsaved_changes'
import { confirmDelete } from '~/lib/swal'
import { http } from '~/lib/http'
import { formatDate } from '~/lib/format'
import { texts } from '~/lib/texts'
import tabla from '~/components/datatable/data_table.module.css'
import styles from '~/components/crud/crud.module.css'

const BASE_URL = '/app/planos'

interface Fila {
  id: number
  codigo: number
  descripcion: string | null
  manzanas: number
  lotes: number
  activo: boolean
  creado: string
}

interface DetalleFraccion {
  fraccion: { codigo: number; descripcion: string }
  geojson: GeojsonPlano
}

function primerError(error?: string | string[]): string | undefined {
  return Array.isArray(error) ? error[0] : error
}

/* ------------------------------------------------------------------ */
/* Modal de alta (importación con preview)                             */
/* ------------------------------------------------------------------ */

function CrearPlanoModal({ onClose }: { onClose: () => void }) {
  const { props } = usePage()
  const erroresServer = (props.errors ?? {}) as Record<string, string | string[]>

  const [descripcion, setDescripcion] = useState('')
  const [codigo, setCodigo] = useState('')
  const [fraccion, setFraccion] = useState<ArchivoPlano | null>(null)
  const [manzanas, setManzanas] = useState<ArchivoPlano | null>(null)
  const [lotes, setLotes] = useState<ArchivoPlano | null>(null)
  const [formato, setFormato] = useState<'kmz' | 'geojson'>('kmz')
  const [kmz, setKmz] = useState<ArchivoKmz | null>(null)
  const [preview, setPreview] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const { touch, isTouched } = useTouchedFields<string>()

  const dirty = Boolean(descripcion || codigo || fraccion || manzanas || lotes || kmz)
  const { confirmarCierre } = useUnsavedChanges(dirty)

  /** Consistencia entre archivos (espejo del server) */
  const erroresCliente = useMemo(() => {
    const errores: Record<string, string> = {}
    if (!descripcion.trim() || descripcion.trim().length < 2) {
      errores.descripcion = 'Ingresá la descripción de la fracción'
    }
    const n = Number(codigo)
    if (!Number.isInteger(n) || n < 1 || n > 999) {
      errores.codigo = 'El código debe ser un entero entre 1 y 999'
    }
    if (formato === 'kmz') {
      if (!kmz) errores.archivoKmz = 'Subí el archivo .kmz o .kml del plano'
      else if (!kmz.revision.ok) errores.archivoKmz = 'Corregí los problemas del plano'
      return errores
    }

    if (!fraccion) errores.archivoFraccion = 'Subí el archivo de fracción'
    if (!manzanas) errores.archivoManzanas = 'Subí el archivo de manzanas'
    if (!lotes) errores.archivoLotes = 'Subí el archivo de lotes'

    if (manzanas && lotes) {
      const codigosManzana = new Set(manzanas.features.map((m) => m.mz))
      const huerfano = lotes.features.find((l) => !codigosManzana.has(l.mz))
      if (huerfano) {
        errores.archivoLotes = `El lote ${huerfano.mz}-${huerfano.lt} referencia la manzana ${huerfano.mz}, que no está en el archivo de manzanas`
      }
    }
    return errores
  }, [descripcion, codigo, formato, kmz, fraccion, manzanas, lotes])

  const esValido = Object.keys(erroresCliente).length === 0
  const puedePrevisualizar =
    formato === 'kmz'
      ? Boolean(kmz && kmz.revision.resumen.lotes > 0)
      : Boolean(fraccion && manzanas && lotes)

  const errorDe = (campo: string): string | undefined => {
    const servidor = primerError(erroresServer[campo])
    if (enviado && servidor) return servidor
    return isTouched(campo) || enviado ? erroresCliente[campo] : undefined
  }

  const enviar = () => {
    if (!esValido || enviando) return
    setEnviado(true)

    router.post(
      BASE_URL,
      (formato === 'kmz'
        ? {
            descripcion: descripcion.trim(),
            codigo: Number(codigo),
            formato: 'kmz',
            archivoKmz: kmz!.archivo,
          }
        : {
            descripcion: descripcion.trim(),
            codigo: Number(codigo),
            archivoFraccion: fraccion!.archivo,
            archivoManzanas: manzanas!.archivo,
            archivoLotes: lotes!.archivo,
          }) as unknown as Record<string, never>,
      {
        forceFormData: true,
        preserveScroll: true,
        preserveState: true,
        onStart: () => setEnviando(true),
        onFinish: () => setEnviando(false),
        onSuccess: () => onClose(),
      }
    )
  }

  const cerrar = async () => {
    if (await confirmarCierre()) onClose()
  }

  return (
    <>
      <Modal
        open
        /**
         * Con el preview abierto encima, Esc/backdrop del modal cierran el
         * preview (no el formulario): evita el apilado de listeners de Esc.
         */
        onClose={() => (preview ? setPreview(false) : void cerrar())}
        title="Importar plano"
        size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => void cerrar()}>
              {texts.common.cancel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!puedePrevisualizar}
              onClick={() => setPreview(true)}
            >
              <Eye size={16} /> Previsualizar antes de guardar
            </Button>
            <Button
              type="submit"
              form="crear-plano-form"
              loading={enviando}
              loadingText="Importando..."
              disabled={!esValido}
            >
              Importar
            </Button>
          </>
        }
      >
        <form
          id="crear-plano-form"
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            enviar()
          }}
        >
          <div className={styles.formatoPlano} role="group" aria-label="Formato del plano">
            <Button
              type="button"
              variant={formato === 'kmz' ? 'primary' : 'secondary'}
              aria-pressed={formato === 'kmz'}
              onClick={() => setFormato('kmz')}
            >
              Un archivo KMZ / KML
            </Button>
            <Button
              type="button"
              variant={formato === 'geojson' ? 'primary' : 'secondary'}
              aria-pressed={formato === 'geojson'}
              onClick={() => setFormato('geojson')}
            >
              3 archivos GeoJSON
            </Button>
          </div>

          <p className={styles.avisoForm}>
            {formato === 'kmz' ? (
              <>
                El KMZ/KML del agrimensor, con las capas POLIGONO (contorno), MAN y MAN_TEXT
                (manzanas y sus números), LOTE y LOTE_TEXT (lotes y sus números). Al elegirlo se
                revisa y se muestra qué hay que corregir. Nada se guarda hasta apretar “Importar”.
              </>
            ) : (
              <>
                Los 3 archivos .geojson salen del plano del agrimensor: polígonos con{' '}
                <code>properties.MZ</code> (manzanas y lotes) y <code>properties.LT</code> (lotes).
                Nada se guarda hasta apretar “Importar”.
              </>
            )}
          </p>

          <div className={styles.formFilaDoble}>
            <InputField
              label="Descripción"
              required
              maxLength={255}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              onBlur={touch('descripcion')}
              error={errorDe('descripcion')}
              hint="Ej.: Loteamiento San Blas — Luque"
            />
            <InputField
              type="number"
              label="Código de fracción"
              required
              min={1}
              max={999}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onBlur={touch('codigo')}
              error={errorDe('codigo')}
              hint="Entero de 1 a 999, único"
            />
          </div>

          {formato === 'kmz' && (
            <KmzUploader valor={kmz} onChange={setKmz} error={errorDe('archivoKmz')} />
          )}

          {formato === 'geojson' && (
            <>
              <GeojsonUploader
                etiqueta="Archivo de fracción"
                tipo="fraccion"
                hint="1 polígono con el contorno de la fracción · máx 2 MB"
                valor={fraccion}
                onChange={setFraccion}
                error={errorDe('archivoFraccion')}
              />
              <GeojsonUploader
                etiqueta="Archivo de manzanas"
                tipo="manzanas"
                hint="Un polígono por manzana, con properties.MZ · máx 2 MB"
                valor={manzanas}
                onChange={setManzanas}
                error={errorDe('archivoManzanas')}
              />
              <GeojsonUploader
                etiqueta="Archivo de lotes"
                tipo="lotes"
                hint="Un polígono por lote, con properties.MZ y properties.LT · máx 2 MB"
                valor={lotes}
                onChange={setLotes}
                error={errorDe('archivoLotes')}
              />
            </>
          )}
        </form>
      </Modal>

      {preview && formato === 'kmz' && kmz && (
        <PlanoViewer
          titulo={`Previsualización — ${descripcion.trim() || 'plano sin nombre'}`}
          subtitulo={`${kmz.revision.resumen.manzanas} manzanas · ${kmz.revision.resumen.lotes} lotes · todavía NO está guardado`}
          geojson={kmz.revision.geojson}
          onClose={() => setPreview(false)}
        />
      )}

      {preview && formato === 'geojson' && fraccion && manzanas && lotes && (
        <PlanoViewer
          titulo={`Previsualización — ${descripcion.trim() || 'plano sin nombre'}`}
          subtitulo={`${manzanas.features.length} manzanas · ${lotes.features.length} lotes · todavía NO está guardado`}
          geojson={geojsonDePreview(fraccion.features, manzanas.features, lotes.features)}
          onClose={() => setPreview(false)}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Modal de edición (solo descripción/estado)                          */
/* ------------------------------------------------------------------ */

function EditarPlanoModal({ fila, onClose }: { fila: Fila; onClose: () => void }) {
  const { props } = usePage()
  const erroresServer = (props.errors ?? {}) as Record<string, string | string[]>

  const [descripcion, setDescripcion] = useState(fila.descripcion ?? '')
  const [activo, setActivo] = useState(fila.activo)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const dirty = descripcion !== (fila.descripcion ?? '') || activo !== fila.activo
  const { confirmarCierre } = useUnsavedChanges(dirty)

  const errorCliente =
    descripcion.trim().length < 2 ? 'Ingresá la descripción de la fracción' : undefined
  const esValido = !errorCliente

  const enviar = () => {
    if (!esValido || enviando) return
    setEnviado(true)
    router.put(
      `${BASE_URL}/${fila.id}`,
      { descripcion: descripcion.trim(), activo },
      {
        preserveScroll: true,
        preserveState: true,
        onStart: () => setEnviando(true),
        onFinish: () => setEnviando(false),
        onSuccess: () => onClose(),
      }
    )
  }

  const cerrar = async () => {
    if (await confirmarCierre()) onClose()
  }

  return (
    <Modal
      open
      onClose={() => void cerrar()}
      title={`Editar plano ${fila.codigo}`}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => void cerrar()}>
            {texts.common.cancel}
          </Button>
          <Button
            type="submit"
            form="editar-plano-form"
            loading={enviando}
            loadingText={texts.common.saving}
            disabled={!esValido}
          >
            {texts.common.save}
          </Button>
        </>
      }
    >
      <form
        id="editar-plano-form"
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          enviar()
        }}
      >
        <p className={styles.avisoForm}>
          Acá solo se edita la descripción y el estado. Para re-dibujar el plano (nuevos .geojson)
          hay que eliminar esta fracción y volver a importarla.
        </p>
        <InputField
          label="Descripción"
          required
          maxLength={255}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          error={enviado ? (primerError(erroresServer.descripcion) ?? errorCliente) : undefined}
        />
        <ToggleField label="Visible en el mapa público" checked={activo} onChange={setActivo} />
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

type EstadoViewer =
  | { estado: 'cerrado' }
  | { estado: 'cargando'; fila: Fila }
  | { estado: 'ok'; fila: Fila; detalle: DetalleFraccion }

export default function Planos(props: { registros: { data: Fila[]; meta: MetaTabla } }) {
  const [crear, setCrear] = useState(false)
  const [editar, setEditar] = useState<Fila | null>(null)
  const [viewer, setViewer] = useState<EstadoViewer>({ estado: 'cerrado' })

  /** "Ver": trae el detalle público de la fracción y abre el visor. */
  const ver = async (fila: Fila) => {
    setViewer({ estado: 'cargando', fila })
    try {
      const detalle = await http<DetalleFraccion>(`/loteamientos/fracciones/${fila.codigo}/detalle`)
      setViewer({ estado: 'ok', fila, detalle })
    } catch {
      setViewer({ estado: 'cerrado' })
    }
  }

  const eliminar = async (fila: Fila) => {
    const etiqueta = `plano ${fila.codigo} (${fila.descripcion ?? 'sin descripción'}) con sus ${fila.manzanas} manzanas y ${fila.lotes} lotes`
    if (!(await confirmDelete(etiqueta))) return
    router.delete(`${BASE_URL}/${fila.id}`, { preserveScroll: true, preserveState: true })
  }

  return (
    <>
      <Head title="Planos" />

      <div className={styles.pagina}>
        <div className={styles.encabezado}>
          <div className={styles.encabezadoTextos}>
            <h1 className={styles.titulo}>Planos</h1>
            <p className={styles.descripcion}>
              Fracciones cartográficas del mapa /loteamientos: se importan desde el KMZ/KML del
              agrimensor o desde 3 .geojson (fracción + manzanas + lotes).
            </p>
          </div>
          <Button type="button" onClick={() => setCrear(true)}>
            <Plus size={16} /> Importar plano
          </Button>
        </div>

        <DataTable
          data={props.registros.data}
          meta={props.registros.meta}
          busquedaPlaceholder="Buscar por código o descripción"
          exportUrl={`${BASE_URL}/export`}
          only={['registros']}
          columnas={[
            { clave: 'codigo', titulo: 'Código', sortable: true },
            { clave: 'descripcion', titulo: 'Descripción', sortable: true, esTituloCard: true },
            { clave: 'manzanas', titulo: 'Manzanas' },
            { clave: 'lotes', titulo: 'Lotes' },
            {
              clave: 'estado',
              titulo: 'Estado',
              sortable: true,
              render: (f: Fila) => <BadgeActivo activo={f.activo} />,
            },
            {
              clave: 'createdAt',
              titulo: 'Importado',
              sortable: true,
              soloDesktop: true,
              render: (f: Fila) => formatDate(f.creado),
            },
          ]}
          vacio={{
            titulo: 'Aún no hay planos importados',
            cta: 'Importar el primero',
            onCta: () => setCrear(true),
          }}
          acciones={(fila: Fila) => (
            <>
              <button
                type="button"
                className={tabla.btnIcono}
                onClick={() => void ver(fila)}
                aria-label={`Ver plano ${fila.codigo}`}
                title="Ver plano"
              >
                <Eye size={16} />
              </button>
              <button
                type="button"
                className={tabla.btnIcono}
                onClick={() => setEditar(fila)}
                aria-label={texts.common.edit}
                title={texts.common.edit}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                className={[tabla.btnIcono, tabla.btnIconoPeligro].join(' ')}
                onClick={() => void eliminar(fila)}
                aria-label={texts.common.delete}
                title={texts.common.delete}
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        />
      </div>

      {crear && <CrearPlanoModal onClose={() => setCrear(false)} />}
      {editar && <EditarPlanoModal key={editar.id} fila={editar} onClose={() => setEditar(null)} />}
      {viewer.estado === 'ok' && (
        <PlanoViewer
          titulo={`Plano ${viewer.fila.codigo} — ${viewer.detalle.fraccion.descripcion}`}
          subtitulo={`${viewer.fila.manzanas} manzanas · ${viewer.fila.lotes} lotes`}
          geojson={viewer.detalle.geojson}
          onClose={() => setViewer({ estado: 'cerrado' })}
        />
      )}
    </>
  )
}

Planos.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
