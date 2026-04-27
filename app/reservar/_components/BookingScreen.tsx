'use client'

import { useState, useEffect, useRef } from 'react'
import { PillSelector } from './PillSelector'
import { DateCard } from './DateCard'
import { PrimaryButton } from './PrimaryButton'
import { StatusBar } from './StatusBar'

export interface DateOption {
  label: string // "Hoje" | "Amanhã" | short month like "Abr"
  day: string // "17"
  weekday: string // "Qui"
  iso: string // YYYY-MM-DD
}

interface BookingScreenProps {
  partySize: string
  setPartySize: (v: string) => void
  dateIndex: number
  setDateIndex: (v: number) => void
  turno: 'almoco' | 'jantar'
  setTurno: (v: 'almoco' | 'jantar') => void
  dates: DateOption[]
  onContinue: () => void
}

const FIXED_PARTY_SIZES = ['1', '2', '3', '4', '5', '6']
const MAX_PARTY = 30

function isCustomPartySize(value: string): boolean {
  if (value === '') return false
  return !FIXED_PARTY_SIZES.includes(value)
}

export function BookingScreen({
  partySize,
  setPartySize,
  dateIndex,
  setDateIndex,
  turno,
  setTurno,
  dates,
  onContinue,
}: BookingScreenProps) {
  const customMode = isCustomPartySize(partySize)
  const [draftCustom, setDraftCustom] = useState<string>(customMode ? partySize : '')
  const customInputRef = useRef<HTMLInputElement>(null)

  // Mantem o draft sincronizado quando o partySize muda externamente
  // (ex: reset de fluxo).
  useEffect(() => {
    if (customMode) setDraftCustom(partySize)
    else setDraftCustom('')
  }, [partySize, customMode])

  const handleSelectFixed = (size: string) => {
    setPartySize(size)
    setDraftCustom('')
  }

  const handleOpenCustom = () => {
    // Se ja esta em custom, mantem; senao inicia em 7.
    if (!customMode) {
      setPartySize('7')
      setDraftCustom('7')
    }
    // Foca no input depois do render.
    setTimeout(() => customInputRef.current?.focus(), 30)
  }

  const handleCustomChange = (raw: string) => {
    // Aceita digitacao livre (incluindo vazio enquanto edita).
    const onlyDigits = raw.replace(/\D/g, '').slice(0, 2)
    setDraftCustom(onlyDigits)
    if (onlyDigits === '') return
    const n = Number(onlyDigits)
    if (Number.isFinite(n) && n >= 7 && n <= MAX_PARTY) {
      setPartySize(String(n))
    }
  }

  const handleCustomBlur = () => {
    const n = Number(draftCustom)
    if (!Number.isFinite(n) || n < 7) {
      setPartySize('7')
      setDraftCustom('7')
    } else if (n > MAX_PARTY) {
      setPartySize(String(MAX_PARTY))
      setDraftCustom(String(MAX_PARTY))
    }
  }

  return (
    <div className="min-h-screen max-w-[375px] mx-auto" style={{ backgroundColor: '#0A0906' }}>
      <StatusBar />

      <div className="pt-[20px] pb-0 px-[22px]">
        <div className="flex items-center gap-[12px] mb-[20px]">
          <div
            className="w-[52px] h-[52px] rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: '#0A0906', border: '2px solid #F5C042' }}
          >
            <div className="text-center leading-tight">
              <div className="text-[7px] font-bold uppercase tracking-[0.08em]" style={{ color: '#F5C042' }}>
                PARRILLA
              </div>
              <div className="text-[10px] font-bold tracking-[0.02em]" style={{ color: '#F5C042' }}>
                8187
              </div>
              <div className="text-[6px] opacity-70 tracking-[0.06em] uppercase" style={{ color: '#F5C042' }}>
                ★ ★ ★
              </div>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-[2px]" style={{ color: '#5C5549' }}>
              Bar e Churrascaria
            </div>
            <div
              className="text-[22px] font-bold tracking-[-0.01em] leading-tight font-sans"
              style={{ color: '#F0E8D8' }}
            >
              Parrilla 8187
            </div>
            <div className="text-[12px] mt-[2px]" style={{ color: '#9B9385' }}>
              Boa Viagem, Recife
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[10px] mb-[22px]">
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          <span className="text-[12px]" style={{ color: '#C45C26' }}>◆</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
        </div>
      </div>

      <div className="px-[22px]">
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-[10px]" style={{ color: '#5C5549' }}>
          Quantas pessoas?
        </div>
        <div className="flex flex-wrap gap-[7px] mb-[14px]">
          {FIXED_PARTY_SIZES.map((size) => (
            <PillSelector
              key={size}
              label={size}
              selected={!customMode && partySize === size}
              onClick={() => handleSelectFixed(size)}
            />
          ))}
          <PillSelector
            label={customMode ? `${partySize}` : '+'}
            selected={customMode}
            onClick={handleOpenCustom}
          />
        </div>
        <div
          className="mb-[22px] flex items-center gap-[10px] rounded-[4px] px-[12px] py-[10px]"
          style={{
            backgroundColor: '#161410',
            border: customMode
              ? '1px solid rgba(245,192,66,0.35)'
              : '1px solid rgba(255,255,255,0.06)',
            opacity: customMode ? 1 : 0.55,
            transition: 'opacity 150ms, border-color 150ms',
          }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ color: '#5C5549' }}
          >
            Mais de 6 pessoas
          </span>
          <input
            ref={customInputRef}
            type="number"
            inputMode="numeric"
            min={7}
            max={MAX_PARTY}
            disabled={!customMode}
            placeholder={customMode ? '' : 'desativado'}
            value={customMode ? draftCustom : ''}
            onChange={(e) => handleCustomChange(e.target.value)}
            onBlur={handleCustomBlur}
            className="flex-1 rounded-[4px] bg-transparent px-[8px] py-[6px] text-right outline-none disabled:cursor-not-allowed"
            style={{
              color: customMode ? '#F0E8D8' : '#5C5549',
              fontFamily: "'DM Mono', monospace",
              fontSize: '15px',
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
          <span style={{ color: '#9B9385', fontSize: '11px' }}>pessoas</span>
        </div>
      </div>

      <div className="px-[22px]">
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-[10px]" style={{ color: '#5C5549' }}>
          Quando?
        </div>
        <div
          className="flex gap-[7px] overflow-x-auto pb-[4px] mb-[22px]"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {dates.map((date, index) => (
            <DateCard
              key={date.iso}
              label={date.label}
              day={date.day}
              weekday={date.weekday}
              selected={dateIndex === index}
              onClick={() => setDateIndex(index)}
            />
          ))}
        </div>
      </div>

      <div className="px-[22px]">
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-[10px]" style={{ color: '#5C5549' }}>
          Turno
        </div>
        <div className="flex gap-[8px] mb-[28px]">
          <PillSelector label="Almoço" selected={turno === 'almoco'} onClick={() => setTurno('almoco')} variant="turno" />
          <PillSelector label="Jantar" selected={turno === 'jantar'} onClick={() => setTurno('jantar')} variant="turno" />
        </div>
      </div>

      <div className="px-[22px] mb-[20px]">
        <div
          className="inline-flex items-center justify-center gap-[6px] w-full rounded-[4px] px-[10px] py-[10px]"
          style={{ backgroundColor: '#161410', border: '1px solid rgba(245,192,66,0.25)' }}
        >
          <span className="text-[12px]" style={{ color: '#C45C26' }}>●</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#F5C042' }}>
            A melhor picanha da cidade
          </span>
        </div>
      </div>

      <div className="px-[22px] pb-4">
        <PrimaryButton onClick={onContinue}>Ver horários disponíveis</PrimaryButton>
      </div>

      <div className="px-[22px] pb-10 text-center">
        <a
          href="/reservar/consultar"
          className="text-[12px] underline"
          style={{
            color: '#7A6A50',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Já tenho reserva — consultar
        </a>
      </div>
    </div>
  )
}
