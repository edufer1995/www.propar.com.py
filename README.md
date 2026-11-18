# propar.com.py

Sitio web de **Inmobiliaria Propar S.R.L.** (Paraguay): sitio público (home,
loteamientos con mapa de Google Maps, quiénes somos y contacto) + panel de
administración.

Los datos comerciales de cada lote (estado, superficie, precio contado,
cuota y cantidad de cuotas) **no se cargan en el admin**: se leen del ERP
Odoo de Propar cruzando por la terna **FML** (fracción-manzana-lote). El
admin solo sube el dibujo del plano.

## Stack

- **AdonisJS v7** (Node ≥ 24) + **Inertia** + **React 19** (Vite)
- **PostgreSQL**: contenido del sitio y geometrías de los planos
- **SSR selectivo**: las páginas públicas (`inertia/pages/public/**`) se
  renderizan server-side para SEO; admin/auth/styleguide son client-only
- Rutas tipadas con **Tuyau** (codegen en `.adonisjs/`); las rutas se definen
  top-level en `start/routes.ts` (sin loops ni condicionales)
- ERP detrás de `ERP_DRIVER`:
  - `odoo`: Odoo de Propar, **solo lectura** (ver
    `app/repositories/erp/odoo_lotes_erp_repository.ts` para el mapeo de
    modelos y campos)
  - `fake`: dataset determinístico en memoria para desarrollo y tests

## Setup local

```bash
# 1. Contenedores (podman): PostgreSQL + Mailpit
podman run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17
podman run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
# UI de mails: http://localhost:8025

# 2. Dependencias y entorno
npm install
cp .env.example .env   # completar APP_KEY (node ace generate:key) y GOOGLE_MAPS_API_KEY
                       # para datos reales: ERP_DRIVER=odoo + las ODOO_*

# 3. Base de datos
node ace migration:run
node ace db:seed             # datos de desarrollo
node ace dev:crear-admin     # usuario dev / dev12345 (solo desarrollo)

# 4. Levantar
npm run dev                  # http://localhost:3334
```

## Comandos útiles

| Comando                                 | Qué hace                                       |
| --------------------------------------- | ---------------------------------------------- |
| `npm run dev`                           | Dev server con HMR (puerto 3334)               |
| `npm test`                              | Suite completa (Japa, functional)              |
| `npm run typecheck`                     | tsc del backend + del frontend Inertia         |
| `npm run lint` / `npm run format`       | ESLint / Prettier                              |
| `node ace erp:verificar`                | Prueba la conexión con el ERP (solo lectura)   |
| `node ace erp:verificar --fraccion=234` | Detalle de los lotes de una fracción en el ERP |
| `npm run build`                         | Build de producción (cliente + SSR + backend)  |

## Primer administrador

Con la tabla `users` vacía, el servidor crea un administrador al arrancar
si están `ADMIN_INICIAL_USUARIO` y `ADMIN_INICIAL_PASSWORD` (mínimo 10
caracteres). Después de entrar, cambiar la clave en "Mi cuenta" y borrar la
variable.

> Con Node 24 los comandos ace propios (`erp:verificar`, `admin:inicial`) no
> cargan por un bug de `jsonschema` 1.5.0 ("Invalid URL"); con Node 22
> funcionan.

## Seguridad

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
- **Odoo**: la integración bloquea en código cualquier método que no sea de
  lectura. La API key va solo en el `.env` del servidor, nunca en el repo.

## Pendientes de producción

- [ ] **Hosting**: deploy en Railway (Node + PostgreSQL) con `UPLOADS_PATH`
      en un volumen persistente.
- [ ] **Odoo de producción**: `ERP_DRIVER=odoo` + `ODOO_URL`, `ODOO_DB`,
      `ODOO_LOGIN` y `ODOO_API_KEY`. Probar con
      `node ace erp:verificar --fraccion=<código>`.
- [ ] **Diseño Propar**: aplicar la maqueta aprobada y el manual de marca
      (tokens en `inertia/css/tokens.css`).
- [ ] **Map ID propio**: el mapa usa `DEMO_MAP_ID` de Google; crear un Map ID
      en Google Cloud y reemplazarlo en `inertia/pages/public/loteamientos.tsx`.
- [ ] **Restricción de la API key de Maps**: la key sale de
      `GOOGLE_MAPS_API_KEY` y viaja al cliente solo como prop de Inertia, pero
      una key de Maps JS es pública por naturaleza: hay que restringirla por
      **HTTP referrer** (dominio de producción) en la consola de Google Cloud.
- [ ] **SMTP real**: configurar el SMTP del negocio (`SMTP_HOST/SMTP_PORT` +
      remitentes `MAIL_FROM`, `CONTACTO_EMAIL`, `VENTAS_EMAIL`).
