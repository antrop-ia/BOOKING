'use client'

import { useState } from 'react'
import { StatusBar } from './StatusBar'

export interface EspacoOption {
  id: string
  name: string
  description: string | null
  icon: string | null
}

interface EspacoScreenProps {
  partySize: string
  dateLabel: string
  horario: string
  espacos: EspacoOption[]
  onBack: () => void
  onConfirm: (espacoId: string, espacoName: string) => void
}

export default function EspacoScreen({
  partySize,
  dateLabel,
  horario,
  espacos,
  onBack,
  onConfirm,
}: EspacoScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  const canContinue = selectedId !== null
  const selectedEspaco = espacos.find((e) => e.id === selectedId)

  return (
    <div
      className="min-h-screen max-w-[375px] mx-auto"
      style={{ backgroundColor: '#0A0906' }}
    >
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
            color: '#F5C042',
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
            <polygon points="3.5,0 7,3.5 3.5,7 0,3.5" fill="#F5C042" />
          </svg>
          ONDE VOCÊ QUER SENTAR
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
          Escolha seu espaço
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
          Parrilla 8187 · {dateLabel} · {partySize} pessoas{horario ? ` · ${horario}` : ''}
        </div>

        {espacos.length === 0 ? (
          <div
            style={{
              backgroundColor: '#161410',
              border: '1px solid rgba(196, 92, 38, 0.3)',
              borderRadius: '4px',
              padding: '20px',
              color: '#E8892A',
              fontSize: '13px',
              fontFamily: "'DM Sans', sans-serif",
              textAlign: 'center',
            }}
          >
            Nenhum espaço disponível no momento. Entre em contato com o
            restaurante.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '24px',
            }}
          >
            {espacos.map((e) => {
              const selected = selectedId === e.id
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedId(e.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '16px 18px',
                    backgroundColor: selected ? 'rgba(245,192,66,0.08)' : '#161410',
                    border: selected
                      ? '1.5px solid #F5C042'
                      : '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    textAlign: 'left',
                    transition: 'border-color 150ms, background-color 150ms',
                  }}
                >
                  <div
                    style={{
                      flex: '0 0 48px',
                      width: '48px',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      backgroundColor: selected ? 'rgba(245,192,66,0.15)' : '#0A0906',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '4px',
                    }}
                  >
                    {e.icon ?? '🍽️'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: selected ? '#F5C042' : '#F0E8D8',
                        fontSize: '15px',
                        fontWeight: 700,
                        marginBottom: '3px',
                      }}
                    >
                      {e.name}
                    </div>
                    {e.description && (
                      <div
                        style={{
                          color: '#7A6A50',
                          fontSize: '12px',
                          lineHeight: 1.4,
                        }}
                      >
                        {e.description}
                      </div>
                    )}
                  </div>
                  {/* Radio indicator */}
                  <div
                    style={{
                      flex: '0 0 18px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: selected ? '5px solid #F5C042' : '1.5px solid rgba(255,255,255,0.2)',
                      backgroundColor: selected ? '#0A0906' : 'transparent',
                      transition: 'border 150ms',
                    }}
                  />
                </button>
              )
            })}
          </div>
        )}

        <button
          onClick={() => {
            if (canContinue && selectedEspaco) {
              onConfirm(selectedEspaco.id, selectedEspaco.name)
            }
          }}
          disabled={!canContinue}
          onMouseOver={() => canContinue && setIsHovered(true)}
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
            cursor: canContinue ? 'pointer' : 'not-allowed',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'opacity 150ms',
            opacity: canContinue ? (isHovered ? 0.88 : 1) : 0.3,
            pointerEvents: canContinue ? 'auto' : 'none',
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
