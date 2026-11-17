/*
|--------------------------------------------------------------------------
| Cruce de estados ERP ↔ catálogo de colores
|--------------------------------------------------------------------------
|
| El estado de un lote lo escribe Oracle y el color sale de `lotes_colores`
| (tabla nuestra). Comparar con === mandaba el lote a gris ante cualquier
| diferencia de formato. Estos casos fijan qué diferencias se toleran y,
| sobre todo, cuáles NO: dos estados distintos nunca deben emparejarse.
|
*/

import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'

import { claveEstado } from '#services/estados_lote'

test.group('Estados de lote — clave de comparación', () => {
  test('tolera el relleno de espacios del CHAR de Oracle', ({ assert }) => {
    assert.equal(claveEstado('LIBRE               '), claveEstado('LIBRE'))
    assert.equal(claveEstado('  VENDIDO'), claveEstado('VENDIDO'))
  })

  test('tolera diferencias de mayúsculas', ({ assert }) => {
    assert.equal(claveEstado('Libre'), claveEstado('LIBRE'))
    assert.equal(claveEstado('reserva de propietario'), claveEstado('RESERVA DE PROPIETARIO'))
  })

  test('tolera la pérdida de la ñ y de las tildes', ({ assert }) => {
    assert.equal(claveEstado('SENADO'), claveEstado('SEÑADO'))
  })

  test('tolera el espaciado alrededor de la barra', ({ assert }) => {
    assert.equal(claveEstado('LIBRE/MEJORAS'), claveEstado('LIBRE / MEJORAS'))
  })

  test('NO empareja estados que son realmente distintos', ({ assert }) => {
    assert.notEqual(claveEstado('VENDIDO'), claveEstado('LIBRE'))
    assert.notEqual(claveEstado('RESERVADO'), claveEstado('RECUPERADO'))
    assert.notEqual(claveEstado('EN DEMANDA'), claveEstado('EN DEMANDA JUDICIAL'))
  })

  test('todos los estados del catálogo dan claves únicas', async ({ assert }) => {
    const filas = await db.from('lotes_colores').select('estado')
    const claves = filas.map((f) => claveEstado(String(f.estado)))

    assert.isAbove(claves.length, 0)
    assert.lengthOf(
      new Set(claves),
      claves.length,
      'dos estados del catálogo colapsan en la misma clave: habría que afinar la normalización'
    )
  })
})
