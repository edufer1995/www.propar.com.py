import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'home': { paramsTuple?: []; params?: {} }
    'public.quienesSomos': { paramsTuple?: []; params?: {} }
    'public.contacto.show': { paramsTuple?: []; params?: {} }
    'public.contacto.store': { paramsTuple?: []; params?: {} }
    'public.robots': { paramsTuple?: []; params?: {} }
    'public.sitemap': { paramsTuple?: []; params?: {} }
    'public.loteamientos': { paramsTuple?: []; params?: {} }
    'public.loteamientos.detalle': { paramsTuple: [ParamValue]; params: {'codigo': ParamValue} }
    'public.loteamientos.comprar': { paramsTuple?: []; params?: {} }
    'styleguide': { paramsTuple?: []; params?: {} }
    'auth.login.show': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.forgot.show': { paramsTuple?: []; params?: {} }
    'auth.forgot': { paramsTuple?: []; params?: {} }
    'auth.reset.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'auth.reset': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'api.file.public': { paramsTuple: [ParamValue]; params: {'link': ParamValue} }
    'api.uploads.store': { paramsTuple?: []; params?: {} }
    'app.dashboard': { paramsTuple?: []; params?: {} }
    'app.perfil': { paramsTuple?: []; params?: {} }
    'app.perfil.password': { paramsTuple?: []; params?: {} }
    'app.sucursales.index': { paramsTuple?: []; params?: {} }
    'app.sucursales.export': { paramsTuple?: []; params?: {} }
    'app.sucursales.store': { paramsTuple?: []; params?: {} }
    'app.sucursales.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.sucursales.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.sucursales.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.carruseles.index': { paramsTuple?: []; params?: {} }
    'app.carruseles.export': { paramsTuple?: []; params?: {} }
    'app.carruseles.store': { paramsTuple?: []; params?: {} }
    'app.carruseles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.carruseles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.carruseles.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.redesSociales.index': { paramsTuple?: []; params?: {} }
    'app.redesSociales.export': { paramsTuple?: []; params?: {} }
    'app.redesSociales.store': { paramsTuple?: []; params?: {} }
    'app.redesSociales.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.redesSociales.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.redesSociales.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.promociones.index': { paramsTuple?: []; params?: {} }
    'app.promociones.export': { paramsTuple?: []; params?: {} }
    'app.promociones.store': { paramsTuple?: []; params?: {} }
    'app.promociones.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.promociones.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.promociones.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.fracciones.index': { paramsTuple?: []; params?: {} }
    'app.fracciones.export': { paramsTuple?: []; params?: {} }
    'app.fracciones.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.planos.index': { paramsTuple?: []; params?: {} }
    'app.planos.export': { paramsTuple?: []; params?: {} }
    'app.planos.store': { paramsTuple?: []; params?: {} }
    'app.planos.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.planos.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.planos.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.colores.index': { paramsTuple?: []; params?: {} }
    'app.colores.update': { paramsTuple?: []; params?: {} }
    'app.lotesDistritos.index': { paramsTuple?: []; params?: {} }
    'app.lotesDistritos.store': { paramsTuple?: []; params?: {} }
    'app.lotesDistritos.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.lotesDistritos.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.quienesSomos.show': { paramsTuple?: []; params?: {} }
    'app.quienesSomos.update': { paramsTuple?: []; params?: {} }
    'app.trayectoria.show': { paramsTuple?: []; params?: {} }
    'app.trayectoria.update': { paramsTuple?: []; params?: {} }
    'app.mision.show': { paramsTuple?: []; params?: {} }
    'app.mision.update': { paramsTuple?: []; params?: {} }
    'app.vision.show': { paramsTuple?: []; params?: {} }
    'app.vision.update': { paramsTuple?: []; params?: {} }
    'app.producto.show': { paramsTuple?: []; params?: {} }
    'app.producto.update': { paramsTuple?: []; params?: {} }
    'app.leads.index': { paramsTuple?: []; params?: {} }
    'app.leads.export': { paramsTuple?: []; params?: {} }
    'app.leads.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.leads.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.usuariosApp.index': { paramsTuple?: []; params?: {} }
    'app.usuariosApp.export': { paramsTuple?: []; params?: {} }
    'app.usuariosApp.store': { paramsTuple?: []; params?: {} }
    'app.usuariosApp.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.usuariosApp.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.usuariosApp.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.usuarios.index': { paramsTuple?: []; params?: {} }
    'app.usuarios.export': { paramsTuple?: []; params?: {} }
    'app.usuarios.store': { paramsTuple?: []; params?: {} }
    'app.usuarios.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.usuarios.resetPassword': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.usuarios.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.usuarios.destroyMasivo': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'home': { paramsTuple?: []; params?: {} }
    'public.quienesSomos': { paramsTuple?: []; params?: {} }
    'public.contacto.show': { paramsTuple?: []; params?: {} }
    'public.robots': { paramsTuple?: []; params?: {} }
    'public.sitemap': { paramsTuple?: []; params?: {} }
    'public.loteamientos': { paramsTuple?: []; params?: {} }
    'public.loteamientos.detalle': { paramsTuple: [ParamValue]; params: {'codigo': ParamValue} }
    'styleguide': { paramsTuple?: []; params?: {} }
    'auth.login.show': { paramsTuple?: []; params?: {} }
    'auth.forgot.show': { paramsTuple?: []; params?: {} }
    'auth.reset.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'api.file.public': { paramsTuple: [ParamValue]; params: {'link': ParamValue} }
    'app.dashboard': { paramsTuple?: []; params?: {} }
    'app.perfil': { paramsTuple?: []; params?: {} }
    'app.sucursales.index': { paramsTuple?: []; params?: {} }
    'app.sucursales.export': { paramsTuple?: []; params?: {} }
    'app.carruseles.index': { paramsTuple?: []; params?: {} }
    'app.carruseles.export': { paramsTuple?: []; params?: {} }
    'app.redesSociales.index': { paramsTuple?: []; params?: {} }
    'app.redesSociales.export': { paramsTuple?: []; params?: {} }
    'app.promociones.index': { paramsTuple?: []; params?: {} }
    'app.promociones.export': { paramsTuple?: []; params?: {} }
    'app.fracciones.index': { paramsTuple?: []; params?: {} }
    'app.fracciones.export': { paramsTuple?: []; params?: {} }
    'app.planos.index': { paramsTuple?: []; params?: {} }
    'app.planos.export': { paramsTuple?: []; params?: {} }
    'app.colores.index': { paramsTuple?: []; params?: {} }
    'app.lotesDistritos.index': { paramsTuple?: []; params?: {} }
    'app.quienesSomos.show': { paramsTuple?: []; params?: {} }
    'app.trayectoria.show': { paramsTuple?: []; params?: {} }
    'app.mision.show': { paramsTuple?: []; params?: {} }
    'app.vision.show': { paramsTuple?: []; params?: {} }
    'app.producto.show': { paramsTuple?: []; params?: {} }
    'app.leads.index': { paramsTuple?: []; params?: {} }
    'app.leads.export': { paramsTuple?: []; params?: {} }
    'app.usuariosApp.index': { paramsTuple?: []; params?: {} }
    'app.usuariosApp.export': { paramsTuple?: []; params?: {} }
    'app.usuarios.index': { paramsTuple?: []; params?: {} }
    'app.usuarios.export': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'home': { paramsTuple?: []; params?: {} }
    'public.quienesSomos': { paramsTuple?: []; params?: {} }
    'public.contacto.show': { paramsTuple?: []; params?: {} }
    'public.robots': { paramsTuple?: []; params?: {} }
    'public.sitemap': { paramsTuple?: []; params?: {} }
    'public.loteamientos': { paramsTuple?: []; params?: {} }
    'public.loteamientos.detalle': { paramsTuple: [ParamValue]; params: {'codigo': ParamValue} }
    'styleguide': { paramsTuple?: []; params?: {} }
    'auth.login.show': { paramsTuple?: []; params?: {} }
    'auth.forgot.show': { paramsTuple?: []; params?: {} }
    'auth.reset.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'api.file.public': { paramsTuple: [ParamValue]; params: {'link': ParamValue} }
    'app.dashboard': { paramsTuple?: []; params?: {} }
    'app.perfil': { paramsTuple?: []; params?: {} }
    'app.sucursales.index': { paramsTuple?: []; params?: {} }
    'app.sucursales.export': { paramsTuple?: []; params?: {} }
    'app.carruseles.index': { paramsTuple?: []; params?: {} }
    'app.carruseles.export': { paramsTuple?: []; params?: {} }
    'app.redesSociales.index': { paramsTuple?: []; params?: {} }
    'app.redesSociales.export': { paramsTuple?: []; params?: {} }
    'app.promociones.index': { paramsTuple?: []; params?: {} }
    'app.promociones.export': { paramsTuple?: []; params?: {} }
    'app.fracciones.index': { paramsTuple?: []; params?: {} }
    'app.fracciones.export': { paramsTuple?: []; params?: {} }
    'app.planos.index': { paramsTuple?: []; params?: {} }
    'app.planos.export': { paramsTuple?: []; params?: {} }
    'app.colores.index': { paramsTuple?: []; params?: {} }
    'app.lotesDistritos.index': { paramsTuple?: []; params?: {} }
    'app.quienesSomos.show': { paramsTuple?: []; params?: {} }
    'app.trayectoria.show': { paramsTuple?: []; params?: {} }
    'app.mision.show': { paramsTuple?: []; params?: {} }
    'app.vision.show': { paramsTuple?: []; params?: {} }
    'app.producto.show': { paramsTuple?: []; params?: {} }
    'app.leads.index': { paramsTuple?: []; params?: {} }
    'app.leads.export': { paramsTuple?: []; params?: {} }
    'app.usuariosApp.index': { paramsTuple?: []; params?: {} }
    'app.usuariosApp.export': { paramsTuple?: []; params?: {} }
    'app.usuarios.index': { paramsTuple?: []; params?: {} }
    'app.usuarios.export': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'public.contacto.store': { paramsTuple?: []; params?: {} }
    'public.loteamientos.comprar': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.forgot': { paramsTuple?: []; params?: {} }
    'auth.reset': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'api.uploads.store': { paramsTuple?: []; params?: {} }
    'app.perfil.password': { paramsTuple?: []; params?: {} }
    'app.sucursales.store': { paramsTuple?: []; params?: {} }
    'app.sucursales.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.carruseles.store': { paramsTuple?: []; params?: {} }
    'app.carruseles.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.redesSociales.store': { paramsTuple?: []; params?: {} }
    'app.redesSociales.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.promociones.store': { paramsTuple?: []; params?: {} }
    'app.promociones.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.planos.store': { paramsTuple?: []; params?: {} }
    'app.planos.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.colores.update': { paramsTuple?: []; params?: {} }
    'app.lotesDistritos.store': { paramsTuple?: []; params?: {} }
    'app.quienesSomos.update': { paramsTuple?: []; params?: {} }
    'app.trayectoria.update': { paramsTuple?: []; params?: {} }
    'app.mision.update': { paramsTuple?: []; params?: {} }
    'app.vision.update': { paramsTuple?: []; params?: {} }
    'app.producto.update': { paramsTuple?: []; params?: {} }
    'app.leads.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.usuariosApp.store': { paramsTuple?: []; params?: {} }
    'app.usuariosApp.destroyMasivo': { paramsTuple?: []; params?: {} }
    'app.usuarios.store': { paramsTuple?: []; params?: {} }
    'app.usuarios.resetPassword': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.usuarios.destroyMasivo': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'app.sucursales.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.carruseles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.redesSociales.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.promociones.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.fracciones.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.planos.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.lotesDistritos.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.usuariosApp.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.usuarios.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'app.sucursales.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.carruseles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.redesSociales.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.promociones.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.planos.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.lotesDistritos.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.leads.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.usuariosApp.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'app.usuarios.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}