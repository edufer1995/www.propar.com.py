import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { randomBytes } from 'node:crypto'

/**
 * ETL de migración: abas_staging (dump del sitio viejo) → abas_v2.
 *
 * Idempotente: trunca las tablas de negocio y re-importa todo desde la
 * conexión "staging" (solo SELECT sobre staging). Las filas inválidas se
 * registran en etl_rechazos sin abortar; los ids viejos quedan mapeados en
 * etl_id_map. Al final ajusta las secuencias y imprime un resumen.
 */
export default class EtlImport extends BaseCommand {
  static commandName = 'etl:import'
  static description = 'Importa los datos del dump viejo (abas_staging) hacia abas_v2'
  static options: CommandOptions = { startApp: true }

  /** contadores para el resumen final */
  private resumen: Record<string, { staging: number; importadas: number; rechazos: number }> = {}
  private db!: Awaited<typeof import('@adonisjs/lucid/services/db')>['default']

  /** mapa link de upload → id nuevo */
  private uploadPorLink = new Map<string, number>()
  /** mapa id viejo de upload → id nuevo */
  private uploadPorIdViejo = new Map<number, number>()

  async run() {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    this.db = db

    this.logger.info('Iniciando importación desde abas_staging…')

    await this.preservarMediosFracciones()
    await this.limpiar()

    await this.importarRoles()
    await this.importarUsers()
    await this.importarUploads()
    await this.importarFracciones()
    await this.restaurarMediosFracciones()
    await this.aplicarFotosDeLanzamientos()
    await this.importarManzanas()
    await this.importarLotes()
    await this.importarLotesColores()
    await this.importarLotesDistritos()
    await this.importarAlquileres()
    await this.importarCarruseles()
    await this.importarUltimosLanzamientos()
    await this.importarProximosDesarrollos()
    await this.importarQuienesSomos()
    await this.importarMision()
    await this.importarVision()
    await this.importarProducto()
    await this.importarTrayectoria()
    await this.importarParking()
    await this.importarOfrecemos()
    await this.importarNuestrosHorarios()
    await this.importarDireccionContacto()
    await this.importarSucursales()

    await this.ajustarSecuencias()
    await this.imprimirResumen()

    await db.manager.closeAll()
  }

  /* ------------------------------------------------------------------ */
  /* Utilitarios                                                         */
  /* ------------------------------------------------------------------ */

  private staging() {
    return this.db.connection('staging')
  }

  /* ------------------------------------------------------------------ */
  /* Medios de fracciones (cargados por el admin, NO vienen del staging) */
  /* ------------------------------------------------------------------ */

  /** Arrays de medios por código de fracción + filas de uploads referidas. */
  private mediosPorCodigo = new Map<number, { imagenes: number[]; videos: number[] }>()
  private uploadsDeMedios: Record<string, unknown>[] = []

  /**
   * Los medios de fracciones se cargan desde el admin y no existen en el
   * dump viejo: si no se preservan, cada re-importación los pisaría.
   * Se capturan los arrays y las filas de uploads referenciadas ANTES del
   * truncado (los archivos físicos en UPLOADS_PATH no se tocan).
   */
  private async preservarMediosFracciones() {
    try {
      const filas = await this.db.from('fracciones').select('codigo', 'imagenes', 'videos')
      const uploadIds = new Set<number>()
      for (const fila of filas) {
        const imagenes: number[] = Array.isArray(fila.imagenes) ? fila.imagenes : []
        const videos: number[] = Array.isArray(fila.videos) ? fila.videos : []
        if (imagenes.length === 0 && videos.length === 0) continue
        this.mediosPorCodigo.set(fila.codigo, { imagenes, videos })
        for (const id of [...imagenes, ...videos]) uploadIds.add(id)
      }
      if (uploadIds.size) {
        this.uploadsDeMedios = await this.db.from('uploads').whereIn('id', [...uploadIds])
      }
    } catch {
      /* Primera corrida sin las columnas de medios: nada que preservar. */
    }
  }

  /**
   * Re-inserta los uploads del admin (con su id original: el archivo
   * físico se llama <id>.<ext>) y re-aplica los arrays de medios a las
   * fracciones re-importadas. Si un id chocara con los del staging o la
   * fracción ya no existiera, se descarta con aviso.
   */
  private async restaurarMediosFracciones() {
    if (this.mediosPorCodigo.size === 0) return

    const perdidos = new Set<number>()
    for (const upload of this.uploadsDeMedios) {
      const id = Number(upload.id)
      const existente = await this.db.from('uploads').where('id', id).first()
      if (existente) {
        perdidos.add(id)
        this.logger.warning(`upload ${id} de medios choca con uno del staging: se descarta`)
        continue
      }
      await this.db.table('uploads').insert(upload)
    }

    const filasFracciones = await this.db.from('fracciones').select('codigo')
    const codigos = new Set(filasFracciones.map((f) => Number(f.codigo)))
    let restauradas = 0
    for (const [codigo, medios] of this.mediosPorCodigo) {
      if (!codigos.has(codigo)) {
        this.logger.warning(`fracción ${codigo} con medios ya no existe: se descartan`)
        continue
      }
      await this.db
        .from('fracciones')
        .where('codigo', codigo)
        .update({
          imagenes: JSON.stringify(medios.imagenes.filter((id) => !perdidos.has(id))),
          videos: JSON.stringify(medios.videos.filter((id) => !perdidos.has(id))),
        })
      restauradas++
    }
    this.logger.info(`medios preservados en ${restauradas} fracciones`)
  }

  /**
   * Las fotos de "últimos lanzamientos" son la única relación
   * fracción→imagen que existía en el sitio viejo: se agregan a la
   * galería (fracciones.imagenes) para que el mapa muestre portada y
   * lightbox. Se leen las filas crudas del staging (todas las
   * generaciones del dump sin PK, a pedido del cliente) y se resuelve
   * cada upload por link. Solo AGREGA ids que falten — nunca pisa lo
   * cargado por el admin ni lo restaurado arriba.
   */
  private async aplicarFotosDeLanzamientos() {
    const filas = await this.staging()
      .from('ultimos_lanzamientos')
      .whereNotNull('ultimo_lanzamiento_img_url')
      .select('ultimo_lanzamiento_fraccion_numero', 'ultimo_lanzamiento_img_url', 'created_at')
      .orderBy('created_at', 'asc')

    let agregadas = 0
    for (const fila of filas) {
      const codigo = this.int(fila.ultimo_lanzamiento_fraccion_numero)
      const partes = String(fila.ultimo_lanzamiento_img_url).split('/api/file/public/')
      const link = partes.length > 1 ? partes[partes.length - 1] : null
      if (!codigo || !link) continue

      const upload = await this.db.from('uploads').where('link', link).first()
      if (!upload) continue

      const actualizadas = await this.db
        .from('fracciones')
        .where('codigo', codigo)
        .whereRaw('not (imagenes @> to_jsonb(?::int))', [upload.id])
        .update({ imagenes: this.db.raw('imagenes || to_jsonb(?::int)', [upload.id]) })
      agregadas += Number(actualizadas) || 0
    }
    this.logger.info(`fotos de lanzamientos agregadas a galerías de fracciones: ${agregadas}`)
  }

  private async limpiar() {
    const tablas = [
      'etl_rechazos',
      'etl_id_map',
      'password_reset_tokens',
      'leads',
      'promociones',
      'redes_sociales',
      'sucursales',
      'direccion_contacto',
      'nuestros_horarios',
      'ofrecemos',
      'parking',
      'trayectoria',
      'producto',
      'vision',
      'mision',
      'quienes_somos',
      'proximos_desarrollos',
      'ultimos_lanzamientos',
      'carruseles',
      'alquileres',
      'lotes_distritos',
      'lotes_colores',
      'lotes',
      'manzanas',
      'fracciones',
      'uploads',
      'users',
      'roles',
      'usuarios_app',
    ]
    await this.db.rawQuery(
      `TRUNCATE ${tablas.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`
    )
    this.logger.info('Tablas de destino truncadas')
  }

  private async rechazar(tabla: string, pkOriginal: unknown, motivo: string, payload: unknown) {
    this.resumen[tabla] ??= { staging: 0, importadas: 0, rechazos: 0 }
    this.resumen[tabla].rechazos++
    await this.db.table('etl_rechazos').insert({
      tabla,
      pk_original: pkOriginal === null || pkOriginal === undefined ? null : String(pkOriginal),
      motivo,
      payload: JSON.stringify(payload ?? null),
      created_at: new Date(),
    })
  }

  private contar(tabla: string, staging: number) {
    this.resumen[tabla] ??= { staging: 0, importadas: 0, rechazos: 0 }
    this.resumen[tabla].staging = staging
  }

  private importada(tabla: string, cantidad = 1) {
    this.resumen[tabla] ??= { staging: 0, importadas: 0, rechazos: 0 }
    this.resumen[tabla].importadas += cantidad
  }

  private fechas(fila: { created_at?: Date | null; updated_at?: Date | null }) {
    return {
      created_at: fila.created_at ?? new Date(),
      updated_at: fila.updated_at ?? fila.created_at ?? new Date(),
    }
  }

  private async mapear(tabla: string, idViejo: number, idNuevo: number) {
    await this.db.table('etl_id_map').insert({
      tabla,
      id_viejo: idViejo,
      id_nuevo: idNuevo,
      created_at: new Date(),
    })
  }

  /** número finito o null */
  private num(valor: unknown): number | null {
    if (valor === null || valor === undefined || valor === '') return null
    const n = Number(valor)
    return Number.isFinite(n) ? n : null
  }

  /** entero o null */
  private int(valor: unknown): number | null {
    const n = this.num(valor)
    return n === null ? null : Math.trunc(n)
  }

  private latLngValido(punto: { lat: number; lng: number } | null) {
    return (
      punto !== null &&
      Number.isFinite(punto.lat) &&
      Number.isFinite(punto.lng) &&
      Math.abs(punto.lat) <= 90 &&
      Math.abs(punto.lng) <= 180
    )
  }

  /**
   * Parsea un centro con formato del dump viejo:
   * '{"lng":"-57.43981563","lat":"-25.31914137"}' (valores string o número).
   * Devuelve {lat, lng} numérico o null si no es parseable.
   */
  private parseCentro(texto: string | null): { lat: number; lng: number } | null {
    if (!texto) return null
    try {
      const crudo = JSON.parse(texto)
      if (typeof crudo !== 'object' || crudo === null) return null
      const punto = { lat: Number(crudo.lat), lng: Number(crudo.lng) }
      return this.latLngValido(punto) ? punto : null
    } catch {
      return null
    }
  }

  /**
   * Parsea los lados a un anillo normalizado [[{lat,lng}, …]].
   *
   * Formatos reales del dump:
   * - '[]' (sin lados)
   * - lotes:      '[{"lng":"-57.44","lat":"-25.32"}, …]'          → puntos escalares
   * - fracciones/manzanas: '[{"lng":[-57.33,-25.52],"lat":[-57.33,-25.52,0]}, …]'
   *   donde cada clave contiene un PAR [lng, lat] (a veces con altitud KML 0);
   *   cada item aporta dos vértices del polígono.
   * Devuelve null si no es parseable.
   */
  private parseLados(texto: string | null): Array<Array<{ lat: number; lng: number }>> | null {
    if (!texto) return null
    try {
      const crudo = JSON.parse(texto)
      if (!Array.isArray(crudo)) return null
      if (crudo.length === 0) return []

      const anillo: Array<{ lat: number; lng: number }> = []
      for (const item of crudo) {
        if (typeof item !== 'object' || item === null) return null

        if (Array.isArray(item.lng) || Array.isArray(item.lat)) {
          // formato "segmento": cada clave es un par [lng, lat, (alt)]
          for (const par of [item.lng, item.lat]) {
            if (!Array.isArray(par) || par.length < 2) return null
            const punto = { lng: Number(par[0]), lat: Number(par[1]) }
            if (!this.latLngValido(punto)) return null
            anillo.push(punto)
          }
        } else {
          // formato "punto": lat/lng escalares
          const punto = { lat: Number(item.lat), lng: Number(item.lng) }
          if (!this.latLngValido(punto)) return null
          anillo.push(punto)
        }
      }
      return [anillo]
    } catch {
      return null
    }
  }

  /**
   * Extrae el link de un *_img_url del dump viejo. Formatos:
   * '/api/file/public/<link>' o 'https://admin.abas.com.py/api/file/public/<link>'.
   */
  private extraerLink(url: string | null): string | null {
    if (!url) return null
    const match = url.match(/\/api\/file\/public\/([0-9a-fA-F]+)/)
    return match ? match[1] : null
  }

  /**
   * Resuelve un *_img_url a un upload id nuevo. Si no matchea o el link no
   * existe en uploads, registra un rechazo de campo y devuelve null.
   */
  private async resolverImagen(
    tabla: string,
    pkOriginal: unknown,
    campo: string,
    url: string | null
  ): Promise<number | null> {
    if (!url || url.trim() === '') return null
    const link = this.extraerLink(url)
    if (!link) {
      await this.rechazar(tabla, pkOriginal, `campo ${campo}: URL de imagen no reconocida`, { url })
      return null
    }
    const id = this.uploadPorLink.get(link)
    if (!id) {
      await this.rechazar(tabla, pkOriginal, `campo ${campo}: link sin fila en uploads`, {
        url,
        link,
      })
      return null
    }
    return id
  }

  /* ------------------------------------------------------------------ */
  /* Tablas base                                                         */
  /* ------------------------------------------------------------------ */

  private async importarRoles() {
    const filas = await this.staging()
      .from('roles')
      .select('rol_id', 'rol_descripcion', 'rol_nivel')
      .orderBy('rol_id')
    this.contar('roles', filas.length)

    for (const fila of filas) {
      const nivel = this.int(fila.rol_nivel)
      if (!fila.rol_descripcion || nivel === null) {
        await this.rechazar('roles', fila.rol_id, 'descripcion o nivel inválido', fila)
        continue
      }
      // se preserva el id original (users.rol_id se importa tal cual)
      await this.db.table('roles').insert({
        id: fila.rol_id,
        descripcion: fila.rol_descripcion,
        nivel,
        created_at: new Date(),
        updated_at: new Date(),
      })
      await this.mapear('roles', fila.rol_id, fila.rol_id)
      this.importada('roles')
    }
    this.logger.info('roles importados')
  }

  private async importarUsers() {
    const { default: hash } = await import('@adonisjs/core/services/hash')

    const filas = await this.staging()
      .from('usuarios as u')
      .leftJoin('personas as p', 'p.persona_id', 'u.persona_id')
      .select(
        'u.usuario_id',
        'u.usuario_username',
        'u.usuario_password',
        'u.rol_id',
        'u.estado_general_id',
        'u.created_at',
        'u.updated_at',
        'p.persona_descripcion'
      )
      .orderBy('u.usuario_id')
    this.contar('users', filas.length)

    for (const fila of filas) {
      if (!fila.usuario_username || !fila.usuario_password || !fila.rol_id) {
        await this.rechazar('users', fila.usuario_id, 'username, password o rol faltante', {
          usuario_id: fila.usuario_id,
          usuario_username: fila.usuario_username,
        })
        continue
      }
      // el password plano del dump se hashea acá (scrypt de Adonis) y nunca se persiste en claro
      const password = await hash.make(fila.usuario_password)
      const [insertada] = await this.db
        .table('users')
        .insert({
          username: fila.usuario_username,
          email: null,
          nombre: fila.persona_descripcion ?? null,
          password,
          rol_id: fila.rol_id,
          activo: fila.estado_general_id === 1,
          ...this.fechas(fila),
        })
        .returning('id')
      await this.mapear('usuarios', fila.usuario_id, insertada.id)
      this.importada('users')
    }
    this.logger.info('users importados (passwords hasheados con scrypt)')
  }

  private async importarUploads() {
    const filas = await this.staging()
      .from('uploads')
      .select('upload_id', 'upload_link', 'created_at', 'updated_at')
      .orderBy('upload_id')
    this.contar('uploads', filas.length)

    for (const fila of filas) {
      let link: string | null = fila.upload_link ?? null
      if (!link) {
        await this.rechazar('uploads', fila.upload_id, 'upload_link vacío', fila)
        continue
      }
      if (this.uploadPorLink.has(link)) {
        // link duplicado en el dump: se regenera para preservar la fila
        const nuevoLink = randomBytes(50).toString('hex')
        await this.rechazar(
          'uploads',
          fila.upload_id,
          'campo link: duplicado, se regeneró uno nuevo',
          { link_original: link }
        )
        link = nuevoLink
      }
      const [insertada] = await this.db
        .table('uploads')
        .insert({
          link,
          mime: null,
          size: null,
          original_name: null,
          ...this.fechas(fila),
        })
        .returning('id')
      this.uploadPorLink.set(link, insertada.id)
      this.uploadPorIdViejo.set(fila.upload_id, insertada.id)
      await this.mapear('uploads', fila.upload_id, insertada.id)
      this.importada('uploads')
    }
    this.logger.info('uploads importados')
  }

  /* ------------------------------------------------------------------ */
  /* Cartografía                                                         */
  /* ------------------------------------------------------------------ */

  private async importarFracciones() {
    const filas = await this.staging().from('fracciones').select('*').orderBy('fraccion_id')
    this.contar('fracciones', filas.length)

    // dedupe por codigo: gana estado 'A', luego la más nueva
    const porCodigo = new Map<number, any>()
    for (const fila of filas) {
      const codigo = this.int(fila.fraccion_codigo)
      if (codigo === null) {
        await this.rechazar('fracciones', fila.fraccion_id, 'fraccion_codigo nulo', fila)
        continue
      }
      const actual = porCodigo.get(codigo)
      if (!actual) {
        porCodigo.set(codigo, fila)
        continue
      }
      const gana =
        (fila.fraccion_estado === 'A' ? 1 : 0) - (actual.fraccion_estado === 'A' ? 1 : 0) ||
        (fila.created_at?.getTime?.() ?? 0) - (actual.created_at?.getTime?.() ?? 0) ||
        fila.fraccion_id - actual.fraccion_id
      const perdedora = gana > 0 ? actual : fila
      if (gana > 0) porCodigo.set(codigo, fila)
      await this.rechazar(
        'fracciones',
        perdedora.fraccion_id,
        `codigo ${codigo} duplicado: se conserva la versión más reciente/activa`,
        { fraccion_id: perdedora.fraccion_id, estado: perdedora.fraccion_estado }
      )
    }

    for (const [codigo, fila] of [...porCodigo.entries()].sort((a, b) => a[0] - b[0])) {
      const centro = this.parseCentro(fila.fraccion_coorde_centro)
      if (!centro) {
        await this.rechazar('fracciones', fila.fraccion_id, 'coorde_centro no parseable', {
          coorde_centro: fila.fraccion_coorde_centro,
        })
        continue
      }
      let lados = this.parseLados(fila.fraccion_coorde_lados)
      if (lados === null) {
        await this.rechazar(
          'fracciones',
          fila.fraccion_id,
          'campo coorde_lados no parseable: se importó con lados vacíos',
          { coorde_lados: fila.fraccion_coorde_lados }
        )
        lados = []
      }
      const [insertada] = await this.db
        .table('fracciones')
        .insert({
          codigo,
          descripcion: fila.fraccion_descripcion ?? null,
          coorde_centro: JSON.stringify(centro),
          coorde_lados: JSON.stringify(lados),
          observacion: fila.fraccion_observacion ?? null,
          estado: fila.fraccion_estado ?? null,
          ...this.fechas(fila),
        })
        .returning('id')
      await this.mapear('fracciones', fila.fraccion_id, insertada.id)
      this.importada('fracciones')
    }
    this.logger.info('fracciones importadas')
  }

  private async importarManzanas() {
    const filas = await this.staging().from('manzanas').select('*').orderBy('manzana_id')
    this.contar('manzanas', filas.length)

    const fraccionPorCodigo = new Map<number, number>()
    for (const f of await this.db.from('fracciones').select('id', 'codigo')) {
      fraccionPorCodigo.set(f.codigo, f.id)
    }

    // dedupe por (fraccion_codigo, codigo): gana la más nueva
    const porClave = new Map<string, any>()
    for (const fila of filas) {
      const fraccionCodigo = this.int(fila.fraccion_codigo)
      const codigo = this.int(fila.manzana_codigo)
      if (fraccionCodigo === null || codigo === null) {
        await this.rechazar(
          'manzanas',
          fila.manzana_id,
          'fraccion_codigo o manzana_codigo nulo',
          fila
        )
        continue
      }
      const clave = `${fraccionCodigo}:${codigo}`
      const actual = porClave.get(clave)
      if (!actual) {
        porClave.set(clave, fila)
        continue
      }
      const gana =
        (fila.created_at?.getTime?.() ?? 0) - (actual.created_at?.getTime?.() ?? 0) ||
        fila.manzana_id - actual.manzana_id
      const perdedora = gana > 0 ? actual : fila
      if (gana > 0) porClave.set(clave, fila)
      await this.rechazar(
        'manzanas',
        perdedora.manzana_id,
        `manzana duplicada en fracción ${fraccionCodigo} código ${codigo}: se conserva la más reciente`,
        { manzana_id: perdedora.manzana_id }
      )
    }

    for (const fila of porClave.values()) {
      const fraccionCodigo = this.int(fila.fraccion_codigo)!
      const codigo = this.int(fila.manzana_codigo)!
      const fraccionId = fraccionPorCodigo.get(fraccionCodigo)
      if (!fraccionId) {
        await this.rechazar(
          'manzanas',
          fila.manzana_id,
          `huérfana: no existe fracción con código ${fraccionCodigo}`,
          { fraccion_codigo: fraccionCodigo, manzana_codigo: codigo }
        )
        continue
      }
      const centro = this.parseCentro(fila.manzana_coorde_centro)
      if (!centro) {
        await this.rechazar('manzanas', fila.manzana_id, 'coorde_centro no parseable', {
          coorde_centro: fila.manzana_coorde_centro,
        })
        continue
      }
      let lados = this.parseLados(fila.manzana_coorde_lados)
      if (lados === null) {
        await this.rechazar(
          'manzanas',
          fila.manzana_id,
          'campo coorde_lados no parseable: se importó con lados vacíos',
          { coorde_lados: fila.manzana_coorde_lados }
        )
        lados = []
      }
      const [insertada] = await this.db
        .table('manzanas')
        .insert({
          fraccion_id: fraccionId,
          codigo,
          coorde_centro: JSON.stringify(centro),
          coorde_lados: JSON.stringify(lados),
          observacion: fila.manzana_observacion ?? null,
          ...this.fechas(fila),
        })
        .returning('id')
      await this.mapear('manzanas', fila.manzana_id, insertada.id)
      this.importada('manzanas')
    }
    this.logger.info('manzanas importadas')
  }

  private async importarLotes() {
    const filas = await this.staging().from('lotes').select('*').orderBy('lote_id')
    this.contar('lotes', filas.length)

    const manzanaPorClave = new Map<string, number>()
    const manzanas = await this.db
      .from('manzanas as m')
      .join('fracciones as f', 'f.id', 'm.fraccion_id')
      .select('m.id', 'm.codigo as manzana_codigo', 'f.codigo as fraccion_codigo')
    for (const m of manzanas) {
      manzanaPorClave.set(`${m.fraccion_codigo}:${m.manzana_codigo}`, m.id)
    }

    // dedupe por (fraccion, manzana, lote): gana la más nueva (re-importaciones del plano)
    const porClave = new Map<string, any>()
    for (const fila of filas) {
      const f = this.int(fila.fraccion_codigo)
      const m = this.int(fila.manzana_codigo)
      const c = this.int(fila.lote_codigo)
      if (f === null || m === null || c === null) {
        await this.rechazar('lotes', fila.lote_id, 'códigos de fracción/manzana/lote nulos', {
          fraccion_codigo: fila.fraccion_codigo,
          manzana_codigo: fila.manzana_codigo,
          lote_codigo: fila.lote_codigo,
        })
        continue
      }
      const clave = `${f}:${m}:${c}`
      const actual = porClave.get(clave)
      if (!actual) {
        porClave.set(clave, fila)
        continue
      }
      const gana =
        (fila.created_at?.getTime?.() ?? 0) - (actual.created_at?.getTime?.() ?? 0) ||
        fila.lote_id - actual.lote_id
      const perdedora = gana > 0 ? actual : fila
      if (gana > 0) porClave.set(clave, fila)
      await this.rechazar(
        'lotes',
        perdedora.lote_id,
        `lote duplicado ${clave}: se conserva la importación más reciente`,
        { lote_id: perdedora.lote_id }
      )
    }

    // inserción por lotes de 500 filas
    const pendientes: Array<{ filaVieja: any; datos: Record<string, unknown> }> = []
    for (const fila of porClave.values()) {
      const f = this.int(fila.fraccion_codigo)!
      const m = this.int(fila.manzana_codigo)!
      const c = this.int(fila.lote_codigo)!
      const manzanaId = manzanaPorClave.get(`${f}:${m}`)
      if (!manzanaId) {
        await this.rechazar(
          'lotes',
          fila.lote_id,
          `huérfano: no existe manzana ${m} en fracción ${f}`,
          { fraccion_codigo: f, manzana_codigo: m, lote_codigo: c }
        )
        continue
      }
      const centro = this.parseCentro(fila.lote_coorde_centro)
      if (!centro) {
        await this.rechazar('lotes', fila.lote_id, 'coorde_centro no parseable', {
          coorde_centro: fila.lote_coorde_centro,
        })
        continue
      }
      let lados = this.parseLados(fila.lote_coorde_lados)
      if (lados === null) {
        await this.rechazar(
          'lotes',
          fila.lote_id,
          'campo coorde_lados no parseable: se importó con lados vacíos',
          { coorde_lados: fila.lote_coorde_lados }
        )
        lados = []
      }
      pendientes.push({
        filaVieja: fila,
        datos: {
          manzana_id: manzanaId,
          fraccion_codigo: f,
          manzana_codigo: m,
          codigo: c,
          coorde_centro: JSON.stringify(centro),
          coorde_lados: JSON.stringify(lados),
          observacion: fila.lote_observacion ?? null,
          ...this.fechas(fila),
        },
      })
    }

    for (let i = 0; i < pendientes.length; i += 500) {
      const bloque = pendientes.slice(i, i + 500)
      const insertadas = await this.db
        .table('lotes')
        .multiInsert(bloque.map((p) => p.datos))
        .returning('id')
      const mapeos = bloque.map((p, j) => ({
        tabla: 'lotes',
        id_viejo: p.filaVieja.lote_id,
        id_nuevo: insertadas[j].id,
        created_at: new Date(),
      }))
      await this.db.table('etl_id_map').multiInsert(mapeos)
      this.importada('lotes', bloque.length)
    }
    this.logger.info('lotes importados')
  }

  private async importarLotesColores() {
    const filas = await this.staging().from('lotes_colores').select('*').orderBy('lote_color_id')
    this.contar('lotes_colores', filas.length)

    const vistos = new Set<string>()
    for (const fila of filas) {
      /* Se recorta como el color: un estado con espacios de sobra no
         emparejaría nunca con el que manda el ERP. */
      const estado = String(fila.lote_color_descripcion ?? '').trim()
      const color = (fila.lote_color_codigo ?? '').trim()
      if (!estado || vistos.has(estado)) {
        await this.rechazar('lotes_colores', fila.lote_color_id, 'estado vacío o duplicado', fila)
        continue
      }
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
        await this.rechazar('lotes_colores', fila.lote_color_id, 'color con formato inválido', fila)
        continue
      }
      vistos.add(estado)
      const [insertada] = await this.db
        .table('lotes_colores')
        .insert({
          estado,
          color,
          descripcion: null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('id')
      await this.mapear('lotes_colores', fila.lote_color_id, insertada.id)
      this.importada('lotes_colores')
    }
    this.logger.info('lotes_colores importados')
  }

  private async importarLotesDistritos() {
    /**
     * La tabla vieja está corrupta: tiene columnas duplicadas
     * (lotes_distrito_image y lote_distrito_image). Se toma por fila la
     * columna poblada y lote_distrito_id como código de distrito.
     */
    const filas = await this.staging()
      .from('lotes_distritos')
      .select('*')
      .orderBy('lote_distrito_id')
    this.contar('lotes_distritos', filas.length)

    const vistos = new Set<number>()
    for (const fila of filas) {
      const codigo = this.int(fila.lote_distrito_id) ?? this.int(fila.lotes_distrito_id)
      if (codigo === null || vistos.has(codigo)) {
        await this.rechazar(
          'lotes_distritos',
          fila.lote_distrito_id,
          'distrito_codigo nulo o duplicado',
          fila
        )
        continue
      }
      vistos.add(codigo)
      const url = fila.lote_distrito_image?.trim() || fila.lotes_distrito_image?.trim() || null
      const imagenUploadId = await this.resolverImagen(
        'lotes_distritos',
        fila.lote_distrito_id,
        'imagen',
        url
      )
      await this.db.table('lotes_distritos').insert({
        distrito_codigo: codigo,
        imagen_upload_id: imagenUploadId,
        ...this.fechas(fila),
      })
      this.importada('lotes_distritos')
    }
    this.logger.info('lotes_distritos importados')
  }

  /* ------------------------------------------------------------------ */
  /* Alquileres                                                          */
  /* ------------------------------------------------------------------ */

  private async importarAlquileres() {
    const filas = await this.staging().from('alquileres').select('*')
    this.contar('alquileres', filas.length)

    // el dump no tiene PK: hay ids duplicados con filas casi idénticas;
    // se conserva una por id (preferencia: la que tiene imágenes cargadas)
    const porId = new Map<number, any>()
    for (const fila of filas) {
      const actual = porId.get(fila.alquiler_id)
      if (!actual) {
        porId.set(fila.alquiler_id, fila)
        continue
      }
      const gana = (fila.alquiler_imagen?.trim() ? 1 : 0) - (actual.alquiler_imagen?.trim() ? 1 : 0)
      const perdedora = gana > 0 ? actual : fila
      if (gana > 0) porId.set(fila.alquiler_id, fila)
      await this.rechazar(
        'alquileres',
        perdedora.alquiler_id,
        'fila duplicada (dump sin PK): se conserva una sola por id',
        { alquiler_id: perdedora.alquiler_id }
      )
    }

    for (const fila of [...porId.values()].sort((a, b) => a.alquiler_id - b.alquiler_id)) {
      const coordenadas = this.parseCentro(fila.alquiler_coordenadas)
      if (fila.alquiler_coordenadas && !coordenadas) {
        await this.rechazar(
          'alquileres',
          fila.alquiler_id,
          'campo coordenadas no parseable: se importó sin coordenadas',
          { coordenadas: fila.alquiler_coordenadas }
        )
      }

      const imagenes = await this.parseImagenesAlquiler(fila)

      const [insertada] = await this.db
        .table('alquileres')
        .insert({
          precio_mensual: this.num(fila.alquiler_precio_mensual),
          precio_garantia: this.num(fila.alquiler_precio_garantia),
          direccion: fila.alquiler_direccion ?? null,
          ubicacion: fila.alquiler_ubicacion ?? null,
          contacto: fila.alquiler_contacto ?? null,
          habitaciones: this.int(fila.alquiler_habitaciones),
          banos: this.int(fila.alquiler_banos),
          cocinas: this.int(fila.alquiler_cocinas),
          observaciones: fila.alquiler_observaciones ?? null,
          coordenadas: coordenadas ? JSON.stringify(coordenadas) : null,
          estado: fila.alquiler_estado ?? null,
          imagenes: imagenes === null ? null : JSON.stringify(imagenes),
          expensas: fila.alquiler_expensas ?? null,
          balcon: fila.alquiler_balcon ?? null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('id')
      await this.mapear('alquileres', fila.alquiler_id, insertada.id)
      this.importada('alquileres')
    }
    this.logger.info('alquileres importados')
  }

  /**
   * alquiler_imagen viene en dos formatos: '[88,89]' (ids de uploads viejos)
   * o '["/api/file/public/<link>", …]'. Se normaliza a un array de upload
   * ids nuevos; las referencias irresolubles se registran como rechazo.
   */
  private async parseImagenesAlquiler(fila: any): Promise<number[] | null> {
    const crudo = fila.alquiler_imagen?.trim()
    if (!crudo) return null
    let lista: unknown
    try {
      lista = JSON.parse(crudo)
    } catch {
      await this.rechazar('alquileres', fila.alquiler_id, 'campo imagenes no parseable', {
        imagen: crudo,
      })
      return null
    }
    if (!Array.isArray(lista)) {
      await this.rechazar('alquileres', fila.alquiler_id, 'campo imagenes no es un array', {
        imagen: crudo,
      })
      return null
    }

    const ids: number[] = []
    for (const item of lista) {
      if (typeof item === 'number') {
        const nuevo = this.uploadPorIdViejo.get(item)
        if (nuevo) {
          ids.push(nuevo)
        } else {
          await this.rechazar(
            'alquileres',
            fila.alquiler_id,
            `campo imagenes: upload viejo ${item} inexistente`,
            { upload_id_viejo: item }
          )
        }
      } else if (typeof item === 'string') {
        const id = await this.resolverImagen('alquileres', fila.alquiler_id, 'imagenes', item)
        if (id) ids.push(id)
      }
    }
    return ids
  }

  /* ------------------------------------------------------------------ */
  /* CMS                                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * carruseles y ultimos_lanzamientos perdieron su PK en el dump y contienen
   * dos generaciones de datos. Se conserva una fila por id, prefiriendo la
   * generación nueva (img_url relativo, sin dominio admin.abas.com.py) y la
   * fecha de alta más reciente.
   */
  private elegirGeneracion(filas: any[], idCol: string, imgCol: string, tabla: string) {
    const porId = new Map<number, any>()
    const perdedoras: any[] = []
    for (const fila of filas) {
      const actual = porId.get(fila[idCol])
      if (!actual) {
        porId.set(fila[idCol], fila)
        continue
      }
      const esNueva = (f: any) => (f[imgCol] && !String(f[imgCol]).startsWith('http') ? 1 : 0)
      const gana =
        esNueva(fila) - esNueva(actual) ||
        (fila.created_at?.getTime?.() ?? 0) - (actual.created_at?.getTime?.() ?? 0)
      const perdedora = gana > 0 ? actual : fila
      if (gana > 0) porId.set(fila[idCol], fila)
      perdedoras.push({ tabla, fila: perdedora })
    }
    return { porId, perdedoras }
  }

  private async importarCarruseles() {
    const filas = await this.staging().from('carruseles').select('*')
    this.contar('carruseles', filas.length)

    const { porId, perdedoras } = this.elegirGeneracion(
      filas,
      'carrusel_id',
      'carrusel_img_url',
      'carruseles'
    )
    for (const p of perdedoras) {
      await this.rechazar(
        'carruseles',
        p.fila.carrusel_id,
        'fila duplicada (dump sin PK): se conserva la generación más nueva',
        { carrusel_id: p.fila.carrusel_id, fraccion_nro: p.fila.carrusel_fraccion_nro }
      )
    }

    for (const fila of [...porId.values()].sort((a, b) => a.carrusel_id - b.carrusel_id)) {
      const imagenUploadId = await this.resolverImagen(
        'carruseles',
        fila.carrusel_id,
        'imagen',
        fila.carrusel_img_url
      )
      await this.db.table('carruseles').insert({
        titulo: fila.carrusel_titulo ?? null,
        subtitulo: fila.carrusel_subtitulo ?? null,
        descripcion: fila.carrusel_descripcion ?? null,
        estado: fila.carrusel_estado ?? null,
        fraccion_codigo: this.int(fila.carrusel_fraccion_nro),
        imagen_upload_id: imagenUploadId,
        ...this.fechas(fila),
      })
      this.importada('carruseles')
    }
    this.logger.info('carruseles importados')
  }

  private async importarUltimosLanzamientos() {
    const filas = await this.staging().from('ultimos_lanzamientos').select('*')
    this.contar('ultimos_lanzamientos', filas.length)

    const { porId, perdedoras } = this.elegirGeneracion(
      filas,
      'ultimo_lanzamiento_id',
      'ultimo_lanzamiento_img_url',
      'ultimos_lanzamientos'
    )
    for (const p of perdedoras) {
      await this.rechazar(
        'ultimos_lanzamientos',
        p.fila.ultimo_lanzamiento_id,
        'fila duplicada (dump sin PK): se conserva la generación más nueva',
        { ultimo_lanzamiento_id: p.fila.ultimo_lanzamiento_id }
      )
    }

    for (const fila of [...porId.values()].sort(
      (a, b) => a.ultimo_lanzamiento_id - b.ultimo_lanzamiento_id
    )) {
      const imagenUploadId = await this.resolverImagen(
        'ultimos_lanzamientos',
        fila.ultimo_lanzamiento_id,
        'imagen',
        fila.ultimo_lanzamiento_img_url
      )
      await this.db.table('ultimos_lanzamientos').insert({
        fraccion_codigo: this.int(fila.ultimo_lanzamiento_fraccion_numero),
        estado: fila.ultimo_lanzamiento_estado ?? null,
        imagen_upload_id: imagenUploadId,
        ...this.fechas(fila),
      })
      this.importada('ultimos_lanzamientos')
    }
    this.logger.info('ultimos_lanzamientos importados')
  }

  private async importarProximosDesarrollos() {
    const filas = await this.staging()
      .from('proximos_desarrollos')
      .select('*')
      .orderBy('proximo_desarrollo_id')
    this.contar('proximos_desarrollos', filas.length)

    for (const fila of filas) {
      const imagenUploadId = await this.resolverImagen(
        'proximos_desarrollos',
        fila.proximo_desarrollo_id,
        'imagen',
        fila.proximo_desarrollo_img_url
      )
      await this.db.table('proximos_desarrollos').insert({
        distrito: fila.proximo_desarrollo_distrito ?? null,
        fraccion: fila.proximo_desarrollo_fraccion ?? null,
        precio_desde: this.num(fila.proximo_desarrollo_precio_desde),
        estado: fila.proximo_desarrollo_estado ?? null,
        departamento: fila.proximo_desarrollo_departamento ?? null,
        lotes: this.int(fila.proximo_desarrollo_lotes),
        imagen_upload_id: imagenUploadId,
        ...this.fechas(fila),
      })
      this.importada('proximos_desarrollos')
    }
    this.logger.info('proximos_desarrollos importados')
  }

  private async importarQuienesSomos() {
    const filas = await this.staging().from('quienes_somos').select('*')
    this.contar('quienes_somos', filas.length)
    for (const fila of filas) {
      await this.db.table('quienes_somos').insert({
        titulo: fila.quienes_somos_titulo ?? null,
        parrafo_uno: fila.quienes_somos_parrafo_uno ?? null,
        parrafo_dos: fila.quienes_somos_parrafo_dos ?? null,
        parrafo_tres: fila.quienes_somos_parrafo_tres ?? null,
        parrafo_cuatro: fila.quienes_somos_parrafo_cuatro ?? null,
        imagen_uno_upload_id: await this.resolverImagen(
          'quienes_somos',
          fila.quienes_somos_id,
          'imagen_uno',
          fila.quienes_somos_image_uno
        ),
        imagen_dos_upload_id: await this.resolverImagen(
          'quienes_somos',
          fila.quienes_somos_id,
          'imagen_dos',
          fila.quienes_somos_image_dos
        ),
        imagen_tres_upload_id: await this.resolverImagen(
          'quienes_somos',
          fila.quienes_somos_id,
          'imagen_tres',
          fila.quienes_somos_image_tres
        ),
        ...this.fechas(fila),
      })
      this.importada('quienes_somos')
    }
  }

  private async importarMision() {
    const filas = await this.staging().from('mision').select('*')
    this.contar('mision', filas.length)
    for (const fila of filas) {
      await this.db.table('mision').insert({
        titulo: fila.mision_titulo ?? null,
        parrafo_uno: fila.mision_parrafo_uno ?? null,
        imagen_uno_upload_id: await this.resolverImagen(
          'mision',
          fila.mision_id,
          'imagen_uno',
          fila.mision_image_uno
        ),
        imagen_dos_upload_id: await this.resolverImagen(
          'mision',
          fila.mision_id,
          'imagen_dos',
          fila.mision_image_dos
        ),
        ...this.fechas(fila),
      })
      this.importada('mision')
    }
  }

  private async importarVision() {
    const filas = await this.staging().from('vision').select('*')
    this.contar('vision', filas.length)
    for (const fila of filas) {
      await this.db.table('vision').insert({
        titulo: fila.vision_titulo ?? null,
        parrafo_uno: fila.vision_parrafo_uno ?? null,
        imagen_uno_upload_id: await this.resolverImagen(
          'vision',
          fila.vision_id,
          'imagen_uno',
          fila.vision_image_uno
        ),
        ...this.fechas(fila),
      })
      this.importada('vision')
    }
  }

  private async importarProducto() {
    const filas = await this.staging().from('producto').select('*')
    this.contar('producto', filas.length)
    for (const fila of filas) {
      await this.db.table('producto').insert({
        titulo: fila.producto_titulo ?? null,
        parrafo_uno: fila.producto_parrafo_uno ?? null,
        imagen_uno_upload_id: await this.resolverImagen(
          'producto',
          fila.producto_id,
          'imagen_uno',
          fila.producto_image_uno
        ),
        ...this.fechas(fila),
      })
      this.importada('producto')
    }
  }

  private async importarTrayectoria() {
    const filas = await this.staging().from('trayectoria').select('*')
    this.contar('trayectoria', filas.length)
    for (const fila of filas) {
      await this.db.table('trayectoria').insert({
        titulo: fila.trayectoria_titulo ?? null,
        parrafo_uno: fila.trayectoria_parrafo_uno ?? null,
        parrafo_dos: fila.trayectoria_parrafo_dos ?? null,
        parrafo_tres: fila.trayectoria_parrafo_tres ?? null,
        parrafo_cuatro: fila.trayectoria_parrafo_cuatro ?? null,
        parrafo_cinco: fila.trayectoria_parrafo_cinco ?? null,
        parrafo_seis: fila.trayectoria_parrafo_seis ?? null,
        imagen_uno_upload_id: await this.resolverImagen(
          'trayectoria',
          fila.trayectoria_id,
          'imagen_uno',
          fila.trayectoria_image_uno
        ),
        imagen_dos_upload_id: await this.resolverImagen(
          'trayectoria',
          fila.trayectoria_id,
          'imagen_dos',
          fila.trayectoria_image_dos
        ),
        imagen_tres_upload_id: await this.resolverImagen(
          'trayectoria',
          fila.trayectoria_id,
          'imagen_tres',
          fila.trayectoria_image_tres
        ),
        ...this.fechas(fila),
      })
      this.importada('trayectoria')
    }
  }

  private async importarParking() {
    const filas = await this.staging().from('parking').select('*')
    this.contar('parking', filas.length)
    for (const fila of filas) {
      await this.db.table('parking').insert({
        titulo: fila.parking_titulo ?? null,
        parrafo_uno: fila.parking_parrafo_uno ?? null,
        parrafo_dos: fila.parking_parrafo_dos ?? null,
        parrafo_tres: fila.parking_parrafo_tres ?? null,
        imagen_uno_upload_id: await this.resolverImagen(
          'parking',
          fila.parking_id,
          'imagen_uno',
          fila.parking_imagen_uno
        ),
        imagen_dos_upload_id: await this.resolverImagen(
          'parking',
          fila.parking_id,
          'imagen_dos',
          fila.parking_imagen_dos
        ),
        ...this.fechas(fila),
      })
      this.importada('parking')
    }
  }

  private async importarOfrecemos() {
    const filas = await this.staging().from('ofrecemos').select('*').orderBy('ofrecemos_id')
    this.contar('ofrecemos', filas.length)
    for (const fila of filas) {
      await this.db.table('ofrecemos').insert({
        descripcion: fila.ofrecemos_descripcion ?? null,
        imagen_upload_id: await this.resolverImagen(
          'ofrecemos',
          fila.ofrecemos_id,
          'imagen',
          fila.ofrecemos_imagen
        ),
        imagen_check: fila.ofrecemos_imagen_check ?? null,
        ...this.fechas(fila),
      })
      this.importada('ofrecemos')
    }
  }

  private async importarNuestrosHorarios() {
    const filas = await this.staging()
      .from('nuestros_horarios')
      .select('*')
      .orderBy('nuestro_horario_id')
    this.contar('nuestros_horarios', filas.length)
    for (const fila of filas) {
      await this.db.table('nuestros_horarios').insert({
        descripcion: fila.nuestro_horario_descripcion ?? null,
        obs: fila.nuestro_horario_obs ?? null,
        obs_check: fila.nuestro_horario_obs_check ?? null,
        ...this.fechas(fila),
      })
      this.importada('nuestros_horarios')
    }
  }

  private async importarDireccionContacto() {
    const filas = await this.staging()
      .from('direccion_contacto')
      .select('*')
      .orderBy('direccion_contacto_id')
    this.contar('direccion_contacto', filas.length)
    for (const fila of filas) {
      await this.db.table('direccion_contacto').insert({
        descripcion: fila.direccion_contacto_descripcion ?? null,
        ...this.fechas(fila),
      })
      this.importada('direccion_contacto')
    }
  }

  private async importarSucursales() {
    const filas = await this.staging().from('sucursales').select('*').orderBy('sucursal_id')
    this.contar('sucursales', filas.length)
    for (const fila of filas) {
      /**
       * sucursal_coordenadas en el dump es una URL de Google Maps embed:
       * se extraen lng (!2d…) y lat (!3d…) y se normaliza a {lat, lng}.
       */
      let coordenadas: { lat: number; lng: number } | null = null
      const crudo: string = fila.sucursal_coordenadas ?? ''
      const lngMatch = crudo.match(/!2d(-?\d+(?:\.\d+)?)/)
      const latMatch = crudo.match(/!3d(-?\d+(?:\.\d+)?)/)
      if (lngMatch && latMatch) {
        const punto = { lat: Number(latMatch[1]), lng: Number(lngMatch[1]) }
        if (this.latLngValido(punto)) coordenadas = punto
      }
      if (crudo && !coordenadas) {
        await this.rechazar(
          'sucursales',
          fila.sucursal_id,
          'campo coordenadas: URL de embed no parseable, se importó sin coordenadas',
          { coordenadas: crudo }
        )
      }
      await this.db.table('sucursales').insert({
        titulo: fila.sucursal_titulo ?? null,
        coordenadas: coordenadas ? JSON.stringify(coordenadas) : null,
        horarios: fila.sucursal_horarios ?? null,
        telefonos: fila.sucursal_telefonos ?? null,
        estado: fila.sucursal_estado ?? null,
        ...this.fechas(fila),
      })
      this.importada('sucursales')
    }
  }

  /* ------------------------------------------------------------------ */
  /* Cierre                                                              */
  /* ------------------------------------------------------------------ */

  private async ajustarSecuencias() {
    const tablas = [
      'roles',
      'users',
      'uploads',
      'fracciones',
      'manzanas',
      'lotes',
      'lotes_colores',
      'lotes_distritos',
      'alquileres',
      'carruseles',
      'ultimos_lanzamientos',
      'proximos_desarrollos',
      'quienes_somos',
      'mision',
      'vision',
      'producto',
      'trayectoria',
      'parking',
      'ofrecemos',
      'nuestros_horarios',
      'direccion_contacto',
      'sucursales',
      'redes_sociales',
      'promociones',
      'leads',
      'password_reset_tokens',
      'usuarios_app',
      'etl_rechazos',
      'etl_id_map',
    ]
    for (const tabla of tablas) {
      await this.db.rawQuery(
        `SELECT setval(pg_get_serial_sequence('"${tabla}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tabla}"), 0) + 1, false)`
      )
    }
    this.logger.info('Secuencias ajustadas')
  }

  private async imprimirResumen() {
    this.logger.info('Resumen de la importación (staging → v2):')
    const nombres = Object.keys(this.resumen).sort()
    for (const tabla of nombres) {
      const r = this.resumen[tabla]
      this.logger.info(
        `  ${tabla.padEnd(22)} staging=${String(r.staging).padStart(5)}  importadas=${String(r.importadas).padStart(5)}  rechazos=${String(r.rechazos).padStart(4)}`
      )
    }
    const totalRechazos = nombres.reduce((acc, t) => acc + this.resumen[t].rechazos, 0)
    this.logger.info(`Rechazos totales registrados en etl_rechazos: ${totalRechazos}`)
  }
}
