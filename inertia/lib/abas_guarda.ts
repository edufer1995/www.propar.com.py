/**
 * Datos de contacto de Abas Guarda (self storage de ABAS en Ciudad del
 * Este). Los usan la página /abas-guarda y el WhatsApp flotante del layout
 * público, que en esa página habla con Abas Guarda y no con ventas.
 * Fuente: presentación comercial "press abas guarda_v4" (11/2026).
 */
export const ABAS_GUARDA = {
  whatsapp: '+595984900687',
  whatsappVisible: '0984 900 687',
  mensajeWhatsApp: 'Hola Abas Guarda, quisiera información sobre los depósitos en Ciudad del Este.',
  direccion: 'Avda. Eusebio Ayala esq. Curupayty, Ciudad del Este',
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=Avda.+Eusebio+Ayala+esq.+Curupayty,+Ciudad+del+Este',
  horarios: ['Lunes a viernes de 08:00 a 17:30 hs.', 'Sábados de 08:00 a 12:00 hs.'],
} as const

export function linkWhatsAppAbasGuarda(): string {
  return `https://wa.me/${ABAS_GUARDA.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
    ABAS_GUARDA.mensajeWhatsApp
  )}`
}
