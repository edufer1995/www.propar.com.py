/**
 * Categorías de las preguntas frecuentes (slugs estables: se guardan en la
 * tabla y arman los filtros de /preguntas-frecuentes).
 */
export const CATEGORIAS_PREGUNTA = ['tramites', 'cuotas', 'titulos', 'general'] as const

export type CategoriaPregunta = (typeof CATEGORIAS_PREGUNTA)[number]

export const CATEGORIA_ETIQUETAS: Record<CategoriaPregunta, string> = {
  tramites: 'Trámites',
  cuotas: 'Cuotas y pagos',
  titulos: 'Títulos',
  general: 'General',
}
