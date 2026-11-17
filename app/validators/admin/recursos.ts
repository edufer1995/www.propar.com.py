/*
|--------------------------------------------------------------------------
| Validators de los recursos CRUD del admin (Etapa 5a)
|--------------------------------------------------------------------------
|
| Un validator por recurso. Los campos imagen NO van acá: llegan como id
| de upload y los verifica el motor (RecursoController) contra la spec.
|
*/

import vine from '@vinejs/vine'

/**
 * Solo rutas internas ("/algo") o URLs http(s) absolutas: el valor termina
 * como href en el home público, así que hay que frenar esquemas tipo
 * "javascript:". El "/" no puede ir seguido de otro "/" ni "\" para que
 * "//evil.com" no cuele como protocol-relative hacia otro dominio.
 */
const urlSegura = vine.createRule((valor, _opciones, field) => {
  if (typeof valor !== 'string') return
  if (!/^(\/(?![/\\])|https?:\/\/)/i.test(valor)) {
    field.report(
      'La URL debe ser una ruta interna (empezar con "/") o una dirección http:// o https://',
      'urlSegura',
      field
    )
  }
})

export const sucursalValidator = vine.create({
  titulo: vine.string().trim().minLength(2).maxLength(120),
  lat: vine.number().min(-90).max(90),
  lng: vine.number().min(-180).max(180),
  horarios: vine.string().trim().maxLength(255).nullable(),
  telefonos: vine.string().trim().maxLength(255).nullable(),
  activo: vine.boolean(),
})

export const carruselValidator = vine.create({
  titulo: vine.string().trim().minLength(2).maxLength(150),
  subtitulo: vine.string().trim().maxLength(150).nullable(),
  descripcion: vine.string().trim().maxLength(600).nullable(),
  fraccionCodigo: vine.number().withoutDecimals().positive().nullable(),
  url: vine.string().trim().maxLength(300).use(urlSegura()).nullable(),
  activo: vine.boolean(),
})

export const proximoDesarrolloValidator = vine.create({
  distrito: vine.string().trim().minLength(2).maxLength(120),
  fraccion: vine.string().trim().maxLength(120).nullable(),
  precioDesde: vine.number().min(0).nullable(),
  departamento: vine.string().trim().maxLength(120).nullable(),
  lotes: vine.number().withoutDecimals().min(0).nullable(),
  activo: vine.boolean(),
})

export const redSocialValidator = vine.create({
  nombre: vine.string().trim().minLength(2).maxLength(80),
  url: vine.string().trim().url().maxLength(300),
  orden: vine.number().withoutDecimals().min(0),
  activo: vine.boolean(),
})

export const promocionValidator = vine.create({
  titulo: vine.string().trim().minLength(2).maxLength(150),
  descripcion: vine.string().trim().maxLength(600).nullable(),
  url: vine.string().trim().maxLength(300).use(urlSegura()).nullable(),
  vigenteDesde: vine.date().nullable(),
  vigenteHasta: vine.date().nullable(),
  activo: vine.boolean(),
  modal: vine.boolean(),
})

export const usuarioAppValidator = vine.create({
  nombres: vine.string().trim().minLength(3).maxLength(120),
  documento: vine.string().trim().minLength(4).maxLength(30),
  correo: vine.string().trim().email().maxLength(254),
})

export const alquilerValidator = vine.create({
  direccion: vine.string().trim().minLength(3).maxLength(255),
  ubicacion: vine.string().trim().maxLength(120).nullable(),
  contacto: vine.string().trim().maxLength(255).nullable(),
  precioMensual: vine.number().min(0).nullable(),
  precioGarantia: vine.number().min(0).nullable(),
  habitaciones: vine.number().withoutDecimals().min(0).max(50).nullable(),
  banos: vine.number().withoutDecimals().min(0).max(50).nullable(),
  cocinas: vine.number().withoutDecimals().min(0).max(50).nullable(),
  observaciones: vine.string().trim().maxLength(2000).nullable(),
  expensas: vine.boolean(),
  balcon: vine.boolean(),
  activo: vine.boolean(),
  lat: vine.number().min(-90).max(90).nullable(),
  lng: vine.number().min(-180).max(180).nullable(),
})

export const ofrecemosValidator = vine.create({
  descripcion: vine.string().trim().maxLength(600).nullable(),
  imagenCheck: vine.boolean(),
})

export const nuestroHorarioValidator = vine.create({
  descripcion: vine.string().trim().maxLength(255).nullable(),
  obs: vine.string().trim().maxLength(255).nullable(),
  obsCheck: vine.boolean(),
})

export const direccionContactoValidator = vine.create({
  descripcion: vine.string().trim().minLength(2).maxLength(255),
})
