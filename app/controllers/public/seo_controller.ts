import type { HttpContext } from '@adonisjs/core/http'

/**
 * Rutas públicas del sitio para el sitemap. Única fuente: si se agrega una
 * página pública nueva, sumarla acá.
 */
const RUTAS_PUBLICAS = [
  '/',
  '/quienes-somos',
  '/loteamientos',
  '/parking',
  '/abas-guarda',
  '/contacto',
]

/**
 * SEO técnico (Etapa 6): robots.txt y sitemap.xml servidos por rutas.
 * El admin (/app) y el auth (/auth) quedan fuera del índice.
 */
export default class SeoController {
  robots({ request, response }: HttpContext) {
    const origen = `${request.protocol()}://${request.host()}`
    const cuerpo = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /app',
      'Disallow: /auth',
      'Disallow: /api',
      '',
      `Sitemap: ${origen}/sitemap.xml`,
      '',
    ].join('\n')

    return response.type('text/plain').send(cuerpo)
  }

  sitemap({ request, response }: HttpContext) {
    const origen = `${request.protocol()}://${request.host()}`
    const urls = RUTAS_PUBLICAS.map(
      (ruta) => `  <url><loc>${origen}${ruta === '/' ? '/' : ruta}</loc></url>`
    ).join('\n')

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urls,
      '</urlset>',
      '',
    ].join('\n')

    return response.type('application/xml').send(xml)
  }
}
