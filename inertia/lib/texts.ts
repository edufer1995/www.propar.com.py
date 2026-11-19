/**
 * Textos de UI centralizados. Un solo lugar para mantener copys.
 */
export const texts = {
  common: {
    save: 'Guardar',
    saving: 'Guardando...',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    create: 'Crear',
    search: 'Buscar',
    retry: 'Reintentar',
    close: 'Cerrar',
    loading: 'Cargando...',
    send: 'Enviar',
    sending: 'Enviando...',
  },
  states: {
    emptyTitle: 'Aún no hay registros',
    emptyCta: 'Crear el primero',
    errorTitle: 'Ocurrió un error',
    errorBody: 'No pudimos cargar la información. Prueba de nuevo.',
    offline: 'Sin conexión. Revisa tu conexión a internet.',
    serverError: 'Ocurrió un error en el servidor, inténtalo de nuevo.',
    sessionExpired: 'Tu sesión expiró. Inicia sesión de nuevo.',
    noResults: 'No se encontraron resultados',
  },
  confirm: {
    deleteTitle: '¿Eliminar registro?',
    deleteBody: 'Esta acción no se puede deshacer.',
    deleteConfirm: 'Sí, eliminar',
    unsaved: 'Tenés cambios sin guardar. ¿Salir igual?',
  },
  table: {
    showing: (from: number, to: number, total: number) => `Mostrando ${from}–${to} de ${total}`,
    export: 'Exportar',
    selected: (n: number) => `${n} seleccionado${n === 1 ? '' : 's'}`,
  },
} as const
