/*
|--------------------------------------------------------------------------
| Generación de CSV para exportaciones del admin
|--------------------------------------------------------------------------
|
| Separador ";" y BOM UTF-8: es lo que Excel con configuración regional
| es-PY abre bien de un doble click (con "," mete todo en una columna).
|
*/

export type CeldaCsv = string | number | null | undefined

function escapar(valor: CeldaCsv): string {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  return /[";\n\r]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

/** Arma el contenido completo del archivo (BOM + encabezados + filas). */
export function construirCsv(encabezados: string[], filas: CeldaCsv[][]): string {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(escapar).join(';'))
  return '\ufeff' + lineas.join('\r\n')
}
