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
  /** Sprint 8 I-10: email digitado em DadosScreen, usado no CTA pra pre-popular o /entrar. */
  email?: string
  /** Sprint 8 I-10: exibe o card "Salvar reserva na minha conta" quando o user nao esta logado. */
  showSaveAccountCta?: boolean
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
  email,
  showSaveAccountCta,
  onNovaReserva,
}: ConfirmacaoScreenProps) {
  const [primaryHover, setPrimaryHover] = useState(false)
  const [shareHover, setShareHover] = useState(false)
  const [novaHover, setNovaHover] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [shareToast, setShareToast] = useState<string | null>(null)

  const saudacao: Record<string, string> = {
    Aniversário: `Feliz aniversário, ${nome}! Te esperamos.`,
    Encontro: `Boa noite, ${nome}. Te esperamos.`,
    Negócios: `Boa reunião, ${nome}. Te esperamos.`,
    'Happy hour': `Bora, ${nome}! Te esperamos na brasa.`,
  }
  const subtitulo = ocasiao ? saudacao[ocasiao] : `Te esperamos, ${nome}. Bora!`

  const codigoLimpo = codigo.replace(/^#/, '')

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
  ]

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      setShareToast('Nao consegui copiar — selecione e copie manualmente.')
      setTimeout(() => setShareToast(null), 2400)
    }
  }

  const buildShareText = (): string => {
    const lines = [
      '🥩 Reserva confirmada na Parrilla 8187',
      '',
      `Em nome de: ${nome}`,
      `Data: ${dateLabel}`,
      `Horário: ${horario}`,
      `Pessoas: ${partySize}`,
      ...(espaco ? [`Espaço: ${espaco}`] : []),
      `Código: ${codigo}`,
    ]
    return lines.join('\n')
  }

  const handleShare = async () => {
    const text = buildShareText()
    const shareData = {
      title: 'Reserva — Parrilla 8187',
      text,
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // User cancelou ou erro — cai pro fallback (copia).
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setShareToast('Detalhes copiados — cole onde quiser!')
      setTimeout(() => setShareToast(null), 2400)
    } catch {
      setShareToast('Nao consegui compartilhar.')
      setTimeout(() => setShareToast(null), 2400)
    }
  }

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
            marginBottom: '24px',
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

        {/* CODIGO EM DESTAQUE */}
        <div
          style={{
            backgroundColor: 'rgba(245,192,66,0.06)',
            border: '1px solid rgba(245,192,66,0.35)',
            borderRadius: '4px',
            padding: '16px 14px',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: '#F5C042',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Código da reserva
          </div>
          <div
            style={{
              color: '#F0E8D8',
              fontSize: '26px',
              fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: '0.04em',
              marginBottom: '12px',
              wordBreak: 'break-all',
            }}
          >
            {codigo}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: copyState === 'copied' ? 'rgba(76,175,125,0.18)' : 'rgba(245,192,66,0.12)',
              border: `1px solid ${copyState === 'copied' ? 'rgba(76,175,125,0.5)' : 'rgba(245,192,66,0.4)'}`,
              borderRadius: '4px',
              color: copyState === 'copied' ? '#A6E3BE' : '#F5C042',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 150ms',
            }}
          >
            {copyState === 'copied' ? '✓ Copiado' : '📋 Copiar código'}
          </button>
          <div
            style={{
              color: '#7A6A50',
              fontSize: '11px',
              marginTop: '12px',
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.4,
            }}
          >
            Apresente esse código no restaurante.
          </div>
        </div>

        {/* DETALHES */}
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

        {showSaveAccountCta && (
          <a
            href={`/entrar?${new URLSearchParams({
              ...(email ? { email } : {}),
              resgatar: codigoLimpo,
            }).toString()}`}
            style={{
              display: 'block',
              width: '100%',
              padding: '14px 16px',
              backgroundColor: 'rgba(245,192,66,0.06)',
              border: '1px solid rgba(245,192,66,0.25)',
              borderRadius: '4px',
              color: '#F0E8D8',
              fontSize: '12px',
              textDecoration: 'none',
              marginBottom: '14px',
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                color: '#F5C042',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Quer acompanhar essa reserva depois?
            </div>
            <div style={{ color: '#9B9385', fontSize: '12px', marginBottom: '6px' }}>
              Crie um acesso rápido com o seu e-mail. A gente vincula a reserva à sua conta automaticamente.
            </div>
            <span style={{ color: '#F5C042', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em' }}>
              Criar acesso rápido →
            </span>
          </a>
        )}

        {/* BOTOES */}
        <a
          href={`/reservar/consultar?codigo=${encodeURIComponent(codigoLimpo)}`}
          onMouseOver={() => setPrimaryHover(true)}
          onMouseOut={() => setPrimaryHover(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '52px',
            backgroundColor: '#F5C042',
            borderRadius: '4px',
            color: '#0A0906',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: '10px',
            transition: 'opacity 150ms',
            opacity: primaryHover ? 0.88 : 1,
          }}
        >
          CONSULTAR RESERVA
        </a>

        <button
          onClick={handleShare}
          onMouseOver={() => setShareHover(true)}
          onMouseOut={() => setShareHover(false)}
          style={{
            width: '100%',
            height: '44px',
            backgroundColor: 'transparent',
            border: shareHover
              ? '1px solid rgba(245,192,66,0.5)'
              : '1px solid rgba(245,192,66,0.25)',
            borderRadius: '4px',
            color: shareHover ? '#F5C042' : '#C9A338',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: '10px',
            transition: 'all 150ms',
          }}
        >
          📤 COMPARTILHAR
        </button>

        <button
          onClick={onNovaReserva}
          onMouseOver={() => setNovaHover(true)}
          onMouseOut={() => setNovaHover(false)}
          style={{
            width: '100%',
            height: '40px',
            backgroundColor: 'transparent',
            border: 'none',
            color: novaHover ? '#F0E8D8' : '#7A6A50',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'color 150ms',
          }}
        >
          Fazer nova reserva
        </button>

        {shareToast && (
          <div
            role="status"
            style={{
              marginTop: '14px',
              padding: '10px 12px',
              backgroundColor: 'rgba(76,175,125,0.12)',
              border: '1px solid rgba(76,175,125,0.35)',
              borderRadius: '4px',
              color: '#A6E3BE',
              fontSize: '12px',
              textAlign: 'center',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {shareToast}
          </div>
        )}
      </div>
    </div>
  )
}
