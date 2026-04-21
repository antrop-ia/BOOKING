'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { cancelOwnReservation } from './actions'
import { RESTAURANT_INFO } from '@/app/lib/beto/menu'
import { whatsappLink } from '@/app/lib/reservations'

interface Props {
  id: string
  codigo: string
  nome: string
  dateLabel: string
  timeLabel: string
  turno: 'Almoço' | 'Jantar'
  pessoas: number
  espacoNome: string | null
  espacoIcon: string | null
  ocasiao: string | null
  observacao: string | null
  whatsappCliente: string | null
  status: 'confirmed' | 'pending' | 'cancelled'
  createdAtISO: string
  timezone: string
  icsDataUrl: string
  icsFilename: string
}

const STATUS_LABEL: Record<Props['status'], string> = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  cancelled: 'Cancelada',
}

const STATUS_COLOR: Record<
  Props['status'],
  { bg: string; color: string; dot: string }
> = {
  confirmed: { bg: 'rgba(34,197,94,0.12)', color: '#86EFAC', dot: '#22C55E' },
  pending: { bg: 'rgba(245,192,66,0.12)', color: '#F5C042', dot: '#F5C042' },
  cancelled: { bg: 'rgba(255,255,255,0.04)', color: '#7A6A50', dot: '#7A6A50' },
}

export function ReservaDetailView(props: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [statusLocal, setStatusLocal] = useState<Props['status']>(props.status)

  const isCancelled = statusLocal === 'cancelled'
  const statusStyle = STATUS_COLOR[statusLocal]

  const handleCancel = () => {
    if (!confirm(`Cancelar a reserva ${props.codigo}? Essa ação não pode ser desfeita.`)) return
    startTransition(async () => {
      setError(null)
      const result = await cancelOwnReservation(props.id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setStatusLocal('cancelled')
    })
  }

  const handleWhatsApp = () => {
    if (!RESTAURANT_INFO.whatsapp) return
    const msg =
      `Olá! Estou com a reserva ${props.codigo} para ${props.dateLabel} às ${props.timeLabel} ` +
      `(${props.pessoas} ${props.pessoas === 1 ? 'pessoa' : 'pessoas'}).`
    window.open(whatsappLink(RESTAURANT_INFO.whatsapp, msg), '_blank', 'noopener,noreferrer')
  }

  const createdAtFormatted = new Intl.DateTimeFormat('pt-BR', {
    timeZone: props.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(props.createdAtISO))

  return (
    <div
      className="min-h-screen max-w-[375px] mx-auto"
      style={{ backgroundColor: '#0A0906', fontFamily: "'DM Sans', sans-serif" }}
    >
      <div
        style={{
          padding: '20px 22px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Link
          href="/minhas-reservas"
          style={{
            color: '#7A6A50',
            fontSize: '11px',
            textDecoration: 'none',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          ← Minhas reservas
        </Link>
      </div>

      <div style={{ padding: '24px 22px 32px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
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
                marginBottom: '4px',
              }}
            >
              Reserva
            </div>
            <div
              style={{
                color: '#F0E8D8',
                fontSize: '20px',
                fontWeight: 700,
                fontFamily: "'DM Mono', monospace",
                letterSpacing: '0.02em',
              }}
            >
              {props.codigo}
            </div>
          </div>
          <span
            style={{
              display: 'inline-flex',
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
            {STATUS_LABEL[statusLocal]}
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#161410',
            border: isCancelled
              ? '1px solid rgba(255,255,255,0.06)'
              : '1.5px solid rgba(245,192,66,0.35)',
            borderRadius: '6px',
            padding: '20px',
            marginBottom: '20px',
            opacity: isCancelled ? 0.5 : 1,
          }}
        >
          <div style={{ color: '#F0E8D8', fontSize: '15px', fontWeight: 700 }}>
            {props.dateLabel}
          </div>
          <div
            style={{
              color: '#F5C042',
              fontSize: '32px',
              fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
              marginTop: '4px',
              letterSpacing: '-0.01em',
            }}
          >
            {props.timeLabel}
          </div>
          <div
            style={{
              marginTop: '8px',
              color: '#9B9385',
              fontSize: '12px',
            }}
          >
            {props.turno} · {props.pessoas} {props.pessoas === 1 ? 'pessoa' : 'pessoas'}
            {props.espacoNome && (
              <>
                {' · '}
                {props.espacoIcon ?? '🍽️'} {props.espacoNome}
              </>
            )}
          </div>
        </div>

        <Detail label="Em nome de" value={props.nome} />
        {props.whatsappCliente && <Detail label="WhatsApp" value={props.whatsappCliente} />}
        {props.ocasiao && <Detail label="Ocasião" value={props.ocasiao} />}
        {props.observacao && <Detail label="Observação" value={props.observacao} />}
        <Detail label="Reservada em" value={createdAtFormatted} />

        {error && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(196, 92, 38, 0.1)',
              border: '1px solid rgba(196, 92, 38, 0.3)',
              color: '#E8892A',
              fontSize: '12px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!isCancelled && (
            <a
              href={props.icsDataUrl}
              download={props.icsFilename}
              style={{
                display: 'block',
                width: '100%',
                padding: '14px',
                backgroundColor: '#F5C042',
                color: '#0A0906',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                textAlign: 'center',
                borderRadius: '4px',
              }}
            >
              Adicionar ao calendário
            </a>
          )}

          {!isCancelled && RESTAURANT_INFO.whatsapp && (
            <button
              type="button"
              onClick={handleWhatsApp}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(245,192,66,0.35)',
                color: '#F5C042',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Falar com o restaurante
            </button>
          )}

          {!isCancelled && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(196, 92, 38, 0.35)',
                color: '#E8892A',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: '4px',
                cursor: isPending ? 'progress' : 'pointer',
                opacity: isPending ? 0.5 : 1,
              }}
            >
              {isPending ? 'Cancelando…' : 'Cancelar reserva'}
            </button>
          )}

          {isCancelled && (
            <Link
              href="/reservar"
              style={{
                display: 'block',
                width: '100%',
                padding: '14px',
                backgroundColor: '#F5C042',
                color: '#0A0906',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                textAlign: 'center',
                borderRadius: '4px',
              }}
            >
              Fazer nova reserva
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '12px',
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <span
        style={{
          color: '#7A6A50',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: '#F0E8D8',
          fontSize: '13px',
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  )
}
