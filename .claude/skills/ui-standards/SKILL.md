---
name: ui-standards
description: Estándares de UI/UX para todos los sistemas, tanto en React (SPA) como en vistas Edge (SSR) de AdonisJS. Define cómo construir formularios, tablas, notificaciones, pantallas de carga, gestión de cuenta (contraseña/foto), theming con degradados, dark mode y localización es-PY. Usar SIEMPRE que se cree o modifique cualquier pantalla, formulario, tabla, modal, listado, ABM/CRUD, login o gestión de cuenta — sea frontend React o template Edge, aunque el usuario no mencione "estándar" ni "UI". Si el pedido implica construir interfaz, esta skill aplica.
---

# Estándares de UI/UX

Convenciones obligatorias para que todos los sistemas salgan con el mismo nivel de
calidad y consistencia. Aplicar al construir cualquier interfaz.

**Las reglas son de comportamiento, no de framework: valen igual para una SPA de
React que para vistas Edge (SSR) de AdonisJS.** Lo que cambia es *cómo* se
implementa cada una, no *si* se cumple. Cuando un punto se resuelve distinto según
el frontend, lo aclaro con notas **[React]** y **[Edge]**.

Stack base: **React** o **Edge** en el frontend, **AdonisJS / Node.js** en el backend.

### Cómo se mapea cada regla según el frontend

| Aspecto | React (SPA) | Edge (SSR, AdonisJS) |
|---|---|---|
| Interactividad | estado de componentes (hooks) | progressive enhancement con vanilla JS o **AlpineJS** |
| Errores de validación | estado local + render inline | `flashMessages` del validator de Adonis, render inline en el `.edge` |
| Loading | skeleton / Lottie en cliente | spinner en submit + skeleton; recarga de página suele ser el "loading" |
| Paginación/orden/search | request a la API, render reactivo | query string + `Model.query().paginate()`, render del `.edge` |
| Notificaciones | SweetAlert2 (cliente) | SweetAlert2 (cliente), alimentado por `flashMessages` |
| Theming / dark mode | variables CSS | variables CSS (idéntico) |
| Formato es-PY | helpers JS | view globals / helpers en Edge |



## Regla de oro: las 4 vistas de todo

Toda pantalla que carga datos debe contemplar **4 estados**, nunca solo el "todo salió bien":

1. **Loading** → skeleton o Lottie (ver sección Carga). Nunca pantalla en blanco.
2. **Empty** → estado vacío con mensaje claro y, si aplica, un CTA ("Aún no hay registros. Crear el primero").
3. **Error** → mensaje entendible + botón "Reintentar". Nunca dejar al usuario varado.
4. **Success** → el contenido normal.

Si una vista solo maneja el caso 4, está incompleta.

---

## Responsive siempre (mobile-first)

**No negociable: toda pantalla es responsive.** Ningún sistema se da por terminado si se rompe en mobile.

- Diseñar **mobile-first**: primero el layout chico, después se expande a desktop.
- Nada de scroll horizontal para leer contenido (salvo casos puntuales y a propósito).
- Breakpoints consistentes en todos los sistemas (definir 2–3 fijos, ej. `< 768px` mobile, `768–1024px` tablet, `> 1024px` desktop) y respetarlos siempre.
- Patrones obligatorios en mobile:
  - **Tablas** → cards (ya cubierto en la sección Tablas).
  - **Menú/sidebar** → colapsa a hamburguesa/drawer.
  - **Formularios** → campos a una columna, full-width.
  - **Modales** → ocupan (casi) toda la pantalla, no una cajita perdida.
  - **Acciones** → no depender de hover (no existe en touch); todo accesible por tap.
- Targets táctiles ≥ 44px (coincide con Accesibilidad).
- Es idéntico en **[React]** y **[Edge]**: es CSS y layout, no depende del framework. Probar siempre en un viewport chico antes de cerrar la pantalla.

---

## Formularios

### Validación
- Validar en **dos momentos**: al salir del campo y al enviar. No validar en cada tecla (molesto), salvo medidores en vivo (ej. fuerza de contraseña).
- Mostrar el error **inline debajo del campo**, no solo bloquear el botón. El usuario tiene que saber *qué* está mal.
- Estados de campo: `pristine` (sin tocar) / `touched` / `error`. No mostrar errores en campos que el usuario todavía no tocó.
- Validar **también en el backend** (validators de AdonisJS, ej. VineJS). La validación en el cliente es UX, no seguridad — nunca confiar solo en ella.
- **[React]** Estado local + `onBlur`/`onSubmit`, render del error inline.
- **[Edge]** El validator de Adonis devuelve errores; renderizarlos inline en el `.edge` desde `flashMessages`, y repoblar los campos con `old()` para no perder lo cargado:

```edge
<input name="email" value="{{ old('email', '') }}" />
@error('email')
  <span class="field-error">{{ message }}</span>
@end
```

### Botón de submit
- **Deshabilitado** mientras el formulario no esté completo/válido.
- Al ejecutar: **spinner dentro del botón** + texto tipo "Guardando..." + botón deshabilitado para **prevenir doble submit**.
- Volver a habilitar solo cuando termina (éxito o error).

```jsx
// [React]
<button disabled={!isValid || loading} onClick={handleSubmit}>
  {loading ? <><Spinner /> Guardando...</> : "Guardar"}
</button>
```

```html
<!-- [Edge] progressive enhancement con AlpineJS: deshabilita y muestra spinner al enviar -->
<form x-data="{ sending: false }" @submit="sending = true">
  <button type="submit" :disabled="sending">
    <span x-show="sending" class="spinner"></span>
    <span x-text="sending ? 'Guardando...' : 'Guardar'"></span>
  </button>
</form>
```

### Buenas prácticas extra
- Autofocus en el primer campo al abrir el form.
- En forms largos con cambios sin guardar: advertir antes de salir/cerrar ("Tenés cambios sin guardar").
- Inputs con `label` real (no solo placeholder).
- Formato de fechas/números según locale **es-PY**.

---

## Notificaciones

- **SweetAlert2** en lugar del `alert()`/`confirm()` nativo, siempre.
- Usar el tipo correcto según el caso:
  - **Toast** (esquina, auto-dismiss) → confirmaciones rápidas de éxito ("Guardado correctamente"). No interrumpe.
  - **Modal SweetAlert** → cuando se necesita que el usuario lea o decida algo.
- **Acciones destructivas** (eliminar, dar de baja): SIEMPRE confirmación SweetAlert con botón de cancelar y texto que diga qué se va a borrar. Botón de confirmar en color de peligro.

```js
const r = await Swal.fire({
  title: "¿Eliminar registro?",
  text: "Esta acción no se puede deshacer.",
  icon: "warning",
  showCancelButton: true,
  confirmButtonText: "Sí, eliminar",
  cancelButtonText: "Cancelar",
});
if (r.isConfirmed) { /* ... */ }
```

- **[Edge]** Tras una acción server-side, pasar el resultado por `session.flash(...)` y, en el layout, disparar el SweetAlert/toast leyendo `flashMessages` al cargar la página:

```edge
@if(flashMessages.has('success'))
  <script> Swal.fire({ toast: true, position: 'top-end', icon: 'success',
    title: '{{ flashMessages.get('success') }}', timer: 2500, showConfirmButton: false }) </script>
@end
```

---

## Tablas / Listados

Toda tabla de datos debe tener:

- **Paginación del lado del servidor** (server-side). El backend recibe `page`, `perPage`, `sort`, `order` y `search`, y devuelve `{ data, meta: { total, page, perPage, lastPage } }`. AdonisJS lo da con `Model.query().paginate(page, perPage)`.
  - **[React]** La SPA pide a la API y renderiza reactivamente.
  - **[Edge]** El controller lee los params de la query string, hace `paginate()` y renderiza el `.edge`; los links de página y orden son `<a>` que cambian la query string (`?page=2&sort=nombre&order=asc`). La paginación de Adonis ya trae los metadatos para el contador.
- **Búsqueda** con **debounce** (~300–400 ms) para no disparar una request por tecla.
  - **[React]** debounce en el handler, luego fetch.
  - **[Edge]** input que actualiza la query string; el debounce se hace con un poco de JS/Alpine antes de navegar o de hacer fetch parcial.
- **Ordenamiento** por columna (click en header), reflejado en la request al servidor (en Edge, vía query string).
- **Contador** visible ("Mostrando 1–10 de 245").
- **Filtros** de búsqueda según las columnas relevantes.
- Los 4 estados de la Regla de oro: **loading** (skeleton de filas), **empty**, **error**, **success**. En Edge, el "loading" suele ser la propia recarga de página; igual cubrir **empty** y **error** en el template.
- **Indicador de carga** al cambiar de página o reordenar (no congelar la UI).

- Persistir filtros/página/orden en la **query string de la URL**, así el back del navegador funciona y se puede compartir el link.
- Header sticky en tablas largas.

### Exportación CSV/Excel
- Toda tabla de datos relevante debe poder **exportarse a CSV y/o Excel**.
- Exportar respetando los **filtros/búsqueda activos** (lo que el usuario ve), no toda la tabla cruda.
- Para datasets grandes, generar el archivo en el **backend** (AdonisJS) y devolver el archivo, no armarlo en el navegador (evita colgar el cliente). Para datasets chicos, librería en cliente (ej. SheetJS) está bien.
- Nombrar el archivo con contexto y fecha: `clientes_2026-06-14.xlsx`.
- Mostrar spinner durante la generación; no bloquear la UI.

### Responsive (cards en mobile)
- En desktop, tabla normal. En **mobile, colapsar cada fila a una card** con los campos clave, no tabla con scroll horizontal (mala UX).
- Las acciones por fila pasan a botones/menú dentro de la card.
- Definir un breakpoint claro (ej. `< 768px` → cards) y mantenerlo consistente en todos los sistemas.
- Paginación, search y contador siguen visibles y usables en mobile.

### Selección múltiple + acciones masivas
- Cuando tenga sentido (ej. bajas, cambios de estado en lote): **checkbox por fila** + checkbox "seleccionar todo".
- Al haber selección, mostrar una **barra de acciones** con el contador ("3 seleccionados") y las acciones disponibles.
- "Seleccionar todo" debe aclarar el alcance: ¿solo la página actual o todos los registros que matchean el filtro? Ofrecer ambas si aplica.
- Las acciones masivas destructivas → confirmación SweetAlert que diga cuántos registros afecta.

---

## Carga de páginas

- Toda página/vista usa **animaciones Lottie** durante la carga inicial (no spinner pelado).
- Para listas y tablas, preferir **skeleton loaders** (placeholders con la forma del contenido) sobre el Lottie centrado: dan mejor sensación de velocidad.
- Lottie centrado → cargas de pantalla completa / primer render.
- Skeleton → recargas parciales dentro de una pantalla ya montada.
- Tener un componente Lottie reutilizable, no copiar el JSON en cada vista.

---

## Gestión de cuenta

Todo sistema con usuarios debe incluir, de forma consistente:

- **Cambiar contraseña** (estando logueado): pedir contraseña actual + nueva + confirmación. Mostrar **medidor de fuerza** en vivo y requisitos (mínimo de caracteres, etc.).
- **Cambiar foto de perfil**: preview antes de subir, crop opcional, validar tipo y peso del archivo.
- **Restablecer contraseña** (olvidé mi contraseña): por **email con token de un solo uso y vencimiento**. NUNCA enviar la contraseña por mail ni guardarla en texto plano — siempre hash (bcrypt/argon2). El flujo "recordar/recuperar contraseña" es siempre un *reset con token*, no recuperar la original.
- **Recordarme** en el login: token persistente seguro (httpOnly cookie), no guardar credenciales.

### Seguridad mínima (no negociable)
- Contraseñas siempre hasheadas (argon2 o bcrypt).
- Al cambiar contraseña, pedir la actual y considerar invalidar otras sesiones.
- Rate limiting en login y en endpoints de reset.

---

## Theming y degradados

- Paleta con **degradados** aplicada de forma consistente a botones, modales, headers de tabla y acentos de formularios.
- Definir los degradados como **tokens/variables CSS** (`--grad-primary`, `--grad-danger`, etc.), NUNCA hardcodear el gradiente en cada componente. Cambiar la marca debe ser cambiar una variable.

```css
:root {
  --grad-primary: linear-gradient(135deg, #4f46e5, #7c3aed);
  --grad-danger:  linear-gradient(135deg, #dc2626, #f97316);
}
```

### Cuidado con la legibilidad (importante)
- El texto sobre degradados debe mantener **contraste suficiente** (WCAG AA, ratio ≥ 4.5:1). Probar el extremo más claro del gradiente, no solo el oscuro.
- En **tablas**, usar degradados con moderación (header sí; filas de datos no, perjudican la lectura de datos).
- No abusar: degradado como acento, no como fondo de todo.

### Dark mode
- Toda paleta se define con **variables CSS semánticas** (`--bg`, `--surface`, `--text`, `--border`, `--grad-primary`, etc.), nunca colores sueltos en los componentes. Así dark mode es solo redefinir las variables.
- Implementar con un atributo en la raíz (`[data-theme="dark"]`) que sobrescribe las variables; el componente nunca sabe en qué tema está.
- Respetar la preferencia del SO por defecto (`prefers-color-scheme`) y permitir override manual del usuario, persistido.
- Revisar **contraste también en dark** (los degradados que funcionan en claro pueden fallar en oscuro).

```css
:root { --bg: #ffffff; --surface: #f8f9fb; --text: #1a1a1a; }
[data-theme="dark"] { --bg: #0f1115; --surface: #1a1d23; --text: #e8e8e8; }
```

---

## Accesibilidad (base)

- Todos los inputs con `label` asociado.
- Modales: focus trap, cerrar con `Esc`, devolver el foco al disparador al cerrar.
- Navegación por teclado funcional (Tab, Enter en botones).
- Targets táctiles ≥ 44px en mobile.
- No comunicar estado solo por color (agregar ícono/texto).

---

## Manejo de errores y sesión (transversal)

- **[React]** Interceptor central de HTTP (axios) que:
  - Ante **401** → cerrar sesión y redirigir al login con mensaje.
  - Ante **5xx** → toast/alerta genérica "Ocurrió un error, intentá de nuevo".
  - Ante error de red → avisar "Sin conexión".
- **[Edge]** El equivalente vive en el backend: un **exception handler** central de AdonisJS que ante 401 redirige al login con flash, ante 5xx muestra una página/flash de error genérica, y un middleware de auth que protege las rutas. Mismo objetivo, distinta capa.
- Nunca dejar una promesa colgada sin `catch` que devuelva feedback al usuario.

---

## Localización y formato (es-PY)

- Centralizar todo el formato en **helpers únicos** (`formatDate`, `formatNumber`, `formatCurrency`), nunca formatear a mano en cada componente. Cambiar el formato debe ser un solo lugar.
- Usar `Intl` con locale **`es-PY`**:
  - Fechas: `dd/MM/yyyy` (ej. `14/06/2026`).
  - Números: separador de miles `.` y decimal `,` (ej. `1.234,56`).
  - Moneda: Guaraní `Gs.` (sin decimales) y, si aplica, otras monedas con su formato.
- Mantener el **timezone** consistente (`America/Asuncion`); guardar en UTC en la base y formatear al mostrar.
- Textos de UI centralizados (objeto/i18n), aunque el sistema sea solo en español — facilita mantener y reusar copys.

```js
const formatDate = (d) =>
  new Intl.DateTimeFormat("es-PY", { dateStyle: "short" }).format(new Date(d));
const formatGs = (n) =>
  new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG",
    maximumFractionDigits: 0 }).format(n);
```

- **[React]** Importar los helpers donde se necesiten.
- **[Edge]** Registrar los mismos helpers como **view globals** (`View.global('formatGs', ...)`) para usarlos directo en los templates: `{{ formatGs(monto) }}`. Así React y Edge comparten la misma lógica de formato.

---

## Checklist rápido antes de dar por terminada una pantalla

- [ ] Maneja los 4 estados (loading / empty / error / success)
- [ ] **Responsive verificado en mobile** (sin scroll horizontal, sidebar/menú y modales adaptados)
- [ ] Formularios: validación inline + botón bloqueado + spinner anti-doble-submit
- [ ] Validación también en el backend
- [ ] SweetAlert para confirmaciones; destructivas con confirmación
- [ ] Tablas: server-side pagination + search con debounce + sort + contador
- [ ] Tablas: exportación CSV/Excel, responsive (cards en mobile), selección múltiple si aplica
- [ ] Lottie/skeleton en cargas
- [ ] Degradados vía variables CSS con contraste verificado (claro y dark)
- [ ] Dark mode con variables semánticas
- [ ] Fechas/números/moneda formateados con helper es-PY centralizado
- [ ] Accesibilidad básica (labels, teclado, foco en modales)
- [ ] Manejo de 401/5xx/sin-conexión
