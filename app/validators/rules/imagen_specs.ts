/*
|--------------------------------------------------------------------------
| Especificaciones de imágenes subidas
|--------------------------------------------------------------------------
|
| ÚNICA fuente de verdad de los requisitos de cada tipo de imagen del
| sitio: el UploadService valida contra estas specs y el frontend muestra
| los requisitos con describirSpec() (mismo texto en ambos lados).
|
*/

/** Formatos aceptados en todo el sitio (se validan por magic bytes, no por extensión) */
export const FORMATOS_PERMITIDOS = ['png', 'jpeg', 'webp'] as const
export type FormatoImagen = (typeof FORMATOS_PERMITIDOS)[number]

/**
 * Restricción de proporción:
 *  - apaisada: más ancha que alta
 *  - cuadrada: ancho = alto (tolerancia 2%)
 *  - cuatroTres: proporción 4:3 (tolerancia 2%)
 *  - libre: sin restricción
 */
export type AspectoImagen = 'apaisada' | 'cuadrada' | 'cuatroTres' | 'libre'

export interface ImagenSpec {
  /** Ancho mínimo en píxeles */
  anchoMinimo: number
  /** Alto mínimo en píxeles */
  altoMinimo: number
  /** Peso máximo del archivo en bytes */
  pesoMaximoBytes: number
  aspecto: AspectoImagen
  /** Medida ideal de trabajo, mostrada como sugerencia junto a los requisitos */
  recomendado: string
}

const MB = 1024 * 1024

/**
 * Specs por tipo de imagen del sitio.
 */
export const IMAGEN_SPECS = {
  /** Slides del carrusel del home */
  carrusel: {
    anchoMinimo: 1920,
    altoMinimo: 800,
    pesoMaximoBytes: 2 * MB,
    aspecto: 'apaisada',
    recomendado: 'ideal 1920×1080',
  },
  /**
   * Cards del home con foto (hoy: promociones). Conserva el nombre
   * `cardLanzamiento` porque es el valor guardado en uploads.spec de las
   * imágenes ya subidas: renombrarlo obligaría a migrar esas filas.
   * Proporción libre: el material real de marketing son afiches
   * verticales (la card recorta con object-fit y el modal muestra entero).
   */
  cardLanzamiento: {
    anchoMinimo: 800,
    altoMinimo: 600,
    pesoMaximoBytes: 2 * MB,
    aspecto: 'libre',
    recomendado: 'ideal 1080×1350 (afiche vertical)',
  },
  /** Tiles de "lotes por distrito" del home */
  tileDistrito: {
    anchoMinimo: 600,
    altoMinimo: 600,
    pesoMaximoBytes: 2 * MB,
    aspecto: 'libre',
    recomendado: 'ideal 800×800',
  },
  /** Iconos de redes sociales del footer */
  iconoRed: {
    anchoMinimo: 128,
    altoMinimo: 128,
    pesoMaximoBytes: 1 * MB,
    aspecto: 'cuadrada',
    recomendado: 'ideal 256×256 PNG transparente',
  },
  /** Imagen ampliable de la card de red social del home (la que abre el lightbox) */
  imagenRed: {
    anchoMinimo: 800,
    altoMinimo: 600,
    pesoMaximoBytes: 2 * MB,
    aspecto: 'cuatroTres',
    recomendado: 'ideal 1200×900',
  },
  /** Fotos de alquileres */
  fotoAlquiler: {
    anchoMinimo: 1024,
    altoMinimo: 768,
    pesoMaximoBytes: 3 * MB,
    aspecto: 'libre',
    recomendado: 'ideal 1600×1200 apaisada',
  },
  /** Fotos de páginas institucionales (quiénes somos, parking, ofrecemos) */
  fotoInstitucional: {
    anchoMinimo: 800,
    altoMinimo: 500,
    pesoMaximoBytes: 2 * MB,
    aspecto: 'libre',
    recomendado: 'ideal 1600×1000 apaisada',
  },
  /** Foto de perfil de usuarios del admin */
  fotoPerfil: {
    anchoMinimo: 256,
    altoMinimo: 256,
    pesoMaximoBytes: 2 * MB,
    aspecto: 'cuadrada',
    recomendado: 'ideal 512×512',
  },
  /** Fotos de la galería de fracciones (portada + lightbox del mapa) */
  fotoFraccion: {
    anchoMinimo: 1024,
    altoMinimo: 600,
    pesoMaximoBytes: 3 * MB,
    aspecto: 'libre',
    recomendado: 'ideal 1920×1080 apaisada',
  },
} as const satisfies Record<string, ImagenSpec>

export type NombreImagenSpec = keyof typeof IMAGEN_SPECS

/** Nombres válidos de spec (para validar el parámetro del endpoint de uploads) */
export const NOMBRES_IMAGEN_SPECS = Object.keys(IMAGEN_SPECS) as NombreImagenSpec[]

/**
 * Devuelve la spec por nombre, o null si no existe.
 */
export function obtenerSpec(nombre: string): ImagenSpec | null {
  return (IMAGEN_SPECS as Record<string, ImagenSpec>)[nombre] ?? null
}

const TEXTO_ASPECTO: Record<AspectoImagen, string | null> = {
  apaisada: 'apaisada',
  cuadrada: 'cuadrada',
  cuatroTres: 'proporción 4:3',
  libre: null,
}

/**
 * Serializa una spec a texto de requisitos para mostrar al usuario.
 * Ej.: "PNG/JPG/WebP · máx 2 MB · mínimo 1920×800 · apaisada · ideal 1920×1080"
 */
export function describirSpec(spec: ImagenSpec): string {
  const partes = [
    'PNG/JPG/WebP',
    `máx ${formatearMb(spec.pesoMaximoBytes)} MB`,
    `mínimo ${spec.anchoMinimo}×${spec.altoMinimo}`,
  ]

  const aspecto = TEXTO_ASPECTO[spec.aspecto]
  if (aspecto) partes.push(aspecto)

  partes.push(spec.recomendado)

  return partes.join(' · ')
}

/** Formatea bytes a MB sin decimales innecesarios ("2", "1,5") */
function formatearMb(bytes: number): string {
  const mb = bytes / MB
  return Number.isInteger(mb) ? String(mb) : mb.toFixed(1).replace('.', ',')
}

/*
|--------------------------------------------------------------------------
| Specs de video (subidos al server, no YouTube)
|--------------------------------------------------------------------------
|
| Solo MP4 (H.264): es el único contenedor que reproduce nativo en todos
| los navegadores. El peso máximo protege el ancho de banda del server;
| la recomendación de carga es 1080p y 30-90 segundos.
|
*/

export interface VideoSpec {
  /** Peso máximo del archivo en bytes */
  pesoMaximoBytes: number
}

export const VIDEO_SPECS = {
  /** Videos de la galería de fracciones */
  videoFraccion: { pesoMaximoBytes: 150 * MB },
} as const satisfies Record<string, VideoSpec>

export type NombreVideoSpec = keyof typeof VIDEO_SPECS

/** Nombres válidos de spec de video (para el endpoint de uploads) */
export const NOMBRES_VIDEO_SPECS = Object.keys(VIDEO_SPECS) as NombreVideoSpec[]

/**
 * Serializa una spec de video a texto de requisitos.
 * Ej.: "MP4 (H.264) · máx 150 MB · ideal 1080p, 30-90 seg"
 */
export function describirVideoSpec(spec: VideoSpec): string {
  return `MP4 (H.264) · máx ${formatearMb(spec.pesoMaximoBytes)} MB · ideal 1080p, 30-90 seg`
}

/*
|--------------------------------------------------------------------------
| Specs de documentos (PDF)
|--------------------------------------------------------------------------
|
| Solo PDF: se valida por magic bytes ("%PDF-") igual que las imágenes.
| El peso máximo protege el ancho de banda del server.
|
*/

export interface DocumentoSpec {
  /** Peso máximo del archivo en bytes */
  pesoMaximoBytes: number
}

export const DOCUMENTO_SPECS = {
  /** Bases y condiciones (PDF) de una promoción */
  basesPromocion: { pesoMaximoBytes: 10 * MB },
} as const satisfies Record<string, DocumentoSpec>

export type NombreDocumentoSpec = keyof typeof DOCUMENTO_SPECS

/** Nombres válidos de spec de documento (para el endpoint de uploads) */
export const NOMBRES_DOCUMENTO_SPECS = Object.keys(DOCUMENTO_SPECS) as NombreDocumentoSpec[]

/**
 * Serializa una spec de documento a texto de requisitos.
 * Ej.: "PDF · máx 10 MB"
 */
export function describirDocumentoSpec(spec: DocumentoSpec): string {
  return `PDF · máx ${formatearMb(spec.pesoMaximoBytes)} MB`
}
