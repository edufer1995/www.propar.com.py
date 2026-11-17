import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

/**
 * Copia los archivos físicos de uploads del sitio viejo hacia UPLOADS_PATH.
 *
 * El sitio viejo guardaba cada archivo como `<upload_id>.png` en un
 * directorio `uploads/` hermano del proyecto. Este comando usa el mapeo
 * etl_id_map (tabla='uploads') generado por `etl:import` para copiar cada
 * `<id_viejo>.png` como `<id_nuevo>.png`, completa mime/size y reporta los
 * faltantes sin abortar.
 */
export default class UploadsMigrate extends BaseCommand {
  static commandName = 'uploads:migrate'
  static description = 'Copia los archivos físicos de uploads del sitio viejo al nuevo'
  static options: CommandOptions = { startApp: true }

  @flags.string({
    description: 'Directorio con los archivos viejos (<upload_id>.png)',
  })
  declare source?: string

  /** candidatos conocidos donde puede estar el directorio de uploads viejo */
  private candidatos = [
    '/home/edufer95/Documents/80001831-1 | Elias A Saba S.A. Inmobiliaria/Web/uploads',
    '/home/edufer95/Documents/80001831-1 | Elias A Saba S.A. Inmobiliaria/Web/www.abas.com.py/uploads',
  ]

  async run() {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const { default: env } = await import('#start/env')

    const origen = this.source ?? this.candidatos.find((c) => existsSync(c))
    if (!origen || !existsSync(origen)) {
      this.logger.error(
        'No se encontró el directorio de uploads viejo. Pasá --source=<dir> cuando tengas los archivos de producción.'
      )
      this.logger.info(`Rutas probadas: ${this.candidatos.join(' | ')}`)
      await db.manager.closeAll()
      this.exitCode = 1
      return
    }

    const destino = resolve(env.get('UPLOADS_PATH', './storage/uploads'))
    await mkdir(destino, { recursive: true })

    const mapeos = await db
      .from('etl_id_map')
      .where('tabla', 'uploads')
      .select('id_viejo', 'id_nuevo')
      .orderBy('id_viejo')

    if (mapeos.length === 0) {
      this.logger.warning('etl_id_map no tiene mapeos de uploads. ¿Corriste `node ace etl:import`?')
    }

    let copiados = 0
    const faltantes: number[] = []

    for (const mapeo of mapeos) {
      const rutaVieja = join(origen, `${mapeo.id_viejo}.png`)
      if (!existsSync(rutaVieja)) {
        faltantes.push(mapeo.id_viejo)
        continue
      }
      const rutaNueva = join(destino, `${mapeo.id_nuevo}.png`)
      await copyFile(rutaVieja, rutaNueva)
      const info = await stat(rutaNueva)
      await db
        .from('uploads')
        .where('id', mapeo.id_nuevo)
        .update({
          mime: 'image/png',
          size: info.size,
          original_name: `${mapeo.id_viejo}.png`,
        })
      copiados++
    }

    this.logger.info(`Archivos copiados: ${copiados}/${mapeos.length} (origen: ${origen})`)
    if (faltantes.length > 0) {
      this.logger.warning(
        `Faltantes en el origen (${faltantes.length}): ids viejos ${faltantes.slice(0, 30).join(', ')}${faltantes.length > 30 ? '…' : ''}`
      )
    }

    await db.manager.closeAll()
  }
}
