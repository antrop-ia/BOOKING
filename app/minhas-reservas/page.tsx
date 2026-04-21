import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/app/lib/supabase/server'
import { parseGuestContact, reservationCodigo } from '@/app/lib/reservations'
import {
  formatLocalDate,
  formatLocalTime,
  friendlyRelativeDate,
  todayInTimezone,
  turnoFromDate,
} from '@/app/lib/date'
import { MinhasReservasView, type MinhaReserva } from './MinhasReservasView'
import { PublicHeader } from '@/app/_components/PublicHeader'

export const metadata = {
  title: 'Minhas reservas',
  description: 'Suas reservas na Parrilla 8187.',
}

export const dynamic = 'force-dynamic'

const TENANT_SLUG = 'parrilla8187'
const ESTABLISHMENT_SLUG = 'boa-viagem'

interface PageProps {
  searchParams: Promise<{ resgatar?: string }>
}

export default async function MinhasReservasPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/entrar?redirect=/minhas-reservas')

  const params = await searchParams

  // Admin client para fazer join com establishment_spaces e resolver timezone
  const admin = createAdminClient()

  const { data: est } = await admin
    .from('establishments')
    .select('id, timezone')
    .eq('slug', ESTABLISHMENT_SLUG)
    .limit(1)
    .maybeSingle()

  const timezone = est?.timezone ?? 'America/Recife'

  const { data: rows } = await admin
    .from('reservations')
    .select(
      'id, slot_start, guest_name, guest_contact, status, created_at, space:establishment_spaces(name, icon)'
    )
    .eq('user_id', user.id)
    .order('slot_start', { ascending: false })
    .limit(100)

  const now = new Date()
  const today = todayInTimezone(timezone)
  const reservas: MinhaReserva[] = (rows ?? []).map((r) => {
    const slot = new Date(r.slot_start)
    const contact = parseGuestContact(r.guest_contact)
    const spaceField = r.space as unknown as { name: string; icon: string | null } | null

    return {
      id: r.id,
      codigo: reservationCodigo(r.id),
      slotStartISO: slot.toISOString(),
      dateLabel: friendlyRelativeDate(formatLocalDate(slot, timezone), today),
      timeLabel: formatLocalTime(slot, timezone),
      turno: turnoFromDate(slot, timezone),
      pessoas: contact.pessoas ?? 0,
      nome: r.guest_name,
      espacoNome: spaceField?.name ?? null,
      espacoIcon: spaceField?.icon ?? null,
      ocasiao: contact.ocasiao ?? null,
      status: (r.status as MinhaReserva['status']) ?? 'pending',
      isFuture: slot.getTime() >= now.getTime(),
    }
  })

  // Agrupa: proximas (futuro + nao canceladas) e historico (passadas ou canceladas)
  const proximas = reservas
    .filter((r) => r.isFuture && r.status !== 'cancelled')
    .sort((a, b) => a.slotStartISO.localeCompare(b.slotStartISO))

  const historico = reservas
    .filter((r) => !r.isFuture || r.status === 'cancelled')
    .sort((a, b) => b.slotStartISO.localeCompare(a.slotStartISO))

  return (
    <>
      <PublicHeader showMinhasReservas={false} />
      <MinhasReservasView
        userEmail={user.email ?? ''}
        proximas={proximas}
        historico={historico}
        resgatarCodigo={params.resgatar ?? null}
      />
    </>
  )
}
