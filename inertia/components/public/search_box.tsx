import { useState, type FormEvent } from 'react'
import { router } from '@inertiajs/react'
import { Button, InputField, SelectField } from '~/components/ui'
import styles from './public.module.css'
import layoutStyles from '~/layouts/public.module.css'

export interface OpcionRango {
  valor: string
  etiqueta: string
}

export interface OpcionDistrito {
  codigo: number
  nombre: string
}

/**
 * Buscador principal del home. Navega a /loteamientos con los filtros
 * elegidos en la query string (solo los que tienen valor).
 */
export function SearchBox({
  rangos,
  distritos,
}: {
  rangos: OpcionRango[]
  distritos: OpcionDistrito[]
}) {
  const [texto, setTexto] = useState('')
  const [rango, setRango] = useState('')
  const [distrito, setDistrito] = useState('')

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    const filtros: Record<string, string> = {}
    if (texto.trim()) filtros.texto = texto.trim()
    if (rango) filtros.rango = rango
    if (distrito) filtros.distrito = distrito
    router.get('/loteamientos', filtros)
  }

  return (
    <div className={`${layoutStyles.container} ${styles.buscador}`}>
      <form className={styles.buscadorCard} onSubmit={buscar} role="search">
        <InputField
          label="¿Qué estás buscando?"
          name="texto"
          placeholder="Nombre del loteamiento o de la zona"
          autoComplete="off"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <SelectField
          label="Precio de cuota"
          name="rango"
          value={rango}
          onChange={(e) => setRango(e.target.value)}
        >
          <option value="">Todos los precios</option>
          {rangos.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.etiqueta}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Distrito"
          name="distrito"
          value={distrito}
          onChange={(e) => setDistrito(e.target.value)}
        >
          <option value="">Todos los distritos</option>
          {distritos.map((d) => (
            <option key={d.codigo} value={String(d.codigo)}>
              {d.nombre}
            </option>
          ))}
        </SelectField>
        <Button type="submit" variant="accent">
          Buscar
        </Button>
      </form>
    </div>
  )
}
