import vine from '@vinejs/vine'

/**
 * Formulario "Deseo vender": datos del terreno que alguien ofrece a Propar.
 * Teléfono obligatorio (el asesor llama); correo opcional.
 */
export const venderValidator = vine.create({
  ubicacion: vine.string().trim().minLength(5).maxLength(500),
  tamano: vine.string().trim().minLength(2).maxLength(120),
  precio: vine.string().trim().maxLength(120).optional(),
  nombre: vine.string().trim().minLength(3).maxLength(120),
  telefono: vine.string().trim().minLength(6).maxLength(30),
  correo: vine.string().trim().email().maxLength(254).optional(),
  comentarios: vine.string().trim().maxLength(2000).optional(),
})

export type DatosVender = Awaited<ReturnType<typeof venderValidator.validate>>
