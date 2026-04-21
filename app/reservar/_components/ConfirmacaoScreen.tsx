'use client'

import { useState } from 'react'
import { StatusBar } from './StatusBar'

interface ConfirmacaoScreenProps {
  nome: string
  partySize: string
  dateLabel: string
  horario: string
  espaco?: string
  codigo: string
  ocasiao?: string
  onNovaReserva: () => void
}

export default function ConfirmacaoScreen({
  nome,
  partySize,
  dateLabel,
  horario,
  espaco,
  codigo,
  ocasiao,
  onNovaReserva,
}: ConfirmacaoScreenProps) {
  const [primaryHover, setPrimaryHover] = useState(false)
  const [secondaryHover, setSecondaryHover] = useState(false)

  const saudacao: Record<string, string> = {
    Aniversário: `Feliz aniversário, ${nome}! Te esperamos.`,
    Encontro: `Boa noite, ${nome}. Te esperamos.`,
    Negócios: `Boa reunião, ${nome}. Te esperamos.`,
    'Happy hour': `Bora, ${nome}! Te esperamos na brasa.`,
  }
  const subtitulo = ocasiao ? saudacao[ocasiao] : `Te esperamos, ${nome}. Bora!`

  const rows = [
    {
      label: 'Restaurante',
      value: 'Parrilla 8187',
      valueStyle: { color: '#F0E8D8', fontSize: '13px', fontWeight: 700 } as React.CSSProperties,
    },
    {
      label: 'Data',
      value: dateLabel,
      valueStyle: { color: '#F0E8D8', fontSize: '13px', fontWeight: 700 } as React.CSSProperties,
    },
    {
      label: 'Horário',
      value: horario,
      valueStyle: {
        color: '#F5C042',
        fontSize: '26px',
        fontWeight: 700,
        fontFamily: "'DM Mono', monospace",
      } as React.CSSProperties,
    },
    {
      label: 'Pessoas',
      value: `${partySize} pessoas`,
      valueStyle: { color: '#F0E8D8', fontSize: '13px', fontWeight: 700 } as React.CSSProperties,
    },
    ...(espaco
      ? [
          {
            label: 'Espaço',
            value: espaco,
            valueStyle: {
              color: '#F0E8D8',
              fontSize: '13px',
              fontWeight: 700,
            } as React.CSSProperties,
          },
        ]
      : []),
    {
      label: 'Código',
      value: codigo,
      valueStyle: {
        color: '#F0E8D8',
        fontSize: '13px',
        fontWeight: 700,
        fontFamily: "'DM Mono', monospace",
      } as React.CSSProperties,
    },
  ]

  return (
    <div className="min-h-screen max-w-[375px] mx-auto" style={{ backgroundColor: '#0A0906' }}>
      <style>{`
        @keyframes checkIn {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      <StatusBar />

      <div style={{ padding: '0 22px 40px 22px' }}>
        <div
          style={{
            marginTop: '32px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              border: '1.5px solid rgba(245,192,66,0.3)',
              backgroundColor: 'rgba(245,192,66,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'checkIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <polyline
                points="6,16 13,23 26,9"
                stroke="#F5C042"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        <div
          style={{
            color: '#4A3A24',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: '6px',
          }}
        >
          MESA CONFIRMADA
        </div>

        <div
          style={{
            color: '#F0E8D8',
            fontSize: '26px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: '4px',
          }}
        >
          Parrilla 8187
        </div>

        <div
          style={{
            color: '#7A6A50',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '6px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {subtitulo}
        </div>

        <div
          style={{
            color: '#4A3A24',
            fontSize: '11px',
            textAlign: 'center',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <svg width="6" height="6">
            <circle cx="3" cy="3" r="3" fill="#4CAF7D" />
          </svg>
          Reserva registrada com sucesso
        </div>

        <div
          style={{
            backgroundColor: '#161410',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.05)',
            padding: '0 16px',
            marginBottom: '22px',
          }}
        >
          {rows.map((row, index) => (
            <div key={row.label}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '13px 0',
                }}
              >
                <span
                  style={{
                    color: '#4A3A24',
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {row.label}
                </span>
                <span style={row.valueStyle}>{row.value}</span>
              </div>
              {index < rows.length - 1 && (
                <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }} />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onNovaReserva}
          onMouseOver={() => setPrimaryHover(true)}
          onMouseOut={() => setPrimaryHover(false)}
          style={{
            width: '100%',
            height: '52px',
            backgroundColor: '#F5C042',
            border: 'none',
            borderRadius: '4px',
            color: '#0A0906',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: '10px',
            transition: 'opacity 150ms',
            opacity: primaryHover ? 0.88 : 1,
          }}
        >
          NOVA RESERVA
        </button>

        <button
          onClick={() => window.print()}
          onMouseOver={() => setSecondaryHover(true)}
          onMouseOut={() => setSecondaryHover(false)}
          style={{
            width: '100%',
            height: '44px',
            backgroundColor: 'transparent',
            border: secondaryHover ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.09)',
            borderRadius: '4px',
            color: secondaryHover ? '#F0E8D8' : '#7A6A50',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'all 150ms',
          }}
        >
          SALVAR RECIBO
        </button>
      </div>
    </div>
  )
}
