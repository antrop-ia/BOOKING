'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

interface Props {
  initialError: string | null
}

const ERROR_MESSAGES: Record<string, string> = {
  nao_encontrada: 'Codigo nao encontrado. Confira os caracteres.',
  invalido: 'Formato invalido. Esperamos algo como #P8187-A1B2.',
  ambiguo: 'Esse codigo curto colide com outra reserva — entre em contato.',
}

export function ConsultarForm({ initialError }: Props) {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(
    initialError ? ERROR_MESSAGES[initialError] ?? null : null
  )
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const cleaned = codigo.replace(/^#/, '').trim().toLowerCase()
    if (!/^p8187-[0-9a-f]{4}$/.test(cleaned)) {
      setError(ERROR_MESSAGES.invalido)
      return
    }
    setSubmitting(true)
    router.push(`/reservar/consultar/${cleaned}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="codigo"
          className="mb-2 block text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{ color: '#5C5549' }}
        >
          Código da reserva
        </label>
        <input
          id="codigo"
          name="codigo"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          autoFocus
          required
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value)
            setError(null)
          }}
          placeholder="#P8187-A1B2"
          className="w-full rounded-[4px] px-4 py-3 text-center outline-none focus:ring-1 focus:ring-amber-300"
          style={{
            backgroundColor: '#161410',
            border: '1px solid rgba(245,192,66,0.3)',
            color: '#F0E8D8',
            fontFamily: "'DM Mono', monospace",
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        />
        {error && (
          <p className="mt-2 text-center text-xs" style={{ color: '#F08C8C' }}>
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-[4px] px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] transition-opacity disabled:opacity-60"
        style={{
          backgroundColor: '#F5C042',
          color: '#0A0906',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {submitting ? 'Buscando...' : 'Consultar'}
      </button>
    </form>
  )
}
