import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/** Destino de los botones del pop-up y del slide. */
const URL_ABAS_GUARDA = '/abas-guarda'

const TITULO_PROMOCION = 'Abas Guarda: muy pronto en Ciudad del Este'
const TITULO_SLIDE = 'Tu espacio extra, a un paso del centro'
const DESCRIPCION =
  'Depósitos individuales de 3,5 a 7 m² en el centro de Ciudad del Este, con seguridad 24/7.'

/**
 * Carga el lanzamiento de Abas Guarda en el home (pedido de ABAS, 11/2026):
 *  - Promoción activa marcada como modal (el pop-up al entrar al sitio, y
 *    su card en el home) con el afiche.
 *  - Slide del carrusel de portada con el afiche sobre fondo difuminado
 *    (el carrusel exige imagen apaisada) y botón "Conocé más".
 * Ambos llevan a /abas-guarda. Las imágenes salen de public/img/abas-guarda
 * y pasan por el UploadService (mismas validaciones que el ABM).
 * Idempotente: si ya existe la promoción o el slide (por su enlace y
 * título), no lo vuelve a crear. Después se editan o retiran desde el panel.
 */
export default class AbasGuardaCargar extends BaseCommand {
  static commandName = 'abas-guarda:cargar'
  static description = 'Carga el pop-up (promoción modal) y el slide del carrusel de Abas Guarda'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { default: Promocion } = await import('#models/promocion')
    const { default: Carrusel } = await import('#models/carrusel')
    const { default: UploadService } = await import('#services/upload_service')
    const uploads = await this.app.container.make(UploadService)

    const imagen = (archivo: string) => ({
      rutaTemporal: this.app.publicPath(`img/abas-guarda/${archivo}`),
      nombreOriginal: archivo,
    })

    const promocion = await Promocion.query()
      .where('url', URL_ABAS_GUARDA)
      .where('titulo', TITULO_PROMOCION)
      .first()
    if (promocion) {
      this.logger.info(`La promoción ya existe (id ${promocion.id}): no se toca`)
    } else {
      const afiche = await uploads.guardar(imagen('afiche.webp'), 'cardLanzamiento')
      const nueva = await Promocion.create({
        titulo: TITULO_PROMOCION,
        descripcion: DESCRIPCION,
        url: URL_ABAS_GUARDA,
        activo: true,
        modal: true,
        imagenUploadId: afiche.id,
      })
      this.logger.success(`Promoción creada (id ${nueva.id}): se abre como pop-up en el home`)
    }

    const slide = await Carrusel.query()
      .where('url', URL_ABAS_GUARDA)
      .where('titulo', TITULO_SLIDE)
      .first()
    if (slide) {
      this.logger.info(`El slide ya existe (id ${slide.id}): no se toca`)
    } else {
      const foto = await uploads.guardar(imagen('slide-carrusel.jpg'), 'carrusel')
      const nuevo = await Carrusel.create({
        titulo: TITULO_SLIDE,
        subtitulo: 'Abas Guarda · Muy pronto',
        descripcion: DESCRIPCION,
        url: URL_ABAS_GUARDA,
        estado: 'A',
        imagenUploadId: foto.id,
      })
      this.logger.success(`Slide creado (id ${nuevo.id}): primero en el carrusel del home`)
    }
  }
}
