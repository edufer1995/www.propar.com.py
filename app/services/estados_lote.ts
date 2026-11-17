/*
|--------------------------------------------------------------------------
| Cruce de estados de lote: ERP (Oracle) ↔ catálogo de colores (PG)
|--------------------------------------------------------------------------
|
| El estado de un lote lo manda el ERP como texto libre (LOT_ESTADO) y el
| color con el que se pinta en el mapa sale de `lotes_colores`, que es una
| tabla nuestra. Son dos sistemas distintos escribiendo la misma palabra,
| y no siempre la escriben igual:
|
|  - Oracle devuelve CHAR con relleno: "LIBRE               ".
|  - Aparecen variantes de mayúsculas ("Libre" vs "LIBRE").
|  - Los sistemas viejos suelen perder la Ñ y las tildes: "SENADO" por
|    "SEÑADO".
|  - Cambia el espaciado alrededor de la barra: "LIBRE / MEJORAS" vs
|    "LIBRE/MEJORAS".
|
| Comparar con `===` (como hacía el sitio viejo) hace que cualquiera de
| esas diferencias mande el lote a gris "SIN DATOS" aunque el estado
| exista en el catálogo. `claveEstado` genera una clave tolerante a esas
| cuatro variaciones; el texto que se muestra sigue siendo el del
| catálogo, para que la leyenda y las cards digan todas lo mismo.
|
*/

/**
 * Clave de comparación de un estado. No sirve para mostrar: es solo para
 * emparejar el valor del ERP con la fila del catálogo.
 */
export function claveEstado(estado: string): string {
  return (
    estado
      .normalize('NFD')
      /* Saca tildes y la virgulilla de la ñ: SEÑADO y SENADO dan lo mismo. */
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      /* "LIBRE / MEJORAS" y "LIBRE/MEJORAS" son el mismo estado. */
      .replace(/\s*\/\s*/g, '/')
      /* Relleno de Oracle y espacios dobles. */
      .replace(/\s+/g, ' ')
      .trim()
  )
}
