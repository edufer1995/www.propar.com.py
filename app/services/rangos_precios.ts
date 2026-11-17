/*
|--------------------------------------------------------------------------
| Rangos de precio de cuota (buscador del home y filtro de alquileres)
|--------------------------------------------------------------------------
|
| Derivado 1:1 de la constante RANGO_PRECIOS del sitio viejo
| (app/Controller/utils/src/other.ts). Los límites son inclusive y en Gs.
| El valor "0" del viejo (todo el universo) equivale a no filtrar.
|
*/

export interface RangoPrecio {
  desde: number
  hasta: number
}

export const RANGO_PRECIOS: Record<string, RangoPrecio> = {
  '1': { desde: 1, hasta: 199_999 },
  '2': { desde: 300_000, hasta: 499_999 },
  '3': { desde: 500_000, hasta: 699_999 },
  '4': { desde: 700_000, hasta: 899_999 },
  '5': { desde: 900_000, hasta: 999_999 },
  '6': { desde: 1_000_000, hasta: 9_999_999 },
}

/** Opciones para selects del frontend (mismos textos que el sitio viejo). */
export const RANGOS_CUOTA_OPCIONES = [
  { valor: '1', etiqueta: 'Menor a 200.000 Gs' },
  { valor: '2', etiqueta: 'De 300.000 Gs a 499.999 Gs' },
  { valor: '3', etiqueta: 'De 500.000 Gs a 699.999 Gs' },
  { valor: '4', etiqueta: 'De 700.000 Gs a 899.999 Gs' },
  { valor: '5', etiqueta: 'De 900.000 Gs a 999.999 Gs' },
  { valor: '6', etiqueta: 'Mayor a 1.000.000 Gs' },
] as const

export function rangoPrecio(valor: string | undefined | null): RangoPrecio | null {
  if (!valor) return null
  return RANGO_PRECIOS[valor] ?? null
}
