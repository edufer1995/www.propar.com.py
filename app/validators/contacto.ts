import vine from '@vinejs/vine'

/**
 * Asuntos válidos del formulario de contacto (slugs estables: viajan por
 * query string, se guardan en el lead y definen el tipo).
 */
export const ASUNTOS_CONTACTO = ['comprar-lote', 'vender-propiedad', 'proximo-desarrollo'] as const

export type AsuntoContacto = (typeof ASUNTOS_CONTACTO)[number]

export const ASUNTO_ETIQUETAS: Record<AsuntoContacto, string> = {
  'comprar-lote': 'Interesado en comprar un lote',
  'vender-propiedad': 'Interesado en vender una propiedad',
  'proximo-desarrollo': 'Interesado en un próximo desarrollo',
}

/**
 * Formulario de contacto público. Mismos campos y mínimos que el sitio
 * viejo (jquery.validate), validados en el server.
 */
export const contactoValidator = vine.create({
  nombre: vine.string().trim().minLength(3).maxLength(80),
  apellido: vine.string().trim().minLength(3).maxLength(80),
  telefono: vine.string().trim().minLength(6).maxLength(30),
  correo: vine.string().trim().email().maxLength(254),
  asunto: vine.enum(ASUNTOS_CONTACTO),
  consulta: vine.string().trim().minLength(5).maxLength(2000),
})
