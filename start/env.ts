/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| Valida TODAS las variables de entorno al boot. Si falta algo, la app
| no levanta. Ninguna credencial vive en el código: todo sale de .env.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // PostgreSQL
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string(),
  DB_DATABASE: Env.schema.string(),
  // Base con el restore del dump viejo; solo la usa `node ace etl:import`
  DB_DATABASE_STAGING: Env.schema.string.optional(),
  DB_SSL: Env.schema.boolean.optional(),
  DB_SSL_STRICT: Env.schema.boolean.optional(),

  // ERP — fake por defecto (dataset inventado); odoo = Odoo de Propar;
  // oracle = vistas Oracle heredadas de Abas. Cada driver exige sus variables.
  ERP_DRIVER: Env.schema.enum(['fake', 'odoo', 'oracle'] as const),

  // Odoo (ERP_DRIVER=odoo). La API key va SOLO en el .env del servidor.
  ODOO_URL: Env.schema.string.optional({ format: 'url', tld: false }),
  ODOO_DB: Env.schema.string.optional(),
  ODOO_LOGIN: Env.schema.string.optional(),
  ODOO_API_KEY: Env.schema.string.optional(),
  ODOO_TIMEOUT_MS: Env.schema.number.optional(),

  ORACLE_HOST: Env.schema.string.optional({ format: 'host' }),
  ORACLE_PORT: Env.schema.number.optional(),
  ORACLE_USER: Env.schema.string.optional(),
  ORACLE_PASSWORD: Env.schema.string.optional(),
  ORACLE_DB_NAME: Env.schema.string.optional(),

  // SMTP
  SMTP_HOST: Env.schema.string({ format: 'host' }),
  SMTP_PORT: Env.schema.number(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),

  // Correos del negocio
  MAIL_FROM: Env.schema.string(),
  MAIL_FROM_NAME: Env.schema.string(),
  CONTACTO_EMAIL: Env.schema.string(),
  VENTAS_EMAIL: Env.schema.string(),

  // Contacto comercial (botón flotante de WhatsApp / teléfono del sitio
  // público). Opcionales: si faltan se usan los valores del sitio viejo.
  WHATSAPP_VENTAS: Env.schema.string.optional(),
  TEL_VENTAS: Env.schema.string.optional(),

  // Archivos subidos
  UPLOADS_PATH: Env.schema.string(),

  // Google Maps (se comparte al frontend como prop de Inertia)
  GOOGLE_MAPS_API_KEY: Env.schema.string(),

  // Rate limiter
  LIMITER_STORE: Env.schema.enum(['database', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring the mail package
  |----------------------------------------------------------
  */
  MAIL_MAILER: Env.schema.enum(['smtp'] as const),
  MAIL_FROM_ADDRESS: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the drive package
  |----------------------------------------------------------
  */
  DRIVE_DISK: Env.schema.enum(['fs'] as const),
})
