import { redirect } from 'next/navigation'
import { ConsultarForm } from './ConsultarForm'

export const metadata = {
  title: 'Consultar reserva',
  description: 'Digite o código para consultar os detalhes da sua reserva.',
}

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ codigo?: string; error?: string }>
}

export default async function ConsultarPage({ searchParams }: PageProps) {
  const { codigo, error } = await searchParams

  // Se o link veio com ?codigo=... (vindo da ConfirmacaoScreen), redireciona
  // direto pra ficha pra evitar passo extra.
  if (codigo) {
    const cleaned = codigo.replace(/^#/, '').trim().toLowerCase()
    if (/^p8187-[0-9a-f]{4}$/.test(cleaned)) {
      redirect(`/reservar/consultar/${cleaned}`)
    }
  }

  return (
    <div className="min-h-screen max-w-[420px] mx-auto px-6 py-12" style={{ backgroundColor: '#0A0906' }}>
      <div className="mb-10">
        <div
          className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1"
          style={{ color: '#5C5549' }}
        >
          Parrilla 8187
        </div>
        <h1
          className="text-[26px] font-bold tracking-tight"
          style={{ color: '#F0E8D8', fontFamily: "'DM Sans', sans-serif" }}
        >
          Consultar reserva
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#9B9385' }}>
          Digite o código que você recebeu ao confirmar a reserva.
        </p>
      </div>

      <ConsultarForm initialError={error ?? null} />

      <div className="mt-10 border-t pt-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <a
          href="/reservar"
          className="text-xs underline"
          style={{ color: '#7A6A50' }}
        >
          ← Voltar para reservar
        </a>
      </div>
    </div>
  )
}
