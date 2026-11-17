import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'
import type { OracleConfig } from '@adonisjs/lucid/types/database'

import env from '#start/env'

/**
 * Conexión al ERP Oracle (vistas INMC017_V / INMM011_V). Solo se registra
 * con ORACLE_DRIVER=real: declararla con driver fake exigiría el paquete
 * `oracledb` (no instalado a propósito) y rompería el boot.
 *
 * Para activarla: npm install oracledb + Oracle Instant Client en el host,
 * ORACLE_DRIVER=real y las variables ORACLE_* en .env.
 */
/**
 * El ERP exige Native Network Encryption (ORA-12660) y el modo thin de
 * node-oracledb no la soporta: hay que inicializar el modo THICK, que
 * carga las librerías del Oracle Instant Client del sistema (paquete
 * oracle-instantclient-basic; su RPM deja las libs visibles vía ldconfig).
 */
if (env.get('ORACLE_DRIVER') === 'real') {
  // @ts-expect-error — oracledb solo está instalado donde ORACLE_DRIVER=real
  const { default: oracledb } = await import('oracledb')
  oracledb.initOracleClient()
}

const oracleConnection: Record<string, OracleConfig> =
  env.get('ORACLE_DRIVER') === 'real'
    ? {
        oracle: {
          client: 'oracledb',
          connection: {
            host: env.get('ORACLE_HOST'),
            port: env.get('ORACLE_PORT'),
            user: env.get('ORACLE_USER'),
            password: env.get('ORACLE_PASSWORD'),
            database: env.get('ORACLE_DB_NAME'),
          },
          debug: false,
        },
      }
    : {}

const dbConfig = defineConfig({
  connection: 'pg',

  connections: {
    ...oracleConnection,
    pg: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
        ssl: env.get('DB_SSL', false)
          ? { rejectUnauthorized: env.get('DB_SSL_STRICT', true) }
          : false,
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      debug: app.inDev,
    },

    /**
     * Conexión de solo lectura al restore del dump viejo (abas_staging).
     * La usa únicamente el comando `etl:import`. No correr migraciones acá.
     */
    staging: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE_STAGING', 'abas_staging'),
        ssl: env.get('DB_SSL', false)
          ? { rejectUnauthorized: env.get('DB_SSL_STRICT', true) }
          : false,
      },
      debug: false,
    },
  },
})

export default dbConfig
