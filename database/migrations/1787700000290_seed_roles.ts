import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Los 4 roles del sitio (antes venían del ETL de Oracle). Ids fijos porque
 * users.rol_id los referencia. Solo inserta los que falten.
 */
const ROLES = [
  { id: 1, descripcion: 'Administrador', nivel: 1 },
  { id: 2, descripcion: 'Vendedor', nivel: 2 },
  { id: 3, descripcion: 'Cargar contactos', nivel: 3 },
  { id: 4, descripcion: 'Cargar/Transferir contactos', nivel: 4 },
]

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      const ahora = new Date()
      await db
        .table('roles')
        .insert(ROLES.map((r) => ({ ...r, created_at: ahora, updated_at: ahora })))
        .onConflict('id')
        .ignore()
      /* Los ids explícitos no avanzan la secuencia: dejarla después del mayor. */
      await db.rawQuery(
        `SELECT setval(pg_get_serial_sequence('roles', 'id'), (SELECT MAX(id) FROM roles))`
      )
    })
  }

  async down() {
    // Sin down: borrar roles rompería los usuarios que los referencian.
  }
}
