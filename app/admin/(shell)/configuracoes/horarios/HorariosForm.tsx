'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { updateBusinessHours } from './actions'

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface WeekdayRow {
  weekday: Weekday
  active: boolean
  opensAt: string
  closesAt: string
  slotDurationMinutes: number
}

type Role = 'owner' | 'manager' | 'operator'

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']

interface Props {
  establishmentId: string
  establishmentName: string
  initial: WeekdayRow[]
  canEdit: boolean
  role: Role
}

export function HorariosForm({
  establishmentId,
  establishmentName,
  initial,
  canEdit,
  role,
}: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<WeekdayRow[]>(() => structuredClone(initial))
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const dirty = JSON.stringify(rows) !== JSON.stringify(initial)

  const updateRow = (wd: Weekday, patch: Partial<WeekdayRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.weekday === wd ? { ...r, ...patch } : r))
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!dirty || isPending) return
    setToast(null)
    startTransition(async () => {
      const res = await updateBusinessHours(establishmentId, rows)
      if (res.ok) {
        setToast({ kind: 'success', text: 'Horarios salvos' })
        router.refresh()
      } else {
        setToast({ kind: 'error', text: res.error })
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-3 text-xs text-neutral-500">
          Estabelecimento: <span className="font-mono text-neutral-700">{establishmentName}</span>
        </div>
        <div className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <div
              key={row.weekday}
              className={`grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[120px_minmax(0,1fr)] ${
                !row.active ? 'bg-neutral-50/40' : ''
              }`}
            >
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={row.active}
                  onChange={(e) => updateRow(row.weekday, { active: e.target.checked })}
                  disabled={!canEdit || isPending}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                <span className={`font-medium ${row.active ? 'text-neutral-900' : 'text-neutral-400'}`}>
                  {WEEKDAY_LABELS[row.weekday]}
                </span>
              </label>

              {row.active ? (
                <div className="flex flex-wrap items-center gap-3">
                  <TimeInput
                    label="Abre"
                    value={row.opensAt}
                    onChange={(v) => updateRow(row.weekday, { opensAt: v })}
                    disabled={!canEdit || isPending}
                  />
                  <TimeInput
                    label="Fecha"
                    value={row.closesAt}
                    onChange={(v) => updateRow(row.weekday, { closesAt: v })}
                    disabled={!canEdit || isPending}
                  />
                  <DurationSelect
                    value={row.slotDurationMinutes}
                    onChange={(v) => updateRow(row.weekday, { slotDurationMinutes: v })}
                    disabled={!canEdit || isPending}
                  />
                </div>
              ) : (
                <span className="text-sm text-neutral-400">Fechado</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {!canEdit && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Sua funcao (<span className="font-mono">{role}</span>) nao tem permissao para editar horarios.
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

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setRows(structuredClone(initial))
            setToast(null)
          }}
          disabled={!dirty || isPending}
          className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Desfazer
        </button>
        <button
          type="submit"
          disabled={!dirty || !canEdit || isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

/* ── Sub-components ────────────────────────────────────────────── */

function TimeInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-neutral-500">
      {label}
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        step={60 * 15}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 font-mono text-sm text-neutral-900 shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50"
      />
    </label>
  )
}

function DurationSelect({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-neutral-500">
      Slot
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50"
      >
        <option value={30}>30 min</option>
        <option value={60}>60 min</option>
        <option value={90}>90 min</option>
        <option value={120}>120 min</option>
      </select>
    </label>
  )
}
