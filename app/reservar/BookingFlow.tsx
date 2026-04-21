'use client'

import { useState } from 'react'
import { BookingScreen, type DateOption } from './_components/BookingScreen'
import HorariosScreen from './_components/HorariosScreen'
import EspacoScreen, { type EspacoOption } from './_components/EspacoScreen'
import DadosScreen, { type DadosReserva } from './_components/DadosScreen'
import ConfirmacaoScreen from './_components/ConfirmacaoScreen'
import { BetoChat } from './_components/BetoChat'
import { createReservationAction } from './actions'

type Screen = 'booking' | 'horarios' | 'espaco' | 'dados' | 'confirmacao'

interface BookingFlowProps {
  dates: DateOption[]
  espacos: EspacoOption[]
  /** Sprint 8 I-10: usado pra decidir se exibe CTA "salvar reserva na conta" */
  isAuthenticated: boolean
}

export function BookingFlow({ dates, espacos, isAuthenticated }: BookingFlowProps) {
  const [screen, setScreen] = useState<Screen>('booking')
  const [partySize, setPartySize] = useState<string>('2')
  const [dateIndex, setDateIndex] = useState<number>(0)
  const [turno, setTurno] = useState<'almoco' | 'jantar'>('jantar')
  const [selectedSlotISO, setSelectedSlotISO] = useState<string>('')
  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string>('')
  const [selectedEspacoId, setSelectedEspacoId] = useState<string>('')
  const [selectedEspacoName, setSelectedEspacoName] = useState<string>('')
  const [confirmation, setConfirmation] = useState<{
    nome: string
    codigo: string
    ocasiao?: string
    email?: string
  } | null>(null)
  const [resetKey, setResetKey] = useState<number>(0)

  const selectedDate = dates[dateIndex]
  const dateLabel =
    selectedDate.label === 'Hoje' || selectedDate.label === 'Amanhã'
      ? `${selectedDate.label}, ${selectedDate.day} de ${monthLabel(selectedDate.iso)}`
      : `${selectedDate.weekday}, ${selectedDate.day} de ${monthLabel(selectedDate.iso)}`

  const resetFlow = () => {
    setPartySize('2')
    setDateIndex(0)
    setTurno('jantar')
    setSelectedSlotISO('')
    setSelectedSlotLabel('')
    setSelectedEspacoId('')
    setSelectedEspacoName('')
    setConfirmation(null)
    setResetKey((k) => k + 1)
    setScreen('booking')
  }

  return (
    <>
      {screen === 'confirmacao' && confirmation ? (
        <ConfirmacaoScreen
          key={resetKey}
          nome={confirmation.nome}
          partySize={partySize}
          dateLabel={dateLabel}
          horario={selectedSlotLabel}
          espaco={selectedEspacoName}
          codigo={confirmation.codigo}
          ocasiao={confirmation.ocasiao}
          email={confirmation.email}
          showSaveAccountCta={!isAuthenticated}
          onNovaReserva={resetFlow}
        />
      ) : screen === 'dados' ? (
        <DadosScreen
          partySize={partySize}
          dateLabel={dateLabel}
          horario={selectedSlotLabel}
          espaco={selectedEspacoName}
          onBack={() => setScreen('espaco')}
          onConfirm={async (dados: DadosReserva) => {
            const result = await createReservationAction({
              slotStartISO: selectedSlotISO,
              partySize,
              spaceId: selectedEspacoId,
              dados,
            })
            if (result.ok) {
              setConfirmation({
                nome: dados.nome,
                codigo: result.codigo,
                ocasiao: dados.ocasiao,
                email: dados.email,
              })
              setScreen('confirmacao')
            }
            return result
          }}
        />
      ) : screen === 'espaco' ? (
        <EspacoScreen
          partySize={partySize}
          dateLabel={dateLabel}
          horario={selectedSlotLabel}
          espacos={espacos}
          onBack={() => setScreen('horarios')}
          onConfirm={(espacoId, espacoName) => {
            setSelectedEspacoId(espacoId)
            setSelectedEspacoName(espacoName)
            setScreen('dados')
          }}
        />
      ) : screen === 'horarios' ? (
        <HorariosScreen
          partySize={partySize}
          dateISO={selectedDate.iso}
          dateLabel={dateLabel}
          turno={turno}
          onBack={() => setScreen('booking')}
          onConfirm={(slotStart, horarioLabel) => {
            setSelectedSlotISO(slotStart)
            setSelectedSlotLabel(horarioLabel)
            setScreen('espaco')
          }}
        />
      ) : (
        <BookingScreen
          partySize={partySize}
          setPartySize={setPartySize}
          dateIndex={dateIndex}
          setDateIndex={setDateIndex}
          turno={turno}
          setTurno={setTurno}
          dates={dates}
          onContinue={() => setScreen('horarios')}
        />
      )}
      <BetoChat />
    </>
  )
}

const MESES_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

function monthLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return MESES_PT[d.getMonth()]
}
