/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| The validator file is used for configuring global transforms for VineJS.
| The transform below converts all VineJS date outputs from JavaScript
| Date objects to Luxon DateTime instances, so that validated dates are
| ready to use with Lucid models and other parts of the app that expect
| Luxon DateTime.
|
*/

import { DateTime } from 'luxon'
import vine, { SimpleMessagesProvider, VineDate } from '@vinejs/vine'

declare module '@vinejs/vine/types' {
  interface VineGlobalTransforms {
    date: DateTime
  }
}

VineDate.transform((value) => DateTime.fromJSDate(value))

/**
 * Mensajes de validación en español (es-PY) para toda la app.
 * Los nombres de campos se traducen en el segundo argumento.
 */
vine.messagesProvider = new SimpleMessagesProvider(
  {
    'required': 'El campo {{ field }} es obligatorio',
    'string': 'El campo {{ field }} debe ser un texto',
    'email': 'Ingresá un email válido',
    'minLength': 'El campo {{ field }} debe tener al menos {{ min }} caracteres',
    'maxLength': 'El campo {{ field }} no puede superar los {{ max }} caracteres',
    'confirmed': 'Las contraseñas no coinciden',
    'boolean': 'El valor del campo {{ field }} no es válido',
    'database.unique': 'El valor de {{ field }} ya está en uso',

    'enum': 'El valor del campo {{ field }} no es válido',

    // Overrides por campo puntual
    'username.required': 'Ingresá tu usuario o email',
    'password.required': 'Ingresá tu contraseña',
    'currentPassword.required': 'Ingresá tu contraseña actual',
    'email.required': 'Ingresá tu email',
    'password.confirmed': 'Las contraseñas no coinciden',

    // Formulario de contacto público
    'nombre.required': 'Ingresa tu nombre',
    'apellido.required': 'Ingresa tu apellido',
    'telefono.required': 'Ingresa un teléfono',
    'correo.required': 'Ingresa tu correo',
    'correo.email': 'Ingresa un correo electrónico válido',
    'asunto.required': 'Selecciona un asunto',
    'asunto.enum': 'Selecciona un asunto válido',
    'consulta.required': 'Ingresa tu consulta',
  },
  {
    username: 'usuario',
    password: 'contraseña',
    passwordConfirmation: 'confirmación de contraseña',
    currentPassword: 'contraseña actual',
    email: 'email',
    nombre: 'nombre',
    remember: 'recordarme',
    apellido: 'apellido',
    telefono: 'teléfono',
    correo: 'correo',
    asunto: 'asunto',
    consulta: 'consulta',
  }
)
