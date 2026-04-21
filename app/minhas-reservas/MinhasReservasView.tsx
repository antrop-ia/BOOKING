'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { resgatarReserva } from './actions'

export interface MinhaReserva {
  id: string
  codigo: string
  slotStartISO: string
  dateLabel: string
  timeLabel: string
  turno: 'Almoço' | 'Jantar'
  pessoas: number
  nome: string
  espacoNome: string | null
  espacoIcon: string | null
  ocasiao: string | null
  status: 'confirmed' | 'pending' | 'cancelled'
  isFuture: boolean
}

interface Props {
  userEmail: string
  proximas: MinhaReserva[]
  historico: MinhaReserva[]
  resgatarCodigo: string | null
}

const STATUS_LABEL: Record<MinhaReserva['status'], string> = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  cancelled: 'Cancelada',
}

const STATUS_COLOR: Record<
  MinhaReserva['status'],
  { bg: string; color: string; dot: string }
> = {
  confirmed: { bg: 'rgba(34,197,94,0.12)', color: '#86EFAC', dot: '#22C55E' },
  pending: { bg: 'rgba(245,192,66,0.12)', color: '#F5C042', dot: '#F5C042' },
  cancelled: { bg: 'rgba(255,255,255,0.04)', color: '#7A6A50', dot: '#7A6A50' },
}

export function MinhasReservasView({
  userEmail,
  proximas,
  historico,
  resgatarCodigo,
}: Props) {
  return (
    <div
      className="min-h-screen max-w-[375px] mx-auto"
      style={{ backgroundColor: '#0A0906' }}
    >
      {/* Header local: titulo + email. O botao "Sair" e o link pra outras
          rotas vivem no PublicHeader fixo no topo direito. */}
      <div
        style={{
          padding: '22px 22px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            color: '#F5C042',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: '2px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Parrilla 8187
        </div>
        <div
          style={{
            color: '#F0E8D8',
            fontSize: '20px',
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Minhas reservas
        </div>
        <div
          style={{
            color: '#7A6A50',
            fontSize: '11px',
            marginTop: '2px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {userEmail}
        </div>
      </div>

      <div style={{ padding: '22px' }}>
        {/* Aviso de resgate pendente (Sprint 8 I-07 vai tratar) */}
        {resgatarCodigo && (
          <div
            style={{
              marginBottom: '22px',
              padding: '14px',
              borderRadius: '6px',
              backgroundColor: 'rgba(245,192,66,0.08)',
              border: '1px solid rgba(245,192,66,0.25)',
              color: '#F5C042',
              fontSize: '12px',
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.5,
            }}
          >
            ℹ️ Sua reserva <span style={{ fontFamily: 'monospace' }}>#{resgatarCodigo}</span> foi
            criada antes do login. Use "Adicionar reserva existente" mais abaixo
            para vincular à sua conta.
          </div>
        )}

        {/* Próximas */}
        <SectionTitle count={proximas.length}>Próximas</SectionTitle>
        {proximas.length === 0 ? (
          <EmptyState
            title="Nenhuma reserva futura"
            subtitle="Faça uma nova reserva em poucos toques."
            cta={{ label: 'Reservar agora', href: '/reservar' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            {proximas.map((r, i) => (
              <ReservaCard key={r.id} r={r} highlight={i === 0} />
            ))}
          </div>
        )}

        {/* Histórico */}
        {historico.length > 0 && (
          <>
            <SectionTitle count={historico.length}>Histórico</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
              {historico.map((r) => (
                <ReservaCard key={r.id} r={r} highlight={false} />
              ))}
            </div>
          </>
        )}

        {/* Rodapé */}
        <div
          style={{
            marginTop: '40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <Link
            href="/reservar"
            style={{
              display: 'inline-block',
              width: '100%',
              padding: '14px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(245,192,66,0.35)',
              borderRadius: '4px',
              color: '#F5C042',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              textAlign: 'center',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            + Nova reserva
          </Link>

          <ResgatarSection initialCodigo={resgatarCodigo} />
        </div>
      </div>
    </div>
  )
}

function ResgatarSection({ initialCodigo }: { initialCodigo: string | null }) {
  const [open, setOpen] = useState(Boolean(initialCodigo))
  const [codigo, setCodigo] = useState(initialCodigo ? `#${initialCodigo}` : '')
  const [whatsapp, setWhatsapp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Quando o user vem do callback com ?resgatar=, abre o form ja com o codigo.
  useEffect(() => {
    if (initialCodigo) setOpen(true)
  }, [initialCodigo])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await resgatarReserva({ codigo, whatsapp })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess(`Reserva ${result.codigo} vinculada à sua conta.`)
      setCodigo('')
      setWhatsapp('')
      // Reload p/ refletir a reserva agora vinculada na listagem.
      setTimeout(() => window.location.reload(), 800)
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          padding: '12px',
          background: 'transparent',
          border: '1px dashed rgba(255,255,255,0.12)',
          color: '#7A6A50',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          borderRadius: '4px',
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        + Adicionar reserva existente
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: '#161410',
        border: '1px solid rgba(245,192,66,0.25)',
        borderRadius: '6px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          color: '#F5C042',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Adicionar reserva existente
      </div>
      <div style={{ color: '#7A6A50', fontSize: '11px', lineHeight: 1.5 }}>
        Digite o código (#P8187-XXXX) e o WhatsApp usado na reserva.
      </div>

      <input
        type="text"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="#P8187-XXXX"
        autoCapitalize="characters"
        style={{
          backgroundColor: '#0A0906',
          border: '1px solid rgba(255,255,255,0.09)',
          color: '#F0E8D8',
          fontSize: '13px',
          padding: '10px 12px',
          borderRadius: '4px',
          fontFamily: "'DM Mono', monospace",
        }}
      />
      <input
        type="tel"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        placeholder="WhatsApp (DDD + número)"
        style={{
          backgroundColor: '#0A0906',
          border: '1px solid rgba(255,255,255,0.09)',
          color: '#F0E8D8',
          fontSize: '13px',
          padding: '10px 12px',
          borderRadius: '4px',
        }}
      />

      {error && (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '4px',
            backgroundColor: 'rgba(196,92,38,0.1)',
            border: '1px solid rgba(196,92,38,0.3)',
            color: '#E8892A',
            fontSize: '11px',
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '4px',
            backgroundColor: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            color: '#86EFAC',
            fontSize: '11px',
          }}
        >
          {success}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError(null)
            setSuccess(null)
          }}
          style={{
            flex: 1,
            padding: '10px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.09)',
            color: '#7A6A50',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#F5C042',
            border: 'none',
            color: '#0A0906',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderRadius: '4px',
            cursor: isPending ? 'progress' : 'pointer',
            opacity: isPending ? 0.5 : 1,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {isPending ? 'Vinculando…' : 'Vincular'}
        </button>
      </div>
    </form>
  )
}

function SectionTitle({
  children,
  count,
}: {
  children: React.ReactNode
  count: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        color: '#4A3A24',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <span>{children}</span>
      {count > 0 && (
        <span style={{ color: '#7A6A50', fontWeight: 500 }}>· {count}</span>
      )}
    </div>
  )
}

function EmptyState({
  title,
  subtitle,
  cta,
}: {
  title: string
  subtitle: string
  cta: { label: string; href: string }
}) {
  return (
    <div
      style={{
        backgroundColor: '#161410',
        border: '1px dashed rgba(255,255,255,0.09)',
        borderRadius: '6px',
        padding: '28px 20px',
        textAlign: 'center',
        marginBottom: '32px',
      }}
    >
      <div
        style={{
          color: '#F0E8D8',
          fontSize: '14px',
          fontWeight: 700,
          marginBottom: '6px',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: '#7A6A50',
          fontSize: '12px',
          marginBottom: '16px',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {subtitle}
      </div>
      <Link
        href={cta.href}
        style={{
          display: 'inline-block',
          padding: '10px 18px',
          backgroundColor: '#F5C042',
          color: '#0A0906',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          borderRadius: '4px',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {cta.label}
      </Link>
    </div>
  )
}

function ReservaCard({ r, highlight }: { r: MinhaReserva; highlight: boolean }) {
  const statusStyle = STATUS_COLOR[r.status]
  const isCancelled = r.status === 'cancelled'

  return (
    <Link
      href={`/minhas-reservas/${r.codigo.replace('#', '')}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        padding: '16px',
        backgroundColor: '#161410',
        border: highlight
          ? '1.5px solid #F5C042'
          : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '6px',
        opacity: isCancelled ? 0.5 : 1,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              color: '#F0E8D8',
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            {r.dateLabel}
          </span>
          <span
            style={{
              color: '#F5C042',
              fontSize: '22px',
              fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
              marginTop: '2px',
            }}
          >
            {r.timeLabel}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: statusStyle.bg,
            color: statusStyle.color,
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusStyle.dot,
            }}
          />
          {STATUS_LABEL[r.status]}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '12px',
          color: '#9B9385',
          fontSize: '12px',
        }}
      >
        <span>{r.turno}</span>
        <span>·</span>
        <span>
          {r.pessoas} {r.pessoas === 1 ? 'pessoa' : 'pessoas'}
        </span>
        {r.espacoNome && (
          <>
            <span>·</span>
            <span>
              {r.espacoIcon ?? '🍽️'} {r.espacoNome}
            </span>
          </>
        )}
        {r.ocasiao && (
          <>
            <span>·</span>
            <span>{r.ocasiao}</span>
          </>
        )}
      </div>

      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#4A3A24',
          fontSize: '10px',
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.04em',
        }}
      >
        <span>{r.codigo}</span>
        <span>Ver detalhes →</span>
      </div>
    </Link>
  )
}
