'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { requestLoginLink } from './actions'

interface Props {
  initialEmail?: string
  redirectTo?: string
  resgatar?: string
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#161410',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '4px',
  padding: '14px 14px',
  color: '#F0E8D8',
  fontSize: '14px',
  outline: 'none',
  fontFamily: "'DM Sans', sans-serif",
  transition: 'border-color 150ms',
  boxSizing: 'border-box' as const,
}

export function LoginForm({ initialEmail = '', redirectTo, resgatar }: Props) {
  const [email, setEmail] = useState(initialEmail)
  const [focused, setFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit = emailValid && !isPending

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      const res = await requestLoginLink({
        email: email.trim(),
        redirect: redirectTo,
        resgatar,
      })
      if (res.ok) {
        setSentTo(res.email)
      } else {
        setError(res.error)
      }
    })
  }

  if (sentTo) {
    return (
      <div
        style={{
          backgroundColor: 'rgba(245,192,66,0.06)',
          border: '1px solid rgba(245,192,66,0.25)',
          borderRadius: '6px',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '28px',
            marginBottom: '10px',
          }}
          aria-hidden
        >
          ✉️
        </div>
        <div
          style={{
            color: '#F0E8D8',
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: '8px',
          }}
        >
          Link enviado!
        </div>
        <div
          style={{
            color: '#7A6A50',
            fontSize: '12px',
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.5,
          }}
        >
          Enviamos um link mágico para{' '}
          <span style={{ color: '#F5C042', fontWeight: 700 }}>{sentTo}</span>.
          <br />
          Abra seu e-mail e clique no link em até 1 hora para entrar.
        </div>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          style={{
            marginTop: '16px',
            background: 'none',
            border: 'none',
            color: '#7A6A50',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Enviar para outro e-mail
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
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
        SEU E-MAIL
      </span>

      <input
        type="email"
        autoComplete="email"
        autoFocus
        placeholder="voce@exemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={isPending}
        style={{
          ...inputStyle,
          borderColor: focused ? '#F5C042' : 'rgba(255,255,255,0.09)',
          opacity: isPending ? 0.6 : 1,
        }}
      />

      {error && (
        <div
          style={{
            marginTop: '14px',
            padding: '10px 12px',
            borderRadius: '4px',
            backgroundColor: 'rgba(196, 92, 38, 0.1)',
            border: '1px solid rgba(196, 92, 38, 0.3)',
            color: '#E8892A',
            fontSize: '12px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        onMouseOver={() => canSubmit && setIsHovered(true)}
        onMouseOut={() => setIsHovered(false)}
        style={{
          width: '100%',
          height: '52px',
          marginTop: '20px',
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
        {isPending ? 'Enviando...' : 'Receber link de acesso'}
      </button>

      <div
        style={{
          marginTop: '16px',
          textAlign: 'center',
          color: '#3A2A18',
          fontSize: '11px',
          letterSpacing: '0.04em',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Sem senha. Sem cadastro complicado.
      </div>
    </form>
  )
}
