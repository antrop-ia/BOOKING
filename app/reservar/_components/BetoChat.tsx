'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState, type FormEvent } from 'react'

const WELCOME = 'E aí, chapa! Bora montar uma reserva boa? Posso te dar umas dicas de corte, combo ou harmonização. Me conta: quantas pessoas e se tá afim de compartilhar ou prato individual?'

export function BetoChat() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/beto/chat' }),
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, status])

  const isThinking = status === 'submitted' || status === 'streaming'

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || isThinking) return
    sendMessage({ text })
    setDraft('')
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir chat com o Beto"
        style={{
          position: 'fixed',
          bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#F5C042',
          color: '#0A0906',
          border: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          cursor: 'pointer',
          fontSize: '22px',
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'transform 150ms',
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        💬
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat com o Beto"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              height: '100dvh',
              backgroundColor: '#0A0906',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {/* Header */}
            <header
              style={{
                padding: '16px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#F5C042',
                    color: '#0A0906',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '15px',
                  }}
                >
                  B
                </div>
                <div>
                  <div style={{ color: '#F0E8D8', fontWeight: 700, fontSize: '14px' }}>Beto</div>
                  <div style={{ color: '#7A6A50', fontSize: '11px' }}>Atendente Parrilla 8187</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#7A6A50',
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ×
              </button>
            </header>

            {/* Messages */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {messages.length === 0 && <Bubble role="assistant" text={WELCOME} />}
              {messages.map((m) => {
                const text = m.parts
                  .map((p) => (p.type === 'text' ? p.text : ''))
                  .join('')
                if (!text.trim()) return null
                return <Bubble key={m.id} role={m.role === 'user' ? 'user' : 'assistant'} text={text} />
              })}
              {isThinking && <TypingIndicator />}
            </div>

            {/* Composer */}
            <form
              onSubmit={onSubmit}
              style={{
                padding: '14px 18px 20px 18px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                gap: '8px',
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Pergunta pro Beto..."
                autoFocus
                style={{
                  flex: 1,
                  backgroundColor: '#161410',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '4px',
                  padding: '12px 14px',
                  color: '#F0E8D8',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
              <button
                type="submit"
                disabled={!draft.trim() || isThinking}
                style={{
                  height: '42px',
                  padding: '0 16px',
                  backgroundColor: '#F5C042',
                  color: '#0A0906',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '13px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: !draft.trim() || isThinking ? 'not-allowed' : 'pointer',
                  opacity: !draft.trim() || isThinking ? 0.4 : 1,
                  transition: 'opacity 150ms',
                }}
              >
                Enviar
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  )
}

function Bubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '86%',
          padding: '10px 14px',
          borderRadius: '14px',
          backgroundColor: isUser ? '#F5C042' : '#161410',
          color: isUser ? '#0A0906' : '#F0E8D8',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.06)',
          fontSize: '14px',
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {text}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div
        style={{
          padding: '10px 14px',
          borderRadius: '14px',
          backgroundColor: '#161410',
          border: '1px solid rgba(255,255,255,0.06)',
          color: '#7A6A50',
          fontSize: '14px',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <span className="beto-dot">•</span>
        <span className="beto-dot" style={{ animationDelay: '0.15s' }}>•</span>
        <span className="beto-dot" style={{ animationDelay: '0.3s' }}>•</span>
        <style jsx>{`
          .beto-dot {
            display: inline-block;
            opacity: 0.3;
            animation: betoPulse 1s infinite;
            font-size: 18px;
            margin: 0 1px;
          }
          @keyframes betoPulse {
            0%, 60%, 100% { opacity: 0.3; }
            30% { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}
