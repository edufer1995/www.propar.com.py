import type { ReactElement } from 'react'
import PublicLayout from '~/layouts/public'
import { PaginaError } from '~/components/public/pagina_error'

export default function ServerError() {
  return (
    <PaginaError
      codigo="500"
      titulo="Algo salió mal"
      texto="Tuvimos un problema al cargar esta página. Inténtalo de nuevo en unos minutos o escríbenos por WhatsApp."
    />
  )
}

ServerError.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
