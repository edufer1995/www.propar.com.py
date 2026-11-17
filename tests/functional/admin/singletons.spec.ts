/*
|--------------------------------------------------------------------------
| Tests de singletons institucionales (Etapa 5b)
|--------------------------------------------------------------------------
|
| Usa "Quiénes somos" como representante del motor: GET show con los
| valores actuales, POST update que persiste sobre la única fila, la
| validación del server y el efecto en la página pública.
|
*/

import { test } from '@japa/runner'

import QuienesSomos from '#models/quienes_somos'
import User from '#models/user'

test.group('Admin / singleton Quiénes somos', (group) => {
  let usuario: User
  let original: { titulo: string | null; parrafoUno: string | null } | null = null

  group.setup(async () => {
    usuario = await User.create({
      username: `test.singleton.${Date.now()}`,
      nombre: 'Test Singleton',
      password: 'secret-de-test',
      rolId: 1,
      activo: true,
    })

    const fila = await QuienesSomos.query().first()
    original = fila ? { titulo: fila.titulo, parrafoUno: fila.parrafoUno } : null

    return async () => {
      if (original) {
        const restaurada = await QuienesSomos.query().firstOrFail()
        restaurada.merge(original)
        await restaurada.save()
      }
      await usuario.delete()
    }
  })

  test('show renderiza el formulario con los datos actuales', async ({ client, assert }) => {
    const respuesta = await client.get('/app/quienes-somos').loginAs(usuario).withInertia()

    respuesta.assertStatus(200)
    respuesta.assertInertiaComponent('admin/singletons/quienes_somos')
    assert.property(respuesta.inertiaProps, 'datos')
    assert.property(respuesta.inertiaProps, 'specs')
  })

  test('update persiste sobre la única fila', async ({ client, assert }) => {
    const antes = await QuienesSomos.query().count('* as total').firstOrFail()

    const respuesta = await client
      .post('/app/quienes-somos')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        titulo: 'Quiénes somos (editado por test)',
        parrafoUno: 'Párrafo de prueba de la Etapa 5b.',
        parrafoDos: null,
        parrafoTres: null,
        parrafoCuatro: null,
      })

    respuesta.assertStatus(302)
    respuesta.assertFlashMessage('success', 'Quiénes somos actualizado correctamente')

    const despues = await QuienesSomos.query().count('* as total').firstOrFail()
    assert.equal(Number(despues.$extras.total), Math.max(Number(antes.$extras.total), 1))

    const fila = await QuienesSomos.query().firstOrFail()
    assert.equal(fila.titulo, 'Quiénes somos (editado por test)')
    assert.equal(fila.parrafoUno, 'Párrafo de prueba de la Etapa 5b.')
  })

  test('la página pública refleja el cambio', async ({ client, assert }) => {
    const respuesta = await client.get('/quienes-somos').withInertia()
    respuesta.assertStatus(200)

    const seccion = respuesta.inertiaProps.quienesSomos as { titulo: string | null } | null
    assert.equal(seccion?.titulo, 'Quiénes somos (editado por test)')
  })

  test('update inválido (sin título) no persiste', async ({ client, assert }) => {
    const fila = await QuienesSomos.query().firstOrFail()
    const tituloAntes = fila.titulo

    const respuesta = await client
      .post('/app/quienes-somos')
      .loginAs(usuario)
      .withCsrfToken()
      .redirects(0)
      .json({
        titulo: '',
        parrafoUno: null,
        parrafoDos: null,
        parrafoTres: null,
        parrafoCuatro: null,
      })

    respuesta.assertStatus(302)
    await fila.refresh()
    assert.equal(fila.titulo, tituloAntes)
  })
})
