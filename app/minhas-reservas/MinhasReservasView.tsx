'use client'

import Link from 'next/link'

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
  signOut: () => Promise<void>
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
  signOut,
}: Props) {
  return (
    <div
      className="min-h-screen max-w-[375px] mx-auto"
      style={{ backgroundColor: '#0A0906' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '22px 22px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div>
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

        <form action={signOut}>
          <button
            type="submit"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#7A6A50',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Sair
          </button>
        </form>
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
            textAlign: 'center',
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
        </div>
      </div>
    </div>
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
