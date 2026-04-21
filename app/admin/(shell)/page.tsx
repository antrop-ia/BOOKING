import { resolveAdminTenantContext } from '@/app/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/app/lib/supabase/server'
import { parseGuestContact } from '@/app/lib/reservations'
import {
  addDays,
  formatLocalTime,
  localMidnightUTC,
  todayInTimezone,
  turnoFromDate,
} from '@/app/lib/date'

export default async function AdminDashboard() {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: est } = await admin
    .from('establishments')
    .select('id, timezone')
    .eq('tenant_id', ctx.tenantId)
    .limit(1)
    .maybeSingle()

  const timezone = est?.timezone ?? 'America/Recife'
  const today = todayInTimezone(timezone)
  const tomorrow = addDays(today, 1)
  const dayAfter = addDays(today, 2)
  const weekEnd = addDays(today, 7)

  const todayStart = localMidnightUTC(today, timezone).toISOString()
  const tomorrowStart = localMidnightUTC(tomorrow, timezone).toISOString()
  const dayAfterStart = localMidnightUTC(dayAfter, timezone).toISOString()
  const weekEndStart = localMidnightUTC(weekEnd, timezone).toISOString()

  const base = () =>
    admin
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)
      .neq('status', 'cancelled')

  const [todayRes, tomorrowRes, weekRes, upcomingRes] = await Promise.all([
    base().gte('slot_start', todayStart).lt('slot_start', tomorrowStart),
    base().gte('slot_start', tomorrowStart).lt('slot_start', dayAfterStart),
    base().gte('slot_start', todayStart).lt('slot_start', weekEndStart),
    admin
      .from('reservations')
      .select('id, slot_start, guest_name, guest_contact, status')
      .eq('tenant_id', ctx.tenantId)
      .neq('status', 'cancelled')
      .gte('slot_start', new Date().toISOString())
      .lt('slot_start', dayAfterStart)
      .order('slot_start', { ascending: true })
      .limit(5),
  ])

  const todayCount = todayRes.count ?? 0
  const tomorrowCount = tomorrowRes.count ?? 0
  const weekCount = weekRes.count ?? 0

  const { data: partyRows } = await admin
    .from('reservations')
    .select('guest_contact')
    .eq('tenant_id', ctx.tenantId)
    .neq('status', 'cancelled')
    .gte('slot_start', todayStart)
    .lt('slot_start', dayAfterStart)

  const totalPessoas = (partyRows ?? []).reduce((sum, row) => {
    const p = parseGuestContact(row.guest_contact).pessoas ?? 0
    return sum + p
  }, 0)

  const upcoming = (upcomingRes.data ?? []).map((r) => {
    const slot = new Date(r.slot_start)
    const contact = parseGuestContact(r.guest_contact)
    return {
      id: r.id,
      horario: formatLocalTime(slot, timezone),
      nome: r.guest_name,
      pessoas: contact.pessoas ?? 0,
      status: r.status as 'confirmed' | 'pending',
      turno: turnoFromDate(slot, timezone),
      ocasiao: contact.ocasiao,
    }
  })

  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Bem-vindo de volta ao painel de {ctx.tenantName}.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Reservas hoje" value={String(todayCount)} />
        <Card label="Amanhã" value={String(tomorrowCount)} />
        <Card label="Próximos 7 dias" value={String(weekCount)} />
        <Card
          label="Pessoas esperadas"
          value={String(totalPessoas)}
          hint="Hoje + amanhã"
        />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Próximas reservas</h2>
          <Link
            href="/admin/reservas"
            className="text-xs font-medium transition-colors hover:text-neutral-900"
            style={{ color: 'var(--brand-primary, #525252)' }}
          >
            Ver todas →
          </Link>
        </div>
        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {upcoming.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-neutral-400">
              Nenhuma reserva próxima.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {upcoming.map((r) => (
                <QuickRow
                  key={r.id}
                  time={r.horario}
                  name={r.nome}
                  party={r.pessoas}
                  status={r.status}
                  turno={r.turno}
                  tag={r.ocasiao}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Card({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-neutral-400">{hint}</p>}
    </div>
  )
}

function QuickRow({
  time,
  name,
  party,
  status,
  turno,
  tag,
}: {
  time: string
  name: string
  party: number
  status: 'confirmed' | 'pending'
  turno: string
  tag?: string
}) {
  const isConfirmed = status === 'confirmed'
  return (
    <div className="flex items-center justify-between px-5 py-3 text-sm">
      <div className="flex items-center gap-4">
        <span className="w-12 font-mono tabular-nums text-neutral-900">{time}</span>
        <div>
          <span className="font-medium text-neutral-900">{name}</span>
          {tag && <span className="ml-2 text-xs text-neutral-400">{tag}</span>}
          <p className="text-xs text-neutral-400">
            {party} {party === 1 ? 'pessoa' : 'pessoas'} · {turno}
          </p>
        </div>
      </div>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isConfirmed
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isConfirmed ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />
        {isConfirmed ? 'Confirmada' : 'Pendente'}
      </span>
    </div>
  )
}
