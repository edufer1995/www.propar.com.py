/*
|--------------------------------------------------------------------------
| Subida de imágenes del admin (cliente)
|--------------------------------------------------------------------------
|
| Validación en cliente ANTES de subir (peso, tipo, dimensiones y
| proporción según la spec que manda el server) + subida a /api/uploads
| con progreso (XHR: fetch aún no reporta upload progress).
|
| La validación de cliente es UX: el server re-valida todo por magic
| bytes en UploadService.
|
*/

export interface SpecCliente {
  /** Texto de requisitos listo para mostrar (describirSpec del server) */
  texto: string
  pesoMaximoBytes: number
  /** Solo en specs de imagen (las de video no tienen dimensiones) */
  anchoMinimo?: number
  altoMinimo?: number
  aspecto?: 'apaisada' | 'cuadrada' | 'cuatroTres' | 'libre'
}

export interface UploadResultado {
  id: number
  link: string
  url: string
}

const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp']

/** Misma tolerancia de proporción que el server (2%) */
const TOLERANCIA_ASPECTO = 0.02

function mb(bytes: number): string {
  const valor = bytes / (1024 * 1024)
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',')
}

/** Dimensiones reales del archivo, leyéndolo con un objectURL */
function leerDimensiones(archivo: File): Promise<{ ancho: number; alto: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const imagen = new Image()
    imagen.onload = () => {
      resolve({ ancho: imagen.naturalWidth, alto: imagen.naturalHeight })
      URL.revokeObjectURL(url)
    }
    imagen.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('no-imagen'))
    }
    imagen.src = url
  })
}

/**
 * Valida el archivo contra la spec ANTES de subir. Devuelve el mensaje
 * de error en español, o null si pasa.
 */
export async function validarImagenCliente(
  archivo: File,
  spec: SpecCliente
): Promise<string | null> {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return 'El formato de la imagen debe ser PNG, JPG o WebP'
  }

  if (archivo.size > spec.pesoMaximoBytes) {
    return `La imagen pesa ${mb(archivo.size)} MB y el máximo permitido es ${mb(spec.pesoMaximoBytes)} MB`
  }

  let dimensiones: { ancho: number; alto: number }
  try {
    dimensiones = await leerDimensiones(archivo)
  } catch {
    return 'El archivo no es una imagen válida (se acepta PNG, JPG o WebP)'
  }

  const { ancho, alto } = dimensiones
  const anchoMinimo = spec.anchoMinimo ?? 0
  const altoMinimo = spec.altoMinimo ?? 0
  if (ancho < anchoMinimo || alto < altoMinimo) {
    return `La imagen mide ${ancho}×${alto} px y el mínimo es ${anchoMinimo}×${altoMinimo} px`
  }

  switch (spec.aspecto) {
    case 'apaisada':
      if (ancho <= alto) return 'La imagen debe ser apaisada (más ancha que alta)'
      break
    case 'cuadrada':
      if (Math.abs(ancho - alto) > ancho * TOLERANCIA_ASPECTO) {
        return 'La imagen debe ser cuadrada (mismo ancho y alto)'
      }
      break
    case 'cuatroTres':
      if (Math.abs(ancho / alto - 4 / 3) > (4 / 3) * TOLERANCIA_ASPECTO) {
        return 'La imagen debe tener proporción 4:3'
      }
      break
    case 'libre':
      break
  }

  return null
}

/**
 * Valida un video MP4 contra la spec ANTES de subir (tipo + peso; el
 * server re-valida por magic bytes). Mensaje en español o null si pasa.
 */
export function validarVideoCliente(archivo: File, spec: SpecCliente): string | null {
  if (archivo.type !== 'video/mp4') {
    return 'El video debe ser MP4 (exportalo como MP4 H.264)'
  }
  if (archivo.size > spec.pesoMaximoBytes) {
    return `El video pesa ${mb(archivo.size)} MB y el máximo permitido es ${mb(spec.pesoMaximoBytes)} MB`
  }
  return null
}

/**
 * Valida un documento PDF contra la spec ANTES de subir (tipo + peso; el
 * server re-valida por magic bytes). Mensaje en español o null si pasa.
 */
export function validarPdfCliente(archivo: File, spec: SpecCliente): string | null {
  if (archivo.type !== 'application/pdf') {
    return 'El archivo debe ser un PDF'
  }
  if (archivo.size > spec.pesoMaximoBytes) {
    return `El PDF pesa ${mb(archivo.size)} MB y el máximo permitido es ${mb(spec.pesoMaximoBytes)} MB`
  }
  return null
}

/** Token CSRF de la cookie XSRF-TOKEN (shield la expone para clientes JS) */
function tokenXsrf(): string {
  const crudo = document.cookie
    .split('; ')
    .find((c) => c.startsWith('XSRF-TOKEN='))
    ?.slice('XSRF-TOKEN='.length)
  return crudo ? decodeURIComponent(crudo) : ''
}

/**
 * Sube el archivo a POST /api/uploads con la spec indicada, reportando
 * progreso 0-100. Resuelve {id, link, url} o rechaza con Error cuyo
 * message está en español (listo para mostrar inline).
 */
export function subirImagen(
  archivo: File,
  spec: string,
  onProgreso: (porcentaje: number) => void
): Promise<UploadResultado> {
  return new Promise((resolve, reject) => {
    const datos = new FormData()
    datos.append('file', archivo)
    datos.append('spec', spec)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/uploads')
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('X-XSRF-TOKEN', tokenXsrf())
    xhr.responseType = 'json'

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status === 201) {
        resolve(xhr.response as UploadResultado)
        return
      }
      // El 422 llega como {errors:[{message}]} (validación del endpoint) o
      // como {message} (ErrorDeImagen renderizado por el exception handler)
      const cuerpo = xhr.response as { errors?: { message?: string }[]; message?: string } | null
      const mensaje =
        cuerpo?.errors?.[0]?.message ??
        cuerpo?.message ??
        (xhr.status === 401
          ? 'Tu sesión expiró. Iniciá sesión de nuevo.'
          : 'No se pudo subir la imagen. Probá de nuevo.')
      reject(new Error(mensaje))
    }

    xhr.onerror = () => reject(new Error('Sin conexión. Verificá tu internet.'))

    xhr.send(datos)
  })
}
