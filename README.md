# abas.com.py — v2

Migración del sitio de **Elias A. Saba S.A. Inmobiliaria (ABAS)**: sitio público
(home, loteamientos con mapa Google Maps, alquileres, parking, institucional y
contacto) + panel de administración completo (25 secciones), reemplazando al
sitio viejo (AdonisJS 4, `../www.abas.com.py`).

## Stack

- **AdonisJS v7** (Node ≥ 24) + **Inertia** + **React 19** (Vite)
- **PostgreSQL** (datos propios + réplica local de los datos del ERP)
- **SSR selectivo**: las páginas públicas (`inertia/pages/public/**`) se
  renderizan server-side para SEO; admin/auth/styleguide son client-only
- Rutas tipadas con **Tuyau** (codegen en `.adonisjs/`); las rutas se definen
  top-level en `start/routes.ts` (sin loops ni condicionales)
- ERP detrás de `ERP_DRIVER`: `odoo` es el Odoo de Propar (lotes, estados y
  precios cruzados por FML, ver `app/repositories/erp/odoo_lotes_erp_repository.ts`);
  `fake` genera un dataset determinístico para desarrollo; `oracle` queda de
  la base de Abas

## Setup local

```bash
# 1. Contenedores (podman): PostgreSQL + Mailpit
podman run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17
podman run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
# UI de mails: http://localhost:8025

# 2. Dependencias y entorno
npm install
cp .env.example .env   # completar APP_KEY (node ace generate:key) y GOOGLE_MAPS_API_KEY

# 3. Base de datos
node ace migration:run
node ace etl:import          # importa el dump del sitio viejo (7.301 lotes)
node ace db:seed             # usuario dev.admin / abas-dev-2026 + datos de dev

# 4. Levantar
npm run dev                  # http://localhost:3334
```

## Comandos útiles

| Comando                           | Qué hace                                      |
| --------------------------------- | --------------------------------------------- |
| `npm run dev`                     | Dev server con HMR (puerto 3334)              |
| `npm test`                        | Suite completa (Japa, functional)             |
| `npm run typecheck`               | tsc del backend + del frontend Inertia        |
| `npm run lint` / `npm run format` | ESLint / Prettier                             |
| `node ace etl:import`             | ETL del sitio viejo → Postgres v2             |
| `node ace etl:verify-auth`        | Verifica la migración de credenciales         |
| `node ace uploads:migrate`        | Migra los archivos subidos del sitio viejo    |
| `node ace erp:verificar`          | Prueba la conexión con el ERP (solo lectura)  |
| `npm run build`                   | Build de producción (cliente + SSR + backend) |

## Seguridad (Etapa 6)

- **Roles** (tabla `roles`, nivel ascendente = menos privilegio):
  nivel 1 _Administrador_ accede a todo; nivel 2 _Vendedor_ gestiona el
  contenido del sitio; niveles 3-4 (roles de la app móvil) solo dashboard y
  perfil. Leads, Usuarios y Usuarios App son solo nivel 1. La política vive en
  `start/routes.ts` (`middleware.role`) y el menú (`inertia/layouts/admin.tsx`)
  la replica ocultando secciones.
- **CSP** activa vía Shield (`config/shield.ts`): scripts propios + Google
  Maps, nonce por request para los inline propios, HMR de Vite permitido solo
  en dev. Headers extra (Referrer-Policy, Permissions-Policy) en
  `app/middleware/security_headers_middleware.ts`.
- Cookies de sesión `Secure` en producción, `HttpOnly` + `SameSite=Lax`
  siempre. CSRF activo. Rate limiting en login, forgot-password, contacto y
  solicitudes de compra.

## Pendientes de producción

- [ ] **Uploads físicos**: correr `node ace uploads:migrate` contra el storage
      real del sitio viejo y montar `UPLOADS_PATH` en un volumen persistente.
- [ ] **Odoo de producción**: `ERP_DRIVER=odoo` + `ODOO_URL`, `ODOO_DB`,
      `ODOO_LOGIN` y `ODOO_API_KEY` en el `.env` del servidor (la clave
      nunca en el repo). Probar con `node ace erp:verificar --fraccion=<código>`.
- [ ] **Map ID propio**: el mapa usa `DEMO_MAP_ID` de Google; crear un Map ID
      en Google Cloud y reemplazarlo en `inertia/pages/public/loteamientos.tsx`.
- [ ] **Restricción de la API key de Maps**: la key sale de
      `GOOGLE_MAPS_API_KEY` y viaja al cliente solo como prop de Inertia, pero
      una key de Maps JS es pública por naturaleza — hay que restringirla por
      **HTTP referrer** (dominio de producción) en la consola de Google Cloud.
- [ ] **Emails de usuarios del admin**: el sitio viejo no tenía emails; cargar
      los reales para que funcione "olvidé mi contraseña" para todos.
- [ ] **SMTP real**: reemplazar Mailpit por el SMTP del negocio
      (`SMTP_HOST/SMTP_PORT` + remitentes `MAIL_FROM`, `CONTACTO_EMAIL`,
      `VENTAS_EMAIL`).
