'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createSlotBlock, deleteSlotBlock } from './actions'

export interface SlotBlockRow {
  id: string
  slotStartISO: string
  dateLabel: string
  timeLabel: string
}

type Role = 'owner' | 'manager' | 'operator'

interface Props {
  establishmentId: string
  timezone: string
  initial: SlotBlockRow[]
  canEdit: boolean
  role: Role
}

const TIMES: string[] = (() => {
  const arr: string[] = []
  for (let h = 11; h <= 23; h++) {
    arr.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 23) arr.push(`${String(h).padStart(2, '0')}:30`)
  }
  return arr
})()

/**
 * Converte uma data local (no timezone do estabelecimento) + hora HH:mm
 * em um ISO timestamp absoluto. Usa o offset real do timezone via
 * Intl.DateTimeFormat para nao assumir -03 fixo.
 */
function localDateTimeToUTC(dateISO: string, timeHHmm: string, timezone: string): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const [hh, mm] = timeHHmm.split(':').map(Number)

  // Truque: formata "agora" interpretado como se fosse no timezone, pega offset.
  const probe = new Date(Date.UTC(y, m - 1, d, hh, mm, 0))
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = dtf.formatToParts(probe)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const shownY = get('year'),
    shownM = get('month'),
    shownD = get('day'),
    shownH = get('hour'),
    shownMin = get('minute')

  const wantedUTC = Date.UTC(y, m - 1, d, hh, mm, 0)
  const shownUTC = Date.UTC(shownY, shownM - 1, shownD, shownH, shownMin, 0)
  const offsetMs = shownUTC - wantedUTC
  return new Date(wantedUTC - offsetMs).toISOString()
}

export function BloqueiosView({
  establishmentId,
  timezone,
  initial,
  canEdit,
  role,
}: Props) {
  const router = useRouter()
  const [blocks, setBlocks] = useState(initial)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [time, setTime] = useState('19:00')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (isPending || !canEdit) return
    setToast(null)
    const iso = localDateTimeToUTC(date, time, timezone)
    startTransition(async () => {
      const res = await createSlotBlock({
        establishmentId,
        slotStartISO: iso,
      })
      if (res.ok) {
        setToast({ kind: 'success', text: 'Horario bloqueado' })
        router.refresh()
      } else {
        setToast({ kind: 'error', text: res.error })
      }
    })
  }

  const onDelete = (id: string) => {
    if (!canEdit) return
    setToast(null)
    startTransition(async () => {
      const res = await deleteSlotBlock(id)
      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.id !== id))
        setToast({ kind: 'success', text: 'Bloqueio removido' })
        router.refresh()
      } else {
        setToast({ kind: 'error', text: res.error })
      }
    })
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Form novo bloqueio */}
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-neutral-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-neutral-900">Novo bloqueio</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Adicione um horario por vez. Para bloquear um dia inteiro, adicione um
          por hora de funcionamento.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Data
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              disabled={!canEdit || isPending}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Horario
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!canEdit || isPending}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50"
            >
              {TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={!canEdit || isPending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? 'Bloqueando...' : 'Bloquear'}
          </button>
        </div>
      </form>

      {!canEdit && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Sua funcao (<span className="font-mono">{role}</span>) nao tem permissao
          para criar ou remover bloqueios.
        </p>
      )}

      {toast && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            toast.kind === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Lista de bloqueios futuros */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
          Bloqueios futuros ({blocks.length})
        </div>
        {blocks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-400">
            Nenhum bloqueio ativo.
          </p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {blocks.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-neutral-900">
                    {b.timeLabel}
                  </span>
                  <span className="text-neutral-600">{b.dateLabel}</span>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onDelete(b.id)}
                    disabled={isPending}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
