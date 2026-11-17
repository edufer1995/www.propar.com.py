/*
|--------------------------------------------------------------------------
| /app/lotes-por-distrito — los tiles del home
|--------------------------------------------------------------------------
|
| Cada tile mapea un distrito del ERP a una imagen (spec tileDistrito).
| El admin decide cuántos hay: agrega, edita y quita tiles; el home
| acomoda la grilla a la cantidad. Un mini-form por tile con select de
| distrito + uploader de imagen y guardado individual.
|
*/

import { useState, type ReactElement } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { Plus, Trash2 } from 'lucide-react'

import AdminLayout from '~/layouts/admin'
import { Button, SelectField } from '~/components/ui'
import { ImageUploader } from '~/components/crud/image_uploader'
import { useUnsavedChanges } from '~/hooks/use_unsaved_changes'
import { confirmDelete } from '~/lib/swal'
import { texts } from '~/lib/texts'
import type { SpecCliente, ValorImagen } from '~/components/crud/tipos'
import crud from '~/components/crud/crud.module.css'
import styles from './lotes_distritos.module.css'

/** Tipos (no interfaces): el render tipado de Inertia exige index signature implícita */
type Tile = {
  id: number
  distritoCodigo: number
  distritoNombre: string
  imagenUploadId: number | null
  imagenUrl: string | null
}

type Distrito = {
  codigo: number
  nombre: string
}

/** Espejo de SpecCliente como type alias (por la misma razón) */
type SpecTile = {
  texto: string
  anchoMinimo: number
  altoMinimo: number
  pesoMaximoBytes: number
  aspecto: 'apaisada' | 'cuadrada' | 'cuatroTres' | 'libre'
}

function TileEditor({
  tile,
  numero,
  distritos,
  specs,
}: {
  tile: Tile
  numero: number
  distritos: Distrito[]
  specs: Record<string, SpecCliente>
}) {
  const { props } = usePage()
  const erroresServer = (props.errors ?? {}) as Record<string, string | string[]>

  const [distritoCodigo, setDistritoCodigo] = useState(String(tile.distritoCodigo))
  const [imagen, setImagen] = useState<ValorImagen | null>(
    tile.imagenUrl ? { id: tile.imagenUploadId, url: tile.imagenUrl } : null
  )
  const [imagenTocada, setImagenTocada] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [quitando, setQuitando] = useState(false)

  const dirty = distritoCodigo !== String(tile.distritoCodigo) || imagenTocada
  useUnsavedChanges(dirty)

  const quitar = async () => {
    if (enviando || quitando) return
    if (!(await confirmDelete(`el tile de ${tile.distritoNombre}`))) return
    router.delete(`/app/lotes-por-distrito/${tile.id}`, {
      preserveScroll: true,
      onStart: () => setQuitando(true),
      onFinish: () => setQuitando(false),
    })
  }

  const guardar = () => {
    if (!dirty || enviando) return
    const payload: Record<string, unknown> = { distritoCodigo: Number(distritoCodigo) }
    if (imagenTocada) payload.imagenUploadId = imagen?.id ?? null

    router.put(`/app/lotes-por-distrito/${tile.id}`, payload as Record<string, never>, {
      preserveScroll: true,
      onStart: () => setEnviando(true),
      onFinish: () => setEnviando(false),
      onSuccess: () => setImagenTocada(false),
    })
  }

  return (
    <div className={styles.tile}>
      <span className={styles.tileNumero}>Tile {numero}</span>

      <SelectField
        label="Distrito"
        required
        value={distritoCodigo}
        onChange={(e) => setDistritoCodigo(e.target.value)}
        error={
          Array.isArray(erroresServer.distritoCodigo)
            ? erroresServer.distritoCodigo[0]
            : erroresServer.distritoCodigo
        }
      >
        {distritos.map((d) => (
          <option key={d.codigo} value={String(d.codigo)}>
            {d.nombre}
          </option>
        ))}
      </SelectField>

      <ImageUploader
        etiqueta="Imagen del tile"
        spec={specs.tileDistrito}
        specNombre="tileDistrito"
        valor={imagen}
        onChange={(valor) => {
          setImagen(valor)
          setImagenTocada(true)
        }}
        error={
          Array.isArray(erroresServer.imagenUploadId)
            ? erroresServer.imagenUploadId[0]
            : erroresServer.imagenUploadId
        }
      />

      <div className={styles.tileAcciones}>
        <Button
          type="button"
          variant="danger"
          onClick={() => void quitar()}
          loading={quitando}
          loadingText="Quitando..."
        >
          <Trash2 size={14} /> Quitar
        </Button>
        <Button
          type="button"
          onClick={guardar}
          loading={enviando}
          loadingText={texts.common.saving}
          disabled={!dirty}
        >
          {texts.common.save}
        </Button>
      </div>
    </div>
  )
}

export default function LotesDistritos(props: {
  tiles: Tile[]
  distritos: Distrito[]
  specs: Record<string, SpecTile>
}) {
  const [agregando, setAgregando] = useState(false)

  /* Cada distrito puede estar una sola vez: el nuevo tile arranca en el
     primer distrito del ERP que todavía no esté en el home. */
  const usados = new Set(props.tiles.map((t) => t.distritoCodigo))
  const distritoLibre = props.distritos.find((d) => !usados.has(d.codigo))

  const agregar = () => {
    if (agregando || !distritoLibre) return
    router.post(
      '/app/lotes-por-distrito',
      { distritoCodigo: distritoLibre.codigo },
      {
        preserveScroll: true,
        onStart: () => setAgregando(true),
        onFinish: () => setAgregando(false),
      }
    )
  }

  return (
    <>
      <Head title="Lotes por distrito" />

      <div className={crud.pagina}>
        <div className={crud.encabezado}>
          <div className={crud.encabezadoTextos}>
            <h1 className={crud.titulo}>Lotes por distrito</h1>
            <p className={crud.descripcion}>
              Los tiles de “Lotes por distrito” del home: agregá los distritos que quieras mostrar,
              con su foto. Los contadores (fracciones, lotes libres, cuota mínima) salen solos del
              ERP y el home acomoda la grilla a la cantidad.
            </p>
          </div>
          <Button
            type="button"
            onClick={agregar}
            loading={agregando}
            loadingText="Agregando..."
            disabled={!distritoLibre}
            title={distritoLibre ? undefined : 'Todos los distritos del ERP ya están en el home'}
          >
            <Plus size={15} /> Agregar distrito
          </Button>
        </div>

        {props.tiles.length === 0 ? (
          <p className={crud.descripcion}>
            El home no muestra ningún distrito. Agregá el primero con el botón de arriba.
          </p>
        ) : (
          <div className={styles.grilla}>
            {props.tiles.map((tile, i) => (
              <TileEditor
                key={tile.id}
                tile={tile}
                numero={i + 1}
                distritos={props.distritos}
                specs={props.specs}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

LotesDistritos.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
