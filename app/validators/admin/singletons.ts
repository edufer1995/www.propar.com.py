/*
|--------------------------------------------------------------------------
| Validators de los singletons institucionales del admin
|--------------------------------------------------------------------------
|
| Todas las páginas comparten la misma forma: título + N párrafos. Los
| campos imagen NO van acá (llegan como upload id y los verifica el
| motor contra la spec).
|
*/

import vine from '@vinejs/vine'

const titulo = () => vine.string().trim().minLength(2).maxLength(150)
const parrafo = () => vine.string().trim().maxLength(2000).nullable()

export const quienesSomosValidator = vine.create({
  titulo: titulo(),
  parrafoUno: parrafo(),
  parrafoDos: parrafo(),
  parrafoTres: parrafo(),
  parrafoCuatro: parrafo(),
})

export const trayectoriaValidator = vine.create({
  titulo: titulo(),
  parrafoUno: parrafo(),
  parrafoDos: parrafo(),
  parrafoTres: parrafo(),
  parrafoCuatro: parrafo(),
  parrafoCinco: parrafo(),
  parrafoSeis: parrafo(),
})

export const misionValidator = vine.create({
  titulo: titulo(),
  parrafoUno: parrafo(),
})

export const visionValidator = vine.create({
  titulo: titulo(),
  parrafoUno: parrafo(),
})

export const productoValidator = vine.create({
  titulo: titulo(),
  parrafoUno: parrafo(),
})

export const parkingValidator = vine.create({
  titulo: titulo(),
  parrafoUno: parrafo(),
  parrafoDos: parrafo(),
  parrafoTres: parrafo(),
})

export const loteDistritoValidator = vine.create({
  distritoCodigo: vine.number().withoutDecimals().min(1),
})
