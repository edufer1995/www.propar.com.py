/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'drive.fs.serve': {
    methods: ["GET","HEAD"]
    pattern: '/uploads/*'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { '*': ParamValue[] }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'home': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public/home_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public/home_controller').default['index']>>>
    }
  }
  'public.quienesSomos': {
    methods: ["GET","HEAD"]
    pattern: '/quienes-somos'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public/quienes_somos_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public/quienes_somos_controller').default['index']>>>
    }
  }
  'public.contacto.show': {
    methods: ["GET","HEAD"]
    pattern: '/contacto'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public/contacto_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public/contacto_controller').default['show']>>>
    }
  }
  'public.contacto.store': {
    methods: ["POST"]
    pattern: '/contacto'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/contacto').contactoValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/contacto').contactoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public/contacto_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public/contacto_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'public.preguntas': {
    methods: ["GET","HEAD"]
    pattern: '/preguntas-frecuentes'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public/preguntas_frecuentes_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public/preguntas_frecuentes_controller').default['index']>>>
    }
  }
  'public.vender.show': {
    methods: ["GET","HEAD"]
    pattern: '/deseo-vender'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public/deseo_vender_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public/deseo_vender_controller').default['show']>>>
    }
  }
  'public.vender.store': {
    methods: ["POST"]
    pattern: '/deseo-vender'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/vender').venderValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/vender').venderValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public/deseo_vender_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public/deseo_vender_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'public.robots': {
    methods: ["GET","HEAD"]
    pattern: '/robots.txt'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public/seo_controller').default['robots']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public/seo_controller').default['robots']>>>
    }
  }
  'public.sitemap': {
    methods: ["GET","HEAD"]
    pattern: '/sitemap.xml'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public/seo_controller').default['sitemap']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public/seo_controller').default['sitemap']>>>
    }
  }
  'public.loteamientos': {
    methods: ["GET","HEAD"]
    pattern: '/loteamientos'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/loteamientos').filtrosLoteamientosValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public/loteamientos_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public/loteamientos_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'public.loteamientos.detalle': {
    methods: ["GET","HEAD"]
    pattern: '/loteamientos/fracciones/:codigo/detalle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { codigo: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public/loteamientos_controller').default['detalle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public/loteamientos_controller').default['detalle']>>>
    }
  }
  'public.loteamientos.comprar': {
    methods: ["POST"]
    pattern: '/loteamientos/comprar'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/loteamientos').comprarLoteValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/loteamientos').comprarLoteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public/loteamientos_controller').default['comprar']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public/loteamientos_controller').default['comprar']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'styleguide': {
    methods: ["GET","HEAD"]
    pattern: '/styleguide'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'auth.login.show': {
    methods: ["GET","HEAD"]
    pattern: '/auth/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['create']>>>
    }
  }
  'auth.login': {
    methods: ["POST"]
    pattern: '/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.forgot.show': {
    methods: ["GET","HEAD"]
    pattern: '/auth/forgot-password'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/password_reset_controller').default['forgot']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/password_reset_controller').default['forgot']>>>
    }
  }
  'auth.forgot': {
    methods: ["POST"]
    pattern: '/auth/forgot-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').forgotPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').forgotPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/password_reset_controller').default['send']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/password_reset_controller').default['send']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.reset.show': {
    methods: ["GET","HEAD"]
    pattern: '/auth/reset-password/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/password_reset_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/password_reset_controller').default['show']>>>
    }
  }
  'auth.reset': {
    methods: ["POST"]
    pattern: '/auth/reset-password/:token'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').resetPasswordValidator)>>
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').resetPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/password_reset_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/password_reset_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.logout': {
    methods: ["POST"]
    pattern: '/auth/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['destroy']>>>
    }
  }
  'api.file.public': {
    methods: ["GET","HEAD"]
    pattern: '/api/file/public/:link'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { link: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/files_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/files_controller').default['show']>>>
    }
  }
  'api.uploads.store': {
    methods: ["POST"]
    pattern: '/api/uploads'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api/uploads_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api/uploads_controller').default['store']>>>
    }
  }
  'app.dashboard': {
    methods: ["GET","HEAD"]
    pattern: '/app'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app/dashboard_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app/dashboard_controller').default['index']>>>
    }
  }
  'app.perfil': {
    methods: ["GET","HEAD"]
    pattern: '/app/perfil'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app/perfil_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app/perfil_controller').default['show']>>>
    }
  }
  'app.perfil.password': {
    methods: ["POST"]
    pattern: '/app/perfil/password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth').changePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth').changePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/app/perfil_controller').default['updatePassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/app/perfil_controller').default['updatePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'app.sucursales.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/sucursales'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/sucursales_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/sucursales_controller').default['index']>>>
    }
  }
  'app.sucursales.export': {
    methods: ["GET","HEAD"]
    pattern: '/app/sucursales/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/sucursales_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/sucursales_controller').default['export']>>>
    }
  }
  'app.sucursales.store': {
    methods: ["POST"]
    pattern: '/app/sucursales'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/sucursales_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/sucursales_controller').default['store']>>>
    }
  }
  'app.sucursales.update': {
    methods: ["PUT"]
    pattern: '/app/sucursales/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/sucursales_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/sucursales_controller').default['update']>>>
    }
  }
  'app.sucursales.destroy': {
    methods: ["DELETE"]
    pattern: '/app/sucursales/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/sucursales_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/sucursales_controller').default['destroy']>>>
    }
  }
  'app.sucursales.destroyMasivo': {
    methods: ["POST"]
    pattern: '/app/sucursales/destroy-masivo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/sucursales_controller').default['destroyMasivo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/sucursales_controller').default['destroyMasivo']>>>
    }
  }
  'app.preguntas.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/preguntas'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/preguntas_frecuentes_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/preguntas_frecuentes_controller').default['index']>>>
    }
  }
  'app.preguntas.export': {
    methods: ["GET","HEAD"]
    pattern: '/app/preguntas/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/preguntas_frecuentes_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/preguntas_frecuentes_controller').default['export']>>>
    }
  }
  'app.preguntas.store': {
    methods: ["POST"]
    pattern: '/app/preguntas'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/preguntas_frecuentes_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/preguntas_frecuentes_controller').default['store']>>>
    }
  }
  'app.preguntas.update': {
    methods: ["PUT"]
    pattern: '/app/preguntas/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/preguntas_frecuentes_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/preguntas_frecuentes_controller').default['update']>>>
    }
  }
  'app.preguntas.destroy': {
    methods: ["DELETE"]
    pattern: '/app/preguntas/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/preguntas_frecuentes_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/preguntas_frecuentes_controller').default['destroy']>>>
    }
  }
  'app.preguntas.destroyMasivo': {
    methods: ["POST"]
    pattern: '/app/preguntas/destroy-masivo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/preguntas_frecuentes_controller').default['destroyMasivo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/preguntas_frecuentes_controller').default['destroyMasivo']>>>
    }
  }
  'app.carruseles.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/carruseles'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/carruseles_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/carruseles_controller').default['index']>>>
    }
  }
  'app.carruseles.export': {
    methods: ["GET","HEAD"]
    pattern: '/app/carruseles/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/carruseles_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/carruseles_controller').default['export']>>>
    }
  }
  'app.carruseles.store': {
    methods: ["POST"]
    pattern: '/app/carruseles'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/carruseles_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/carruseles_controller').default['store']>>>
    }
  }
  'app.carruseles.update': {
    methods: ["PUT"]
    pattern: '/app/carruseles/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/carruseles_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/carruseles_controller').default['update']>>>
    }
  }
  'app.carruseles.destroy': {
    methods: ["DELETE"]
    pattern: '/app/carruseles/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/carruseles_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/carruseles_controller').default['destroy']>>>
    }
  }
  'app.carruseles.destroyMasivo': {
    methods: ["POST"]
    pattern: '/app/carruseles/destroy-masivo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/carruseles_controller').default['destroyMasivo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/carruseles_controller').default['destroyMasivo']>>>
    }
  }
  'app.redesSociales.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/redes-sociales'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/redes_sociales_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/redes_sociales_controller').default['index']>>>
    }
  }
  'app.redesSociales.export': {
    methods: ["GET","HEAD"]
    pattern: '/app/redes-sociales/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/redes_sociales_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/redes_sociales_controller').default['export']>>>
    }
  }
  'app.redesSociales.store': {
    methods: ["POST"]
    pattern: '/app/redes-sociales'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/redes_sociales_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/redes_sociales_controller').default['store']>>>
    }
  }
  'app.redesSociales.update': {
    methods: ["PUT"]
    pattern: '/app/redes-sociales/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/redes_sociales_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/redes_sociales_controller').default['update']>>>
    }
  }
  'app.redesSociales.destroy': {
    methods: ["DELETE"]
    pattern: '/app/redes-sociales/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/redes_sociales_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/redes_sociales_controller').default['destroy']>>>
    }
  }
  'app.redesSociales.destroyMasivo': {
    methods: ["POST"]
    pattern: '/app/redes-sociales/destroy-masivo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/redes_sociales_controller').default['destroyMasivo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/redes_sociales_controller').default['destroyMasivo']>>>
    }
  }
  'app.promociones.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/promociones'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/promociones_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/promociones_controller').default['index']>>>
    }
  }
  'app.promociones.export': {
    methods: ["GET","HEAD"]
    pattern: '/app/promociones/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/promociones_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/promociones_controller').default['export']>>>
    }
  }
  'app.promociones.store': {
    methods: ["POST"]
    pattern: '/app/promociones'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/promociones_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/promociones_controller').default['store']>>>
    }
  }
  'app.promociones.update': {
    methods: ["PUT"]
    pattern: '/app/promociones/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/promociones_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/promociones_controller').default['update']>>>
    }
  }
  'app.promociones.destroy': {
    methods: ["DELETE"]
    pattern: '/app/promociones/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/promociones_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/promociones_controller').default['destroy']>>>
    }
  }
  'app.promociones.destroyMasivo': {
    methods: ["POST"]
    pattern: '/app/promociones/destroy-masivo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/promociones_controller').default['destroyMasivo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/promociones_controller').default['destroyMasivo']>>>
    }
  }
  'app.fracciones.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/fracciones'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/fracciones_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/fracciones_controller').default['index']>>>
    }
  }
  'app.fracciones.export': {
    methods: ["GET","HEAD"]
    pattern: '/app/fracciones/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/fracciones_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/fracciones_controller').default['export']>>>
    }
  }
  'app.fracciones.update': {
    methods: ["PUT"]
    pattern: '/app/fracciones/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/fracciones_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/fracciones_controller').default['update']>>>
    }
  }
  'app.planos.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/planos'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/planos_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/planos_controller').default['index']>>>
    }
  }
  'app.planos.export': {
    methods: ["GET","HEAD"]
    pattern: '/app/planos/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/planos_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/planos_controller').default['export']>>>
    }
  }
  'app.planos.store': {
    methods: ["POST"]
    pattern: '/app/planos'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/planos_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/planos_controller').default['store']>>>
    }
  }
  'app.planos.update': {
    methods: ["PUT"]
    pattern: '/app/planos/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/planos_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/planos_controller').default['update']>>>
    }
  }
  'app.planos.destroy': {
    methods: ["DELETE"]
    pattern: '/app/planos/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/planos_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/planos_controller').default['destroy']>>>
    }
  }
  'app.planos.destroyMasivo': {
    methods: ["POST"]
    pattern: '/app/planos/destroy-masivo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/planos_controller').default['destroyMasivo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/planos_controller').default['destroyMasivo']>>>
    }
  }
  'app.colores.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/colores'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/colores_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/colores_controller').default['index']>>>
    }
  }
  'app.colores.update': {
    methods: ["POST"]
    pattern: '/app/colores'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/colores_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/colores_controller').default['update']>>>
    }
  }
  'app.lotesDistritos.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/lotes-por-distrito'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/lotes_distritos_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/lotes_distritos_controller').default['index']>>>
    }
  }
  'app.lotesDistritos.store': {
    methods: ["POST"]
    pattern: '/app/lotes-por-distrito'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/admin/singletons').loteDistritoValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/admin/singletons').loteDistritoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/lotes_distritos_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/lotes_distritos_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'app.lotesDistritos.update': {
    methods: ["PUT"]
    pattern: '/app/lotes-por-distrito/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/admin/singletons').loteDistritoValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/admin/singletons').loteDistritoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/lotes_distritos_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/lotes_distritos_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'app.lotesDistritos.destroy': {
    methods: ["DELETE"]
    pattern: '/app/lotes-por-distrito/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/lotes_distritos_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/lotes_distritos_controller').default['destroy']>>>
    }
  }
  'app.quienesSomos.show': {
    methods: ["GET","HEAD"]
    pattern: '/app/quienes-somos'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/singletons/quienes_somos_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/singletons/quienes_somos_controller').default['show']>>>
    }
  }
  'app.quienesSomos.update': {
    methods: ["POST"]
    pattern: '/app/quienes-somos'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/singletons/quienes_somos_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/singletons/quienes_somos_controller').default['update']>>>
    }
  }
  'app.trayectoria.show': {
    methods: ["GET","HEAD"]
    pattern: '/app/trayectoria'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/singletons/trayectoria_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/singletons/trayectoria_controller').default['show']>>>
    }
  }
  'app.trayectoria.update': {
    methods: ["POST"]
    pattern: '/app/trayectoria'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/singletons/trayectoria_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/singletons/trayectoria_controller').default['update']>>>
    }
  }
  'app.mision.show': {
    methods: ["GET","HEAD"]
    pattern: '/app/mision'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/singletons/mision_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/singletons/mision_controller').default['show']>>>
    }
  }
  'app.mision.update': {
    methods: ["POST"]
    pattern: '/app/mision'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/singletons/mision_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/singletons/mision_controller').default['update']>>>
    }
  }
  'app.vision.show': {
    methods: ["GET","HEAD"]
    pattern: '/app/vision'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/singletons/vision_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/singletons/vision_controller').default['show']>>>
    }
  }
  'app.vision.update': {
    methods: ["POST"]
    pattern: '/app/vision'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/singletons/vision_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/singletons/vision_controller').default['update']>>>
    }
  }
  'app.producto.show': {
    methods: ["GET","HEAD"]
    pattern: '/app/producto'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/singletons/producto_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/singletons/producto_controller').default['show']>>>
    }
  }
  'app.producto.update': {
    methods: ["POST"]
    pattern: '/app/producto'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/singletons/producto_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/singletons/producto_controller').default['update']>>>
    }
  }
  'app.leads.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/leads'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/leads_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/leads_controller').default['index']>>>
    }
  }
  'app.leads.export': {
    methods: ["GET","HEAD"]
    pattern: '/app/leads/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/leads_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/leads_controller').default['export']>>>
    }
  }
  'app.leads.destroy': {
    methods: ["DELETE"]
    pattern: '/app/leads/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/leads_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/leads_controller').default['destroy']>>>
    }
  }
  'app.leads.destroyMasivo': {
    methods: ["POST"]
    pattern: '/app/leads/destroy-masivo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/leads_controller').default['destroyMasivo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/leads_controller').default['destroyMasivo']>>>
    }
  }
  'app.usuariosApp.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/usuarios-app'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_app_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_app_controller').default['index']>>>
    }
  }
  'app.usuariosApp.export': {
    methods: ["GET","HEAD"]
    pattern: '/app/usuarios-app/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_app_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_app_controller').default['export']>>>
    }
  }
  'app.usuariosApp.store': {
    methods: ["POST"]
    pattern: '/app/usuarios-app'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_app_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_app_controller').default['store']>>>
    }
  }
  'app.usuariosApp.update': {
    methods: ["PUT"]
    pattern: '/app/usuarios-app/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_app_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_app_controller').default['update']>>>
    }
  }
  'app.usuariosApp.destroy': {
    methods: ["DELETE"]
    pattern: '/app/usuarios-app/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_app_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_app_controller').default['destroy']>>>
    }
  }
  'app.usuariosApp.destroyMasivo': {
    methods: ["POST"]
    pattern: '/app/usuarios-app/destroy-masivo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_app_controller').default['destroyMasivo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_app_controller').default['destroyMasivo']>>>
    }
  }
  'app.usuarios.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/usuarios'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['index']>>>
    }
  }
  'app.usuarios.export': {
    methods: ["GET","HEAD"]
    pattern: '/app/usuarios/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['export']>>>
    }
  }
  'app.usuarios.store': {
    methods: ["POST"]
    pattern: '/app/usuarios'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/admin/usuarios').crearUsuarioValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/admin/usuarios').crearUsuarioValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'app.usuarios.update': {
    methods: ["PUT"]
    pattern: '/app/usuarios/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['update']>>>
    }
  }
  'app.usuarios.resetPassword': {
    methods: ["POST"]
    pattern: '/app/usuarios/:id/reset-password'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['resetPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['resetPassword']>>>
    }
  }
  'app.usuarios.destroy': {
    methods: ["DELETE"]
    pattern: '/app/usuarios/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['destroy']>>>
    }
  }
  'app.usuarios.destroyMasivo': {
    methods: ["POST"]
    pattern: '/app/usuarios/destroy-masivo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['destroyMasivo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/usuarios_controller').default['destroyMasivo']>>>
    }
  }
}
