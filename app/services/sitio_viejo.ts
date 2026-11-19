/*
|--------------------------------------------------------------------------
| Direcciones del sitio viejo (React, todo bajo /web/...)
|--------------------------------------------------------------------------
|
| Google y los links compartidos (WhatsApp, Facebook) apuntan a esas
| rutas: se redirigen 301 a su equivalente nuevo para no perder visitas
| ni posicionamiento.
|
| /web/loteamientos/:id usaba el ID INTERNO de la fracción en la base
| vieja, no su código: este mapa (sacado del dump, solo activas) lo
| traduce al código que usa el mapa nuevo (?fraccion=<código>).
|
*/

export const PAGINAS_SITIO_VIEJO: Record<string, string> = {
  'inicio': '/',
  'loteamientos': '/loteamientos',
  'nosotros': '/quienes-somos',
  'preguntas': '/preguntas-frecuentes',
  'deseo-vender': '/deseo-vender',
  'contacto': '/contacto',
}

const CODIGO_POR_ID_VIEJO: Record<number, number> = {
  69: 227,
  70: 218,
  71: 225,
  72: 223,
  73: 209,
  74: 215,
  75: 202,
  76: 216,
  78: 208,
  81: 156,
  82: 166,
  83: 226,
  91: 220,
  102: 300,
  104: 214,
  110: 200,
  111: 219,
  112: 205,
  113: 235,
  114: 236,
  115: 230,
  126: 188,
  128: 196,
  129: 229,
  133: 201,
  134: 224,
  135: 194,
  136: 222,
  137: 191,
  145: 228,
  146: 145,
  147: 206,
  148: 195,
  149: 192,
  150: 231,
  151: 232,
  152: 234,
  156: 203,
  157: 233,
  158: 220,
  159: 221,
  160: 190,
  161: 204,
}

/** Destino nuevo de una ruta vieja /web/<pagina>[/<id>] */
export function destinoSitioViejo(pagina: string | undefined, id?: string): string {
  if (pagina === 'loteamientos' && id) {
    const codigo = CODIGO_POR_ID_VIEJO[Number(id)]
    return codigo ? `/loteamientos?fraccion=${codigo}` : '/loteamientos'
  }
  return PAGINAS_SITIO_VIEJO[pagina ?? ''] ?? '/'
}
