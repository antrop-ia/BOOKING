'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  confirmReservation,
  cancelReservation,
} from './actions'
import { NovaReservaModal } from './NovaReservaModal'
import { friendlyRelativeDate } from '@/app/lib/date'
import { whatsappLink } from '@/app/lib/reservations'

export type RangeFilter = 'hoje' | 'amanha' | 'semana' | 'todos'

export interface ReservaRow {
  id: string
  codigo: string
  nome: string
  contato: string
  contatoRaw: string
  pessoas: number
  dateLocal: string
  horario: string
  turno: 'Almoço' | 'Jantar'
  status: 'confirmed' | 'pending' | 'cancelled'
  ocasiao?: string
  notas?: string
  criadoEm: string
  slotStartISO: string
}

const STATUS_STYLE: Record<
  ReservaRow['status'],
  { bg: string; text: string; dot: string; label: string }
> = {
  confirmed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    label: 'Confirmada',
  },
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    label: 'Pendente',
  },
  cancelled: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-500',
    dot: 'bg-neutral-400',
    label: 'Cancelada',
  },
}

function StatusBadge({ status }: { status: ReservaRow['status'] }) {
  const s = STATUS_STYLE[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export function ReservasView({
  reservations,
  range,
  today,
  timezone,
}: {
  reservations: ReservaRow[]
  range: RangeFilter
  today: string
  timezone: string
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = reservations.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.nome.toLowerCase().includes(q) ||
      r.codigo.toLowerCase().includes(q) ||
      r.contato.includes(q)
    )
  })

  const confirmadas = filtered.filter((r) => r.status === 'confirmed').length
  const pendentes = filtered.filter((r) => r.status === 'pending').length
  const totalPessoas = filtered
    .filter((r) => r.status !== 'cancelled')
    .reduce((sum, r) => sum + r.pessoas, 0)

  const FILTERS: { key: RangeFilter; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'amanha', label: 'Amanhã' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'todos', label: 'Todos' },
  ]

  const setRange = (key: RangeFilter) => {
    const next = new URLSearchParams(params?.toString() ?? '')
    if (key === 'hoje') next.delete('range')
    else next.set('range', key)
    const qs = next.toString()
    router.replace(qs ? `/admin/reservas?${qs}` : '/admin/reservas')
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reservas</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Gerencie as reservas do restaurante
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 self-start rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: 'var(--brand-primary, #18181b)' }}
        >
          <span className="text-base leading-none">+</span>
          Nova reserva
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Confirmadas" value={confirmadas} accent="emerald" />
        <SummaryCard label="Pendentes" value={pendentes} accent="amber" />
        <SummaryCard label="Pessoas esperadas" value={totalPessoas} accent="neutral" />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setRange(f.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                range === f.key
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome, código ou telefone..."
            className="w-full rounded-md border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 sm:w-72"
          />
        </div>
      </div>

      {actionError && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="hidden border-b border-neutral-100 bg-neutral-50/60 px-5 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500 md:grid md:grid-cols-[1fr_80px_100px_1fr_110px_80px]">
          <span>Hóspede</span>
          <span>Pessoas</span>
          <span>Horário</span>
          <span>Contato</span>
          <span>Status</span>
          <span>Código</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-neutral-400">
              Nenhuma reserva encontrada{search ? ` para "${search}"` : ''}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtered.map((r) => (
              <ReservaListItem
                key={r.id}
                reserva={r}
                today={today}
                expanded={expanded === r.id}
                onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                onError={setActionError}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
        <span>
          {filtered.length} reserva{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <NovaReservaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        timezone={timezone}
      />
    </section>
  )
}

function ReservaListItem({
  reserva: r,
  today,
  expanded,
  onToggle,
  onError,
}: {
  reserva: ReservaRow
  today: string
  expanded: boolean
  onToggle: () => void
  onError: (msg: string | null) => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      onError(null)
      const result = await confirmReservation(r.id)
      if (!result.ok) onError(result.error)
    })
  }

  const handleCancel = () => {
    if (!confirm(`Cancelar a reserva ${r.codigo}?`)) return
    startTransition(async () => {
      onError(null)
      const result = await cancelReservation(r.id)
      if (!result.ok) onError(result.error)
    })
  }

  const handleWhatsApp = () => {
    const template =
      `Olá ${r.nome}, aqui é da Parrilla 8187. ` +
      `Sobre sua reserva ${r.codigo} para ${friendlyRelativeDate(r.dateLocal, today)} às ${r.horario} ` +
      `(${r.pessoas} ${r.pessoas === 1 ? 'pessoa' : 'pessoas'}).`
    const href = whatsappLink(r.contato, template)
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      <div
        className="hidden cursor-pointer items-center px-5 py-3.5 text-sm transition-colors hover:bg-neutral-50 md:grid md:grid-cols-[1fr_80px_100px_1fr_110px_80px]"
        onClick={onToggle}
      >
        <div>
          <span className="font-medium text-neutral-900">{r.nome}</span>
          {r.ocasiao && (
            <span className="ml-2 text-xs text-neutral-400">{r.ocasiao}</span>
          )}
        </div>
        <span className="tabular-nums text-neutral-700">{r.pessoas}</span>
        <div>
          <span className="font-mono text-sm tabular-nums text-neutral-900">
            {r.horario}
          </span>
          <span className="ml-1.5 text-xs text-neutral-400">{r.turno}</span>
        </div>
        <span className="text-neutral-600">{r.contato}</span>
        <StatusBadge status={r.status} />
        <span className="font-mono text-xs text-neutral-500">{r.codigo}</span>
      </div>

      <div
        className="cursor-pointer px-4 py-3.5 transition-colors hover:bg-neutral-50 md:hidden"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-900">{r.nome}</p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {r.horario} · {r.turno} · {r.pessoas}{' '}
              {r.pessoas === 1 ? 'pessoa' : 'pessoas'}
            </p>
          </div>
          <StatusBadge status={r.status} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-100 bg-neutral-50/50 px-5 py-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Código" value={r.codigo} mono />
            <Detail label="Data" value={friendlyRelativeDate(r.dateLocal, today)} />
            <Detail label="Contato" value={r.contato || '—'} />
            <Detail label="Criado em" value={r.criadoEm} />
            {r.ocasiao && <Detail label="Ocasião" value={r.ocasiao} />}
            {r.notas && <Detail label="Observações" value={r.notas} />}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {r.status === 'pending' && (
              <ActionBtn
                label={isPending ? 'Confirmando...' : 'Confirmar'}
                variant="primary"
                onClick={handleConfirm}
                disabled={isPending}
              />
            )}
            {r.status !== 'cancelled' && (
              <ActionBtn
                label={isPending ? '...' : 'Cancelar'}
                variant="danger"
                onClick={handleCancel}
                disabled={isPending}
              />
            )}
            {r.contato && (
              <ActionBtn label="WhatsApp" variant="secondary" onClick={handleWhatsApp} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: 'emerald' | 'amber' | 'neutral'
}) {
  const dotColor =
    accent === 'emerald'
      ? 'bg-emerald-500'
      : accent === 'amber'
        ? 'bg-amber-500'
        : 'bg-neutral-400'

  return (
    <div className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white px-5 py-4">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p
        className={`mt-0.5 ${
          mono ? 'font-mono text-xs' : 'text-sm'
        } text-neutral-800`}
      >
        {value}
      </p>
    </div>
  )
}

function ActionBtn({
  label,
  variant,
  onClick,
  disabled,
}: {
  label: string
  variant: 'primary' | 'danger' | 'secondary'
  onClick?: () => void
  disabled?: boolean
}) {
  const base =
    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const styles = {
    primary: `${base} text-white hover:opacity-90`,
    danger: `${base} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`,
    secondary: `${base} border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50`,
  }

  return (
    <button
      type="button"
      className={styles[variant]}
      disabled={disabled}
      onClick={onClick}
      style={
        variant === 'primary'
          ? { backgroundColor: 'var(--brand-primary, #18181b)' }
          : undefined
      }
    >
      {label}
    </button>
  )
}
