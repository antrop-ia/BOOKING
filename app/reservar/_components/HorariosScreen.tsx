'use client'

import { useEffect, useState } from 'react'
import { StatusBar } from './StatusBar'

interface HorariosScreenProps {
  partySize: string
  spaceId: string
  spaceName: string
  dateISO: string
  dateLabel: string
  turno: 'almoco' | 'jantar'
  onBack: () => void
  onConfirm: (slotStartISO: string, horarioLabel: string) => void
}

interface Slot {
  start: string // ISO UTC
  end: string
  available: boolean
  remaining_pessoas?: number
}

export default function HorariosScreen({
  partySize,
  spaceId,
  spaceName,
  dateISO,
  dateLabel,
  turno,
  onBack,
  onConfirm,
}: HorariosScreenProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)
  const [slots, setSlots] = useState<
    { label: string; iso: string; available: boolean; remaining: number }[]
  >([])
  const [loading, setLoading] = useState(true)

  const turnoLabel = turno === 'almoco' ? 'Almoço' : 'Jantar'

  useEffect(() => {
    setSelected(null)
    setLoading(true)
    const url = new URL('/api/reservar/slots', window.location.origin)
    url.searchParams.set('date', dateISO)
    url.searchParams.set('turno', turno)
    url.searchParams.set('space_id', spaceId)
    url.searchParams.set('party_size', partySize)
    fetch(url.toString())
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setSlots([])
          return
        }
        const shaped = (data.slots as Slot[]).map((s) => {
          const d = new Date(s.start)
          const hh = String(d.getHours()).padStart(2, '0')
          const mm = String(d.getMinutes()).padStart(2, '0')
          return {
            label: `${hh}:${mm}`,
            iso: s.start,
            available: s.available,
            remaining: typeof s.remaining_pessoas === 'number' ? s.remaining_pessoas : 0,
          }
        })
        setSlots(shaped)
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [dateISO, turno, spaceId, partySize])

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
            color: '#7A6A50',
            fontSize: '12px',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            marginBottom: '3px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {dateLabel} · {partySize} pessoas · {turnoLabel}
          {spaceName ? ` · ${spaceName}` : ''}
        </div>
        <div
          style={{
            color: '#F0E8D8',
            fontSize: '22px',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            marginBottom: '22px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Escolha o horário
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
          {loading ? 'CARREGANDO...' : slots.length === 0 ? 'SEM HORÁRIOS' : 'DISPONÍVEIS'}
        </span>

        {!loading && slots.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '7px',
              marginBottom: '18px',
            }}
          >
            {slots.map((slot) => {
              const isSelected = selected === slot.iso
              const isHovered = hoveredSlot === slot.iso && !isSelected
              const isUnavailable = !slot.available

              let slotStyle: React.CSSProperties = {
                width: '100%',
                padding: '12px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: '#161410',
                color: '#F0E8D8',
                fontSize: '14px',
                fontFamily: "'DM Mono', monospace",
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 150ms',
                textAlign: 'center',
              }

              if (isSelected) {
                slotStyle = {
                  ...slotStyle,
                  backgroundColor: '#F5C042',
                  borderColor: '#F5C042',
                  color: '#0A0906',
                  fontWeight: 700,
                }
              } else if (isHovered) {
                slotStyle = {
                  ...slotStyle,
                  borderColor: '#F5C042',
                  color: '#F5C042',
                }
              }

              if (isUnavailable) {
                slotStyle = {
                  ...slotStyle,
                  opacity: 0.2,
                  pointerEvents: 'none',
                  textDecoration: 'line-through',
                  cursor: 'not-allowed',
                }
              }

              return (
                <button
                  key={slot.iso}
                  onClick={() => slot.available && setSelected(slot.iso)}
                  onMouseOver={() => slot.available && setHoveredSlot(slot.iso)}
                  onMouseOut={() => setHoveredSlot(null)}
                  style={slotStyle}
                  disabled={isUnavailable}
                >
                  {slot.label}
                </button>
              )
            })}
          </div>
        )}

        <div
          style={{
            backgroundColor: '#161410',
            borderRadius: '4px',
            padding: '14px 16px',
            marginBottom: '22px',
            border: '1px solid rgba(245,192,66,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span
              style={{
                color: '#4A3A24',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '3px',
                display: 'block',
              }}
            >
              HORÁRIO SELECIONADO
            </span>
            <span
              style={{
                color: selected ? '#F5C042' : '#3A2A18',
                fontSize: '28px',
                fontWeight: 700,
                fontFamily: "'DM Mono', monospace",
                letterSpacing: '0.02em',
                lineHeight: 1,
              }}
            >
              {selected ? slots.find((s) => s.iso === selected)?.label : '— : —'}
            </span>
          </div>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r="19"
              stroke="rgba(245,192,66,0.2)"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="20" cy="20" r="1.5" fill="#E8892A" />
            <line x1="20" y1="20" x2="20" y2="10" stroke="#E8892A" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="20" y1="20" x2="27" y2="20" stroke="#E8892A" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <button
          onClick={() => {
            if (!selected) return
            const label = slots.find((s) => s.iso === selected)?.label ?? ''
            onConfirm(selected, label)
          }}
          disabled={!selected}
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
            cursor: selected ? 'pointer' : 'not-allowed',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'opacity 150ms',
            opacity: selected ? 1 : 0.3,
            pointerEvents: selected ? 'auto' : 'none',
          }}
        >
          {selected ? `Confirmar ${slots.find((s) => s.iso === selected)?.label}` : 'Confirmar horário'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="6" height="6">
              <circle cx="3" cy="3" r="3" fill="#F5C042" />
            </svg>
            <span style={{ color: '#4A3A24', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
              Disponível
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="10" height="10" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="4.5" stroke="#4A3A24" strokeWidth="1" fill="none" />
              <line x1="1.5" y1="8.5" x2="8.5" y2="1.5" stroke="#4A3A24" strokeWidth="1" />
            </svg>
            <span style={{ color: '#4A3A24', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
              Esgotado
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
