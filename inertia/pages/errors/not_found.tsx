import type { ReactElement } from 'react'
import PublicLayout from '~/layouts/public'
import { PaginaError } from '~/components/public/pagina_error'

export default function NotFound() {
  return (
    <PaginaError
      codigo="404"
      titulo="No encontramos esta página"
      texto="Puede que la dirección haya cambiado o que ya no exista. Puedes volver al inicio o buscar tu lote en el mapa."
    />
  )
}

NotFound.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
