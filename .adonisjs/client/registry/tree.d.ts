/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  drive: {
    fs: {
      serve: typeof routes['drive.fs.serve']
    }
  }
  home: typeof routes['home']
  public: {
    quienesSomos: typeof routes['public.quienesSomos']
    parking: typeof routes['public.parking']
    abasGuarda: typeof routes['public.abasGuarda']
    contacto: {
      show: typeof routes['public.contacto.show']
      store: typeof routes['public.contacto.store']
    }
    robots: typeof routes['public.robots']
    sitemap: typeof routes['public.sitemap']
    loteamientos: typeof routes['public.loteamientos'] & {
      detalle: typeof routes['public.loteamientos.detalle']
      comprar: typeof routes['public.loteamientos.comprar']
    }
  }
  styleguide: typeof routes['styleguide']
  auth: {
    login: typeof routes['auth.login'] & {
      show: typeof routes['auth.login.show']
    }
    forgot: typeof routes['auth.forgot'] & {
      show: typeof routes['auth.forgot.show']
    }
    reset: typeof routes['auth.reset'] & {
      show: typeof routes['auth.reset.show']
    }
    logout: typeof routes['auth.logout']
  }
  api: {
    file: {
      public: typeof routes['api.file.public']
    }
    uploads: {
      store: typeof routes['api.uploads.store']
    }
  }
  app: {
    dashboard: typeof routes['app.dashboard']
    perfil: typeof routes['app.perfil'] & {
      password: typeof routes['app.perfil.password']
    }
    sucursales: {
      index: typeof routes['app.sucursales.index']
      export: typeof routes['app.sucursales.export']
      store: typeof routes['app.sucursales.store']
      update: typeof routes['app.sucursales.update']
      destroy: typeof routes['app.sucursales.destroy']
      destroyMasivo: typeof routes['app.sucursales.destroyMasivo']
    }
    carruseles: {
      index: typeof routes['app.carruseles.index']
      export: typeof routes['app.carruseles.export']
      store: typeof routes['app.carruseles.store']
      update: typeof routes['app.carruseles.update']
      destroy: typeof routes['app.carruseles.destroy']
      destroyMasivo: typeof routes['app.carruseles.destroyMasivo']
    }
    redesSociales: {
      index: typeof routes['app.redesSociales.index']
      export: typeof routes['app.redesSociales.export']
      store: typeof routes['app.redesSociales.store']
      update: typeof routes['app.redesSociales.update']
      destroy: typeof routes['app.redesSociales.destroy']
      destroyMasivo: typeof routes['app.redesSociales.destroyMasivo']
    }
    promociones: {
      index: typeof routes['app.promociones.index']
      export: typeof routes['app.promociones.export']
      store: typeof routes['app.promociones.store']
      update: typeof routes['app.promociones.update']
      destroy: typeof routes['app.promociones.destroy']
      destroyMasivo: typeof routes['app.promociones.destroyMasivo']
    }
    alquileres: {
      index: typeof routes['app.alquileres.index']
      export: typeof routes['app.alquileres.export']
      store: typeof routes['app.alquileres.store']
      update: typeof routes['app.alquileres.update']
      destroy: typeof routes['app.alquileres.destroy']
      destroyMasivo: typeof routes['app.alquileres.destroyMasivo']
    }
    fracciones: {
      index: typeof routes['app.fracciones.index']
      export: typeof routes['app.fracciones.export']
      update: typeof routes['app.fracciones.update']
    }
    planos: {
      index: typeof routes['app.planos.index']
      export: typeof routes['app.planos.export']
      store: typeof routes['app.planos.store']
      update: typeof routes['app.planos.update']
      destroy: typeof routes['app.planos.destroy']
      destroyMasivo: typeof routes['app.planos.destroyMasivo']
    }
    colores: {
      index: typeof routes['app.colores.index']
      update: typeof routes['app.colores.update']
    }
    lotesDistritos: {
      index: typeof routes['app.lotesDistritos.index']
      store: typeof routes['app.lotesDistritos.store']
      update: typeof routes['app.lotesDistritos.update']
      destroy: typeof routes['app.lotesDistritos.destroy']
    }
    ofrecemos: {
      index: typeof routes['app.ofrecemos.index']
      export: typeof routes['app.ofrecemos.export']
      store: typeof routes['app.ofrecemos.store']
      update: typeof routes['app.ofrecemos.update']
      destroy: typeof routes['app.ofrecemos.destroy']
      destroyMasivo: typeof routes['app.ofrecemos.destroyMasivo']
    }
    horarios: {
      index: typeof routes['app.horarios.index']
      export: typeof routes['app.horarios.export']
      store: typeof routes['app.horarios.store']
      update: typeof routes['app.horarios.update']
      destroy: typeof routes['app.horarios.destroy']
      destroyMasivo: typeof routes['app.horarios.destroyMasivo']
    }
    direccionContacto: {
      index: typeof routes['app.direccionContacto.index']
      export: typeof routes['app.direccionContacto.export']
      store: typeof routes['app.direccionContacto.store']
      update: typeof routes['app.direccionContacto.update']
      destroy: typeof routes['app.direccionContacto.destroy']
      destroyMasivo: typeof routes['app.direccionContacto.destroyMasivo']
    }
    quienesSomos: {
      show: typeof routes['app.quienesSomos.show']
      update: typeof routes['app.quienesSomos.update']
    }
    trayectoria: {
      show: typeof routes['app.trayectoria.show']
      update: typeof routes['app.trayectoria.update']
    }
    mision: {
      show: typeof routes['app.mision.show']
      update: typeof routes['app.mision.update']
    }
    vision: {
      show: typeof routes['app.vision.show']
      update: typeof routes['app.vision.update']
    }
    producto: {
      show: typeof routes['app.producto.show']
      update: typeof routes['app.producto.update']
    }
    parking: {
      show: typeof routes['app.parking.show']
      update: typeof routes['app.parking.update']
    }
    leads: {
      index: typeof routes['app.leads.index']
      export: typeof routes['app.leads.export']
      destroy: typeof routes['app.leads.destroy']
      destroyMasivo: typeof routes['app.leads.destroyMasivo']
    }
    usuariosApp: {
      index: typeof routes['app.usuariosApp.index']
      export: typeof routes['app.usuariosApp.export']
      store: typeof routes['app.usuariosApp.store']
      update: typeof routes['app.usuariosApp.update']
      destroy: typeof routes['app.usuariosApp.destroy']
      destroyMasivo: typeof routes['app.usuariosApp.destroyMasivo']
    }
    usuarios: {
      index: typeof routes['app.usuarios.index']
      export: typeof routes['app.usuarios.export']
      store: typeof routes['app.usuarios.store']
      update: typeof routes['app.usuarios.update']
      resetPassword: typeof routes['app.usuarios.resetPassword']
      destroy: typeof routes['app.usuarios.destroy']
      destroyMasivo: typeof routes['app.usuarios.destroyMasivo']
    }
  }
}
