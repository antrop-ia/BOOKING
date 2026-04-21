'use client'

import { useEffect, useState, useTransition } from 'react'
import { createManualReservation } from './actions'
import { todayInTimezone, localMidnightUTC } from '@/app/lib/date'

const TIMES: string[] = (() => {
  const out: string[] = []
  for (let h = 11; h <= 23; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 23) out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
})()

interface SpaceOpt {
  id: string
  name: string
  icon: string | null
}

export function NovaReservaModal({
  open,
  onClose,
  timezone,
  spaces,
}: {
  open: boolean
  onClose: () => void
  timezone: string
  spaces: SpaceOpt[]
}) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('19:00')
  const [partySize, setPartySize] = useState('2')
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [ocasiao, setOcasiao] = useState('')
  const [observacao, setObservacao] = useState('')
  const [status, setStatus] = useState<'confirmed' | 'pending'>('confirmed')
  const [spaceId, setSpaceId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [successCode, setSuccessCode] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Pre-seleciona o primeiro espaco ao abrir
  useEffect(() => {
    if (open && !spaceId && spaces.length > 0) {
      setSpaceId(spaces[0].id)
    }
  }, [open, spaceId, spaces])

  useEffect(() => {
    if (open && !date) setDate(todayInTimezone(timezone))
  }, [open, date, timezone])

  useEffect(() => {
    if (!open) {
      setError(null)
      setSuccessCode(null)
    }
  }, [open])

  if (!open) return null

  const canSubmit =
    !isPending &&
    date.length === 10 &&
    time.length === 5 &&
    nome.trim().length > 0 &&
    whatsapp.trim().length > 0 &&
    Number(partySize) >= 1

  const resetForm = () => {
    setNome('')
    setWhatsapp('')
    setEmail('')
    setOcasiao('')
    setObservacao('')
    setPartySize('2')
    setTime('19:00')
    setStatus('confirmed')
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    setError(null)
    setSuccessCode(null)

    const midnight = localMidnightUTC(date, timezone)
    const [hh, mm] = time.split(':').map(Number)
    const slotStart = new Date(midnight.getTime() + (hh * 60 + mm) * 60_000)

    startTransition(async () => {
      const result = await createManualReservation({
        slotStartISO: slotStart.toISOString(),
        partySize: Number(partySize),
        status,
        spaceId: spaceId || null,
        guest: {
          nome: nome.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim() || undefined,
          ocasiao: ocasiao.trim() || undefined,
          observacao: observacao.trim() || undefined,
        },
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccessCode(result.codigo)
      resetForm()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Nova reserva</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-100"
            aria-label="Fechar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {successCode && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Reserva criada: <span className="font-mono">{successCode}</span>
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Horário">
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputClass}
              >
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Pessoas">
              <input
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'confirmed' | 'pending')}
                className={inputClass}
              >
                <option value="confirmed">Confirmada</option>
                <option value="pending">Pendente</option>
              </select>
            </Field>
          </div>

          {spaces.length > 0 && (
            <Field label="Espaço">
              <select
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                className={inputClass}
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon ? `${s.icon} ` : ''}
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Nome *">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputClass}
              placeholder="Nome completo"
            />
          </Field>

          <Field label="WhatsApp *">
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={inputClass}
              placeholder="(81) 9 9999-9999"
            />
          </Field>

          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="opcional"
            />
          </Field>

          <Field label="Ocasião">
            <input
              type="text"
              value={ocasiao}
              onChange={(e) => setOcasiao(e.target.value)}
              className={inputClass}
              placeholder="Aniversário, negócios, etc."
            />
          </Field>

          <Field label="Observações">
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Alergias, preferência de mesa..."
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-primary, #18181b)' }}
          >
            {isPending ? 'Salvando...' : 'Criar reserva'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  )
}
