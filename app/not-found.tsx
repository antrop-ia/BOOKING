import Link from 'next/link'

export const metadata = {
  title: 'Página não encontrada',
  robots: { index: false },
}

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: '#0A0906' }}
    >
      <div className="max-w-sm text-center">
        <div
          className="inline-flex w-[64px] h-[64px] rounded-full items-center justify-center mb-6"
          style={{ border: '2px solid #F5C042' }}
        >
          <span
            className="text-[10px] font-bold tracking-[0.08em] uppercase"
            style={{ color: '#F5C042' }}
          >
            8187
          </span>
        </div>

        <div
          className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
          style={{ color: '#5C5549' }}
        >
          Página não encontrada
        </div>

        <h1
          className="text-2xl font-bold tracking-tight mb-3"
          style={{ color: '#F0E8D8', fontFamily: "'DM Sans', sans-serif" }}
        >
          Esse endereço não existe
        </h1>

        <p className="mb-8 text-sm leading-relaxed" style={{ color: '#9B9385' }}>
          O link pode estar incorreto ou a página foi removida. Volte para
          começar uma nova reserva.
        </p>

        <Link
          href="/reservar"
          className="inline-block rounded-[4px] px-6 py-3 text-[12px] font-bold uppercase tracking-[0.08em]"
          style={{
            backgroundColor: '#F5C042',
            color: '#0A0906',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Fazer reserva
        </Link>

        <div className="mt-6">
          <Link
            href="/reservar/consultar"
            className="text-xs underline"
            style={{ color: '#7A6A50' }}
          >
            Ou consultar reserva existente
          </Link>
        </div>
      </div>
    </div>
  )
}
