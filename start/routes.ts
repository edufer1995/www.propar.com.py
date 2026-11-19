/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import { NIVEL_ADMINISTRADOR, NIVEL_VENDEDOR } from '#middleware/role_middleware'
import { destinoSitioViejo } from '#services/sitio_viejo'

/*
|--------------------------------------------------------------------------
| Sitio público (Etapas 4a y 4b).
|--------------------------------------------------------------------------
*/
router.get('/', [controllers.public.Home, 'index']).as('home')
router.get('quienes-somos', [controllers.public.QuienesSomos, 'index']).as('public.quienesSomos')
router.get('contacto', [controllers.public.Contacto, 'show']).as('public.contacto.show')
router.post('contacto', [controllers.public.Contacto, 'store']).as('public.contacto.store')
router
  .get('preguntas-frecuentes', [controllers.public.PreguntasFrecuentes, 'index'])
  .as('public.preguntas')
router.get('deseo-vender', [controllers.public.DeseoVender, 'show']).as('public.vender.show')
router.post('deseo-vender', [controllers.public.DeseoVender, 'store']).as('public.vender.store')

/*
|--------------------------------------------------------------------------
| SEO técnico: robots.txt + sitemap.xml.
|--------------------------------------------------------------------------
*/
router.get('robots.txt', [controllers.public.Seo, 'robots']).as('public.robots')
router.get('sitemap.xml', [controllers.public.Seo, 'sitemap']).as('public.sitemap')

/*
|--------------------------------------------------------------------------
| Loteamientos: pantalla del mapa de lotes + endpoints JSON del
| detalle de fracción y la solicitud de compra. /propiedades (el nombre que
| tuvo la sección durante el rediseño) redirige 301 conservando la query.
|--------------------------------------------------------------------------
*/
router.get('loteamientos', [controllers.public.Loteamientos, 'index']).as('public.loteamientos')
router
  .get('loteamientos/fracciones/:codigo/detalle', [controllers.public.Loteamientos, 'detalle'])
  .where('codigo', router.matchers.number())
  .as('public.loteamientos.detalle')
router
  .post('loteamientos/comprar', [controllers.public.Loteamientos, 'comprar'])
  .as('public.loteamientos.comprar')
router.get('propiedades', ({ request, response }) => {
  return response.redirect().withQs(request.qs()).status(301).toPath('/loteamientos')
})

/*
|--------------------------------------------------------------------------
| Direcciones del sitio viejo (/web/..., /admin/...): 301 a su equivalente
| nuevo (ver #services/sitio_viejo).
|--------------------------------------------------------------------------
*/
router.get('web', ({ response }) => response.redirect().status(301).toPath('/'))
router.get('web/:pagina/:id?', ({ params, response }) => {
  return response.redirect().status(301).toPath(destinoSitioViejo(params.pagina, params.id))
})
router.get('admin/*', ({ response }) => response.redirect().status(301).toPath('/app'))
router.get('admin', ({ response }) => response.redirect().status(301).toPath('/app'))

// Referencia viva del sistema de diseño. Nota: el codegen de rutas (Tuyau)
// analiza este archivo estáticamente — las rutas NO pueden definirse dentro
// de condicionales. El acceso se corta en producción vía middleware.
router
  .on('/styleguide')
  .renderInertia('styleguide', {})
  .as('styleguide')
  .use(async (_ctx, next) => {
    if (app.inProduction) return
    return next()
  })

/*
|--------------------------------------------------------------------------
| Auth (solo invitados). No hay registro público: los usuarios del admin
| los crea otro administrador.
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('login', [controllers.auth.Session, 'create']).as('auth.login.show')
    router.post('login', [controllers.auth.Session, 'store']).as('auth.login')

    router.get('forgot-password', [controllers.auth.PasswordReset, 'forgot']).as('auth.forgot.show')
    router.post('forgot-password', [controllers.auth.PasswordReset, 'send']).as('auth.forgot')

    router
      .get('reset-password/:token', [controllers.auth.PasswordReset, 'show'])
      .as('auth.reset.show')
    router
      .post('reset-password/:token', [controllers.auth.PasswordReset, 'update'])
      .as('auth.reset')
  })
  .prefix('auth')
  .use(middleware.guest())

router.post('auth/logout', [controllers.auth.Session, 'destroy']).as('auth.logout')

/*
|--------------------------------------------------------------------------
| API de archivos: servido público por link (token hex de 100 chars) y
| subida de imágenes para el admin (requiere sesión).
|--------------------------------------------------------------------------
*/
router
  .get('api/file/public/:link', [controllers.api.Files, 'show'])
  .where('link', /^[0-9a-f]{100}$/)
  .as('api.file.public')

router
  .post('api/uploads', [controllers.api.Uploads, 'store'])
  .use([middleware.auth(), middleware.role({ nivelMinimo: NIVEL_VENDEDOR })])
  .as('api.uploads.store')

/*
|--------------------------------------------------------------------------
| Admin (/app/*): requiere sesión + autorización por rol (Etapa 6).
|
| Política de roles (niveles de la tabla `roles`, migrados del sitio viejo):
|   · Nivel 1 (Administrador)  → acceso total, incluidas las secciones
|     sensibles: Leads (datos personales de interesados), Usuarios del
|     admin y Usuarios App.
|   · Nivel 2 (Vendedor)       → gestión de contenido del sitio (carruseles,
|     planos, institucional, etc.), sin secciones sensibles.
|   · Niveles 3 y 4 (Cargar / Cargar-Transferir contactos) → roles
|     operativos de la app móvil: en el admin web solo dashboard y perfil.
|
| El menú del layout admin (inertia/layouts/admin.tsx) refleja la misma
| política ocultando las secciones sin acceso; la autoridad real es este
| middleware (el frontend es solo UX).
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    /* Todo usuario autenticado (cualquier nivel): dashboard y su perfil. */
    router.get('/', [controllers.app.Dashboard, 'index']).as('app.dashboard')

    router.get('perfil', [controllers.app.Perfil, 'show']).as('app.perfil')
    router
      .post('perfil/password', [controllers.app.Perfil, 'updatePassword'])
      .as('app.perfil.password')

    /*
    |----------------------------------------------------------------------
    | Recursos CRUD (Etapa 5a, motor genérico). El codegen de rutas exige
    | definiciones explícitas (sin loops ni condicionales), por eso cada
    | recurso repite el mismo bloque de 6 rutas (4 en leads: solo lectura).
    |
    | Contenido del sitio → Administrador (1) y Vendedor (2).
    |----------------------------------------------------------------------
    */
    router
      .group(() => {
        // Sucursales (piloto)
        router.get('sucursales', [controllers.admin.Sucursales, 'index']).as('app.sucursales.index')
        router
          .get('sucursales/export', [controllers.admin.Sucursales, 'export'])
          .as('app.sucursales.export')
        router
          .post('sucursales', [controllers.admin.Sucursales, 'store'])
          .as('app.sucursales.store')
        router
          .put('sucursales/:id', [controllers.admin.Sucursales, 'update'])
          .where('id', router.matchers.number())
          .as('app.sucursales.update')
        router
          .delete('sucursales/:id', [controllers.admin.Sucursales, 'destroy'])
          .where('id', router.matchers.number())
          .as('app.sucursales.destroy')
        router
          .post('sucursales/destroy-masivo', [controllers.admin.Sucursales, 'destroyMasivo'])
          .as('app.sucursales.destroyMasivo')

        // Preguntas frecuentes
        router
          .get('preguntas', [controllers.admin.PreguntasFrecuentes, 'index'])
          .as('app.preguntas.index')
        router
          .get('preguntas/export', [controllers.admin.PreguntasFrecuentes, 'export'])
          .as('app.preguntas.export')
        router
          .post('preguntas', [controllers.admin.PreguntasFrecuentes, 'store'])
          .as('app.preguntas.store')
        router
          .put('preguntas/:id', [controllers.admin.PreguntasFrecuentes, 'update'])
          .where('id', router.matchers.number())
          .as('app.preguntas.update')
        router
          .delete('preguntas/:id', [controllers.admin.PreguntasFrecuentes, 'destroy'])
          .where('id', router.matchers.number())
          .as('app.preguntas.destroy')
        router
          .post('preguntas/destroy-masivo', [
            controllers.admin.PreguntasFrecuentes,
            'destroyMasivo',
          ])
          .as('app.preguntas.destroyMasivo')

        // Carruseles
        router.get('carruseles', [controllers.admin.Carruseles, 'index']).as('app.carruseles.index')
        router
          .get('carruseles/export', [controllers.admin.Carruseles, 'export'])
          .as('app.carruseles.export')
        router
          .post('carruseles', [controllers.admin.Carruseles, 'store'])
          .as('app.carruseles.store')
        router
          .put('carruseles/:id', [controllers.admin.Carruseles, 'update'])
          .where('id', router.matchers.number())
          .as('app.carruseles.update')
        router
          .delete('carruseles/:id', [controllers.admin.Carruseles, 'destroy'])
          .where('id', router.matchers.number())
          .as('app.carruseles.destroy')
        router
          .post('carruseles/destroy-masivo', [controllers.admin.Carruseles, 'destroyMasivo'])
          .as('app.carruseles.destroyMasivo')

        // Redes sociales
        router
          .get('redes-sociales', [controllers.admin.RedesSociales, 'index'])
          .as('app.redesSociales.index')
        router
          .get('redes-sociales/export', [controllers.admin.RedesSociales, 'export'])
          .as('app.redesSociales.export')
        router
          .post('redes-sociales', [controllers.admin.RedesSociales, 'store'])
          .as('app.redesSociales.store')
        router
          .put('redes-sociales/:id', [controllers.admin.RedesSociales, 'update'])
          .where('id', router.matchers.number())
          .as('app.redesSociales.update')
        router
          .delete('redes-sociales/:id', [controllers.admin.RedesSociales, 'destroy'])
          .where('id', router.matchers.number())
          .as('app.redesSociales.destroy')
        router
          .post('redes-sociales/destroy-masivo', [controllers.admin.RedesSociales, 'destroyMasivo'])
          .as('app.redesSociales.destroyMasivo')

        // Promociones
        router
          .get('promociones', [controllers.admin.Promociones, 'index'])
          .as('app.promociones.index')
        router
          .get('promociones/export', [controllers.admin.Promociones, 'export'])
          .as('app.promociones.export')
        router
          .post('promociones', [controllers.admin.Promociones, 'store'])
          .as('app.promociones.store')
        router
          .put('promociones/:id', [controllers.admin.Promociones, 'update'])
          .where('id', router.matchers.number())
          .as('app.promociones.update')
        router
          .delete('promociones/:id', [controllers.admin.Promociones, 'destroy'])
          .where('id', router.matchers.number())
          .as('app.promociones.destroy')
        router
          .post('promociones/destroy-masivo', [controllers.admin.Promociones, 'destroyMasivo'])
          .as('app.promociones.destroyMasivo')

        /*
    |----------------------------------------------------------------------
    | Etapa 5b: recursos especiales + singletons institucionales.
    |----------------------------------------------------------------------
    */

        // Fracciones (solo medios: fotos + videos del mapa; nacen del ETL,
        // sin store/destroy a propósito)
        router.get('fracciones', [controllers.admin.Fracciones, 'index']).as('app.fracciones.index')
        router
          .get('fracciones/export', [controllers.admin.Fracciones, 'export'])
          .as('app.fracciones.export')
        router
          .put('fracciones/:id', [controllers.admin.Fracciones, 'update'])
          .where('id', router.matchers.number())
          .as('app.fracciones.update')

        // Planos (lista/edición/eliminación con el motor; alta = importación GeoJSON)
        router.get('planos', [controllers.admin.Planos, 'index']).as('app.planos.index')
        router.get('planos/export', [controllers.admin.Planos, 'export']).as('app.planos.export')
        router.post('planos', [controllers.admin.Planos, 'store']).as('app.planos.store')
        router
          .post('planos/previsualizar-kmz', [controllers.admin.Planos, 'previsualizarKmz'])
          .as('app.planos.previsualizarKmz')
        router
          .put('planos/:id', [controllers.admin.Planos, 'update'])
          .where('id', router.matchers.number())
          .as('app.planos.update')
        router
          .delete('planos/:id', [controllers.admin.Planos, 'destroy'])
          .where('id', router.matchers.number())
          .as('app.planos.destroy')
        router
          .post('planos/destroy-masivo', [controllers.admin.Planos, 'destroyMasivo'])
          .as('app.planos.destroyMasivo')

        // Colores de estados de lote (14 filas fijas: solo edición en bloque)
        router.get('colores', [controllers.admin.Colores, 'index']).as('app.colores.index')
        router.post('colores', [controllers.admin.Colores, 'update']).as('app.colores.update')

        // Lotes por distrito (tiles del home: el admin decide cuántos)
        router
          .get('lotes-por-distrito', [controllers.admin.LotesDistritos, 'index'])
          .as('app.lotesDistritos.index')
        router
          .post('lotes-por-distrito', [controllers.admin.LotesDistritos, 'store'])
          .as('app.lotesDistritos.store')
        router
          .put('lotes-por-distrito/:id', [controllers.admin.LotesDistritos, 'update'])
          .where('id', router.matchers.number())
          .as('app.lotesDistritos.update')
        router
          .delete('lotes-por-distrito/:id', [controllers.admin.LotesDistritos, 'destroy'])
          .where('id', router.matchers.number())
          .as('app.lotesDistritos.destroy')

        // Singletons institucionales (GET show + POST update)
        router
          .get('quienes-somos', [controllers.admin.singletons.QuienesSomos, 'show'])
          .as('app.quienesSomos.show')
        router
          .post('quienes-somos', [controllers.admin.singletons.QuienesSomos, 'update'])
          .as('app.quienesSomos.update')
        router
          .get('trayectoria', [controllers.admin.singletons.Trayectoria, 'show'])
          .as('app.trayectoria.show')
        router
          .post('trayectoria', [controllers.admin.singletons.Trayectoria, 'update'])
          .as('app.trayectoria.update')
        router.get('mision', [controllers.admin.singletons.Mision, 'show']).as('app.mision.show')
        router
          .post('mision', [controllers.admin.singletons.Mision, 'update'])
          .as('app.mision.update')
        router.get('vision', [controllers.admin.singletons.Vision, 'show']).as('app.vision.show')
        router
          .post('vision', [controllers.admin.singletons.Vision, 'update'])
          .as('app.vision.update')
        router
          .get('producto', [controllers.admin.singletons.Producto, 'show'])
          .as('app.producto.show')
        router
          .post('producto', [controllers.admin.singletons.Producto, 'update'])
          .as('app.producto.update')
      })
      .use(middleware.role({ nivelMinimo: NIVEL_VENDEDOR }))

    /*
    |----------------------------------------------------------------------
    | Secciones sensibles → SOLO Administrador (nivel 1): leads con datos
    | personales de interesados y gestión de usuarios (admin y app móvil).
    |----------------------------------------------------------------------
    */
    router
      .group(() => {
        // Leads: SOLO lectura + export + eliminar (sin store/update a propósito)
        router.get('leads', [controllers.admin.Leads, 'index']).as('app.leads.index')
        router.get('leads/export', [controllers.admin.Leads, 'export']).as('app.leads.export')
        router
          .delete('leads/:id', [controllers.admin.Leads, 'destroy'])
          .where('id', router.matchers.number())
          .as('app.leads.destroy')
        router
          .post('leads/destroy-masivo', [controllers.admin.Leads, 'destroyMasivo'])
          .as('app.leads.destroyMasivo')

        // Usuarios App (vendedores de la app móvil)
        router
          .get('usuarios-app', [controllers.admin.UsuariosApp, 'index'])
          .as('app.usuariosApp.index')
        router
          .get('usuarios-app/export', [controllers.admin.UsuariosApp, 'export'])
          .as('app.usuariosApp.export')
        router
          .post('usuarios-app', [controllers.admin.UsuariosApp, 'store'])
          .as('app.usuariosApp.store')
        router
          .put('usuarios-app/:id', [controllers.admin.UsuariosApp, 'update'])
          .where('id', router.matchers.number())
          .as('app.usuariosApp.update')
        router
          .delete('usuarios-app/:id', [controllers.admin.UsuariosApp, 'destroy'])
          .where('id', router.matchers.number())
          .as('app.usuariosApp.destroy')
        router
          .post('usuarios-app/destroy-masivo', [controllers.admin.UsuariosApp, 'destroyMasivo'])
          .as('app.usuariosApp.destroyMasivo')

        // Usuarios reales del admin (motor + contraseña temporal + reset)
        router.get('usuarios', [controllers.admin.Usuarios, 'index']).as('app.usuarios.index')
        router
          .get('usuarios/export', [controllers.admin.Usuarios, 'export'])
          .as('app.usuarios.export')
        router.post('usuarios', [controllers.admin.Usuarios, 'store']).as('app.usuarios.store')
        router
          .put('usuarios/:id', [controllers.admin.Usuarios, 'update'])
          .where('id', router.matchers.number())
          .as('app.usuarios.update')
        router
          .post('usuarios/:id/reset-password', [controllers.admin.Usuarios, 'resetPassword'])
          .where('id', router.matchers.number())
          .as('app.usuarios.resetPassword')
        router
          .delete('usuarios/:id', [controllers.admin.Usuarios, 'destroy'])
          .where('id', router.matchers.number())
          .as('app.usuarios.destroy')
        router
          .post('usuarios/destroy-masivo', [controllers.admin.Usuarios, 'destroyMasivo'])
          .as('app.usuarios.destroyMasivo')
      })
      .use(middleware.role({ nivelMinimo: NIVEL_ADMINISTRADOR }))
  })
  .prefix('app')
  .use(middleware.auth())
