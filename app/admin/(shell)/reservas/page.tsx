import { redirect } from 'next/navigation'
import { createAdminClient } from '@/app/lib/supabase/server'
import { resolveAdminTenantContext } from '@/app/lib/tenant'
import { parseGuestContact, reservationCodigo } from '@/app/lib/reservations'
import { listActiveSpaces } from '@/app/lib/spaces'
import {
  dateRange,
  formatLocalDate,
  formatLocalTime,
  todayInTimezone,
  turnoFromDate,
} from '@/app/lib/date'
import { ReservasView, type ReservaRow, type RangeFilter } from './ReservasView'

const VALID_RANGES: readonly RangeFilter[] = ['hoje', 'amanha', 'semana', 'todos']

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) redirect('/admin/login')

  const params = await searchParams
  const range: RangeFilter = VALID_RANGES.includes(params.range as RangeFilter)
    ? (params.range as RangeFilter)
    : 'hoje'

  const admin = createAdminClient()
  const { data: est } = await admin
    .from('establishments')
    .select('id, timezone')
    .eq('tenant_id', ctx.tenantId)
    .limit(1)
    .maybeSingle()

  const timezone = est?.timezone ?? 'America/Recife'
  const today = todayInTimezone(timezone)

  let query = admin
    .from('reservations')
    .select(
      'id, slot_start, guest_name, guest_contact, status, source, created_at, space_id, space:establishment_spaces(name, icon)'
    )
    .eq('tenant_id', ctx.tenantId)
    .order('slot_start', { ascending: true })
    .limit(500)

  const window = dateRange(today, timezone, range)
  if (window) {
    query = query
      .gte('slot_start', window.startUTC.toISOString())
      .lt('slot_start', window.endUTC.toISOString())
  }

  const [{ data: rows }, spaces] = await Promise.all([
    query,
    est ? listActiveSpaces(est.id) : Promise.resolve([]),
  ])

  const reservations: ReservaRow[] = (rows ?? []).map((r) => {
    const slot = new Date(r.slot_start)
    const contact = parseGuestContact(r.guest_contact)
    const createdAt = new Date(r.created_at)
    const spaceField = r.space as unknown as { name: string; icon: string | null } | null
    return {
      id: r.id,
      codigo: reservationCodigo(r.id),
      nome: r.guest_name,
      contato: contact.whatsapp,
      contatoRaw: r.guest_contact ?? '',
      pessoas: contact.pessoas ?? 0,
      dateLocal: formatLocalDate(slot, timezone),
      horario: formatLocalTime(slot, timezone),
      turno: turnoFromDate(slot, timezone),
      status: (r.status as ReservaRow['status']) ?? 'pending',
      ocasiao: contact.ocasiao,
      notas: contact.observacao,
      espacoNome: spaceField?.name ?? null,
      espacoIcon: spaceField?.icon ?? null,
      criadoEm: new Intl.DateTimeFormat('pt-BR', {
        timeZone: timezone,
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(createdAt),
      slotStartISO: slot.toISOString(),
    }
  })

  return (
    <ReservasView
      reservations={reservations}
      range={range}
      today={today}
      timezone={timezone}
      spaces={spaces.map((s) => ({ id: s.id, name: s.name, icon: s.icon }))}
    />
  )
}
