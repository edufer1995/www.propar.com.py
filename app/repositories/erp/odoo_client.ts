/*
|--------------------------------------------------------------------------
| Cliente JSON-RPC de Odoo (solo lectura)
|--------------------------------------------------------------------------
|
| Habla con el endpoint /jsonrpc de Odoo (servicios `common` y `object`).
| Se autentica con login + API key (Preferencias → Seguridad de la cuenta
| → Nueva clave API en Odoo); la clave va en ODOO_API_KEY y NUNCA en el
| repositorio.
|
| SOLO LECTURA a propósito: `ejecutar` rechaza cualquier método que no
| esté en METODOS_LECTURA, así ningún cambio en esta capa puede escribir
| en el ERP aunque el usuario de la API tenga permisos de escritura.
|
| Errores: todo lo que falla se traduce a OdooError con un `motivo`
| (red, timeout, autenticacion, permiso, odoo, respuesta) y un mensaje en
| castellano listo para mostrar en el admin o en los logs. Nunca incluye
| la API key.
|
*/

export type MotivoOdooError = 'red' | 'timeout' | 'autenticacion' | 'permiso' | 'odoo' | 'respuesta'

export class OdooError extends Error {
  constructor(
    public motivo: MotivoOdooError,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = 'OdooError'
  }
}

export interface OdooConfig {
  /** URL base de la instancia, sin barra final (https://empresa.odoo.com) */
  url: string
  db: string
  login: string
  apiKey: string
  /** Tiempo máximo por llamada (ms). Default 30 s */
  timeoutMs?: number
}

/** Métodos ORM permitidos: todos de lectura */
const METODOS_LECTURA = new Set([
  'search',
  'search_read',
  'search_count',
  'read',
  'read_group',
  'fields_get',
  'name_search',
])

/** Dominio de búsqueda de Odoo: [['campo', 'operador', valor], '|', ...] */
export type DominioOdoo = Array<string | [string, string, unknown]>

export default class OdooClient {
  #config: Required<OdooConfig>
  #uid: Promise<number> | null = null
  #idLlamada = 0

  constructor(config: OdooConfig) {
    this.#config = {
      ...config,
      /* `?? ` y no default en el spread: un timeoutMs undefined lo pisaría. */
      timeoutMs: config.timeoutMs ?? 30_000,
      url: config.url.replace(/\/+$/, ''),
    }
  }

  /** Llamada JSON-RPC cruda a /jsonrpc */
  async #rpc(service: string, method: string, args: unknown[]): Promise<unknown> {
    let respuesta: Response
    try {
      respuesta = await fetch(`${this.#config.url}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: { service, method, args },
          id: ++this.#idLlamada,
        }),
        signal: AbortSignal.timeout(this.#config.timeoutMs),
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new OdooError(
          'timeout',
          `Odoo no respondió en ${this.#config.timeoutMs / 1000} s (${this.#config.url}).`,
          { cause: error }
        )
      }
      throw new OdooError('red', `No se pudo conectar con Odoo (${this.#config.url}).`, {
        cause: error,
      })
    }

    if (!respuesta.ok) {
      throw new OdooError(
        'red',
        `Odoo respondió HTTP ${respuesta.status} (${this.#config.url}/jsonrpc).`
      )
    }

    let cuerpo: { result?: unknown; error?: { message?: string; data?: Record<string, unknown> } }
    try {
      cuerpo = (await respuesta.json()) as typeof cuerpo
    } catch (error) {
      throw new OdooError('respuesta', 'Odoo devolvió una respuesta que no es JSON.', {
        cause: error,
      })
    }

    if (cuerpo.error) {
      const data = cuerpo.error.data ?? {}
      const nombre = String(data.name ?? '')
      const detalle = String(data.message ?? cuerpo.error.message ?? 'error desconocido')
      if (nombre.includes('AccessDenied')) {
        throw new OdooError('autenticacion', 'Odoo rechazó el usuario o la API key.')
      }
      if (nombre.includes('AccessError')) {
        throw new OdooError('permiso', `El usuario de la API no tiene permiso: ${detalle}`)
      }
      throw new OdooError('odoo', `Error de Odoo: ${detalle}`)
    }

    return cuerpo.result
  }

  /** uid del usuario de la API (se autentica una sola vez por instancia) */
  uid(): Promise<number> {
    if (!this.#uid) {
      const { db, login, apiKey } = this.#config
      this.#uid = this.#rpc('common', 'authenticate', [db, login, apiKey, {}]).then((uid) => {
        if (typeof uid !== 'number' || uid <= 0) {
          throw new OdooError(
            'autenticacion',
            `Odoo rechazó el usuario "${login}" o la API key (base "${db}").`
          )
        }
        return uid
      })
      /* Si falla, el próximo intento vuelve a autenticar. */
      this.#uid.catch(() => {
        this.#uid = null
      })
    }
    return this.#uid
  }

  /** execute_kw de solo lectura */
  async ejecutar<T>(
    modelo: string,
    metodo: string,
    args: unknown[],
    kwargs: Record<string, unknown> = {}
  ): Promise<T> {
    if (!METODOS_LECTURA.has(metodo)) {
      throw new OdooError(
        'permiso',
        `Método "${metodo}" bloqueado: la integración es de solo lectura.`
      )
    }
    const uid = await this.uid()
    const { db, apiKey } = this.#config
    return (await this.#rpc('object', 'execute_kw', [
      db,
      uid,
      apiKey,
      modelo,
      metodo,
      args,
      kwargs,
    ])) as T
  }

  /**
   * search_read paginado: trae TODAS las filas en tandas de `tanda`,
   * para no pedirle a Odoo respuestas gigantes de una sola vez.
   */
  async searchReadTodo<T>(
    modelo: string,
    dominio: DominioOdoo,
    campos: string[],
    opciones: { orden?: string; tanda?: number; contexto?: Record<string, unknown> } = {}
  ): Promise<T[]> {
    const tanda = opciones.tanda ?? 2000
    const filas: T[] = []
    for (let offset = 0; ; offset += tanda) {
      const pagina = await this.ejecutar<T[]>(modelo, 'search_read', [dominio], {
        fields: campos,
        offset,
        limit: tanda,
        order: opciones.orden ?? 'id asc',
        context: opciones.contexto ?? {},
      })
      filas.push(...pagina)
      if (pagina.length < tanda) return filas
    }
  }
}
