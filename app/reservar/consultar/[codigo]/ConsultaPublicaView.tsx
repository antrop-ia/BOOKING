'use client'

import { useState } from 'react'

interface Props {
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
  status: 'confirmed' | 'pending' | 'cancelled'
  icsDataUrl: string
  icsFilename: string
  restauranteWhatsapp: string | null
}

const STATUS_LABEL: Record<Props['status'], string> = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  cancelled: 'Cancelada',
}

const STATUS_COLOR: Record<Props['status'], { bg: string; color: string; dot: string }> = {
  confirmed: { bg: 'rgba(34,197,94,0.12)', color: '#86EFAC', dot: '#22C55E' },
  pending: { bg: 'rgba(245,192,66,0.12)', color: '#F5C042', dot: '#F5C042' },
  cancelled: { bg: 'rgba(255,255,255,0.04)', color: '#7A6A50', dot: '#7A6A50' },
}

export function ConsultaPublicaView(props: Props) {
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const statusStyle = STATUS_COLOR[props.status]

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.codigo)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="min-h-screen max-w-[420px] mx-auto px-6 py-10"
      style={{ backgroundColor: '#0A0906' }}
    >
      <div className="mb-6">
        <a
          href="/reservar/consultar"
          className="text-xs underline"
          style={{ color: '#7A6A50' }}
        >
          ← Outra reserva
        </a>
      </div>

      <div
        className="mb-3 inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1"
        style={{ backgroundColor: statusStyle.bg }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: statusStyle.dot }}
        />
        <span
          className="text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{ color: statusStyle.color }}
        >
          {STATUS_LABEL[props.status]}
        </span>
      </div>

      <h1
        className="text-[24px] font-bold tracking-tight mb-1"
        style={{ color: '#F0E8D8', fontFamily: "'DM Sans', sans-serif" }}
      >
        Reserva {props.codigo}
      </h1>
      <p className="mb-6 text-sm" style={{ color: '#9B9385' }}>
        Em nome de <span style={{ color: '#F0E8D8' }}>{props.nome}</span>
      </p>

      <div
        className="mb-5 rounded-[4px] px-4 py-4 text-center"
        style={{
          backgroundColor: 'rgba(245,192,66,0.06)',
          border: '1px solid rgba(245,192,66,0.3)',
        }}
      >
        <div
          className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em]"
          style={{ color: '#F5C042' }}
        >
          Código
        </div>
        <div
          className="mb-3 text-[22px] font-bold"
          style={{
            color: '#F0E8D8',
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.04em',
          }}
        >
          {props.codigo}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em]"
          style={{
            backgroundColor:
              copyState === 'copied'
                ? 'rgba(76,175,125,0.18)'
                : 'rgba(245,192,66,0.12)',
            border: `1px solid ${
              copyState === 'copied'
                ? 'rgba(76,175,125,0.5)'
                : 'rgba(245,192,66,0.4)'
            }`,
            color: copyState === 'copied' ? '#A6E3BE' : '#F5C042',
          }}
        >
          {copyState === 'copied' ? '✓ Copiado' : '📋 Copiar'}
        </button>
      </div>

      <div
        className="mb-5 rounded-[4px] px-4"
        style={{
          backgroundColor: '#161410',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {[
          { label: 'Restaurante', value: 'Parrilla 8187 — Boa Viagem' },
          { label: 'Quando', value: `${props.dateLabel} · ${props.timeLabel}` },
          { label: 'Turno', value: props.turno },
          { label: 'Pessoas', value: `${props.pessoas} pessoas` },
          ...(props.espacoNome
            ? [
                {
                  label: 'Espaço',
                  value: `${props.espacoIcon ?? ''} ${props.espacoNome}`.trim(),
                },
              ]
            : []),
          ...(props.ocasiao
            ? [{ label: 'Ocasião', value: props.ocasiao }]
            : []),
          ...(props.observacao
            ? [{ label: 'Observação', value: props.observacao }]
            : []),
        ].map((row, idx, arr) => (
          <div key={row.label}>
            <div className="flex items-center justify-between py-3">
              <span
                className="text-[9px] font-bold uppercase tracking-[0.1em]"
                style={{ color: '#4A3A24' }}
              >
                {row.label}
              </span>
              <span
                className="text-right text-[13px] font-bold"
                style={{ color: '#F0E8D8' }}
              >
                {row.value}
              </span>
            </div>
            {idx < arr.length - 1 && (
              <div
                className="h-px"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              />
            )}
          </div>
        ))}
      </div>

      {props.status !== 'cancelled' && (
        <a
          href={props.icsDataUrl}
          download={props.icsFilename}
          className="mb-3 block w-full rounded-[4px] px-4 py-3 text-center text-[12px] font-bold uppercase tracking-[0.06em]"
          style={{
            backgroundColor: 'transparent',
            border: '1px solid rgba(245,192,66,0.4)',
            color: '#F5C042',
          }}
        >
          📅 Adicionar ao calendário
        </a>
      )}

      {props.restauranteWhatsapp && props.status !== 'cancelled' && (
        <a
          href={props.restauranteWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 block w-full rounded-[4px] px-4 py-3 text-center text-[12px] font-bold uppercase tracking-[0.06em]"
          style={{
            backgroundColor: 'rgba(76,175,125,0.12)',
            border: '1px solid rgba(76,175,125,0.4)',
            color: '#A6E3BE',
          }}
        >
          💬 Falar com o restaurante
        </a>
      )}

      <div
        className="mt-6 rounded-[4px] p-3 text-[11px]"
        style={{
          backgroundColor: 'rgba(255,255,255,0.02)',
          color: '#7A6A50',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Para cancelar ou editar a reserva, entre em contato com o restaurante.
      </div>
    </div>
  )
}
