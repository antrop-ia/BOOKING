'use client'

import { useState, useTransition } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { StatusBar } from './StatusBar'

export interface DadosReserva {
  nome: string
  whatsapp: string
  email?: string
  ocasiao?: string
  observacao?: string
  turnstileToken?: string
}

interface DadosScreenProps {
  partySize: string
  dateLabel: string
  horario: string
  espaco: string
  onBack: () => void
  onConfirm: (dados: DadosReserva) => Promise<{ ok: boolean; error?: string }>
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

const ocasioes = ['Aniversário', 'Encontro', 'Negócios', 'Happy hour']

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#161410',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '4px',
  padding: '13px 14px',
  color: '#F0E8D8',
  fontSize: '14px',
  outline: 'none',
  fontFamily: "'DM Sans', sans-serif",
  transition: 'border-color 150ms',
  boxSizing: 'border-box' as const,
}

export default function DadosScreen({
  partySize,
  dateLabel,
  horario,
  espaco,
  onBack,
  onConfirm,
}: DadosScreenProps) {
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [ocasiao, setOcasiao] = useState<string | null>(null)
  const [observacao, setObservacao] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const captchaReady = !TURNSTILE_SITE_KEY || turnstileToken !== null
  const canSubmit =
    nome.trim().length > 0 && whatsapp.trim().length > 0 && captchaReady && !isPending

  const getInputStyle = (fieldName: string): React.CSSProperties => ({
    ...inputStyle,
    borderColor: focusedField === fieldName ? '#F5C042' : 'rgba(255,255,255,0.09)',
  })

  const handleSubmit = () => {
    if (!canSubmit) return
    setErrorMsg(null)
    startTransition(async () => {
      const result = await onConfirm({
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim() || undefined,
        ocasiao: ocasiao || undefined,
        observacao: observacao.trim() || undefined,
        turnstileToken: turnstileToken ?? undefined,
      })
      if (!result.ok) {
        setErrorMsg(result.error ?? 'Erro ao confirmar reserva')
        // Token Turnstile e single-use: se rejeitou, forca o widget a
        // gerar um novo (se nao, o proximo submit vai falhar na validacao).
        setTurnstileToken(null)
      }
    })
  }

  return (
    <div className="min-h-screen max-w-[375px] mx-auto" style={{ backgroundColor: '#0A0906' }}>
      <StatusBar />

      <div style={{ padding: '18px 22px 36px 22px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#7A6A50',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: 0,
            marginBottom: '18px',
            fontFamily: "'DM Sans', sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          ← Voltar
        </button>

        <div
          style={{
            color: '#E8892A',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="7" height="7" viewBox="0 0 7 7">
            <polygon points="3.5,0 7,3.5 3.5,7 0,3.5" fill="#E8892A" />
          </svg>
          QUASE LÁ
        </div>
        <div
          style={{
            color: '#F0E8D8',
            fontSize: '22px',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            marginBottom: '4px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Seus dados
        </div>
        <div
          style={{
            color: '#7A6A50',
            fontSize: '12px',
            letterSpacing: '0.02em',
            marginBottom: '24px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Parrilla 8187 · {dateLabel} · {horario} · {partySize} pessoas · {espaco}
        </div>

        <span
          style={{
            color: '#4A3A24',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '10px',
            display: 'block',
          }}
        >
          SUAS INFORMAÇÕES
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onFocus={() => setFocusedField('nome')}
            onBlur={() => setFocusedField(null)}
            style={getInputStyle('nome')}
          />
          <input
            type="tel"
            placeholder="+55 (81) 9 0000-0000"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            onFocus={() => setFocusedField('whatsapp')}
            onBlur={() => setFocusedField(null)}
            style={getInputStyle('whatsapp')}
          />
          <input
            type="email"
            placeholder="E-mail (opcional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            style={getInputStyle('email')}
          />
        </div>

        <span
          style={{
            color: '#4A3A24',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '10px',
            display: 'block',
          }}
        >
          OCASIÃO
        </span>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '20px' }}>
          {ocasioes.map((item) => (
            <button
              key={item}
              onClick={() => setOcasiao(ocasiao === item ? null : item)}
              style={{
                padding: '8px 14px',
                borderRadius: '4px',
                border: ocasiao === item ? '1px solid #F5C042' : '1px solid rgba(255,255,255,0.09)',
                backgroundColor: ocasiao === item ? '#F5C042' : 'transparent',
                color: ocasiao === item ? '#0A0906' : '#7A6A50',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 150ms',
                whiteSpace: 'nowrap',
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <span
          style={{
            color: '#4A3A24',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '10px',
            display: 'block',
          }}
        >
          OBSERVAÇÕES (OPCIONAL)
        </span>

        <textarea
          placeholder="Alergia, preferência de mesa, pedido especial..."
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          onFocus={() => setFocusedField('observacao')}
          onBlur={() => setFocusedField(null)}
          rows={3}
          style={{
            ...getInputStyle('observacao'),
            minHeight: '72px',
            resize: 'none',
            fontSize: '13px',
            marginBottom: '18px',
          }}
        />

        <div
          style={{
            backgroundColor: '#161410',
            borderRadius: '4px',
            padding: '12px 14px',
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0, marginTop: '1px' }}>
            <polygon
              points="7,1 8.8,5.2 13.4,5.5 10,8.4 11,13 7,10.5 3,13 4,8.4 0.6,5.5 5.2,5.2"
              fill="#E8892A"
            />
          </svg>
          <p
            style={{
              color: '#7A6A50',
              fontSize: '12px',
              lineHeight: 1.5,
              margin: 0,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Aniversariante + acompanhante{' '}
            <span style={{ color: '#F5C042', fontWeight: 700 }}>não paga couvert artístico.</span>{' '}
            Informe nas observações.
          </p>
        </div>

        {TURNSTILE_SITE_KEY && (
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              options={{ theme: 'dark', size: 'flexible' }}
              onSuccess={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              marginBottom: '14px',
              padding: '10px 12px',
              borderRadius: '4px',
              backgroundColor: 'rgba(196, 92, 38, 0.1)',
              border: '1px solid rgba(196, 92, 38, 0.3)',
              color: '#E8892A',
              fontSize: '12px',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          onMouseOver={() => canSubmit && setIsHovered(true)}
          onMouseOut={() => setIsHovered(false)}
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
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'opacity 150ms',
            opacity: canSubmit ? (isHovered ? 0.88 : 1) : 0.3,
            pointerEvents: canSubmit ? 'auto' : 'none',
          }}
        >
          {isPending ? 'Confirmando...' : 'Confirmar reserva'}
        </button>

        <div
          style={{
            color: '#3A2A18',
            fontSize: '11px',
            textAlign: 'center',
            marginTop: '12px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Cancelamento gratuito até 2h antes
        </div>
      </div>
    </div>
  )
}
