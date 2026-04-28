import { notFound, redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/app/lib/supabase/server'
import { parseGuestContact, reservationCodigo } from '@/app/lib/reservations'
import {
  formatLocalDate,
  formatLocalTime,
  friendlyRelativeDate,
  todayInTimezone,
  turnoFromDate,
} from '@/app/lib/date'
import { buildReservationIcs } from '@/app/lib/ics'
import { ReservaDetailView } from './ReservaDetailView'
import { PublicHeader } from '@/app/_components/PublicHeader'

export const metadata = {
  title: 'Detalhe da reserva',
  description: 'Detalhes e gestão da sua reserva.',
}

export const dynamic = 'force-dynamic'

const ESTABLISHMENT_SLUG = 'boa-viagem'

interface PageProps {
  params: Promise<{ codigo: string }>
}

export default async function ReservaDetailPage({ params }: PageProps) {
  const { codigo: codigoRaw } = await params
  const codigo = (codigoRaw ?? '').replace(/^#/, '').trim().toLowerCase()

  // Codigo segue formato P8187-XXXX (4 hex chars do uuid). So aceita esse padrao
  // pra evitar lookup com strings arbitrarias.
  const match = codigo.match(/^p8187-([0-9a-f]{4})$/)
  if (!match) notFound()
  const uuidPrefix = match[1]

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/entrar?redirect=/minhas-reservas/${codigoRaw}`)
  }

  const admin = createAdminClient()

  const { data: est } = await admin
    .from('establishments')
    .select('id, timezone')
    .eq('slug', ESTABLISHMENT_SLUG)
    .limit(1)
    .maybeSingle()

  const timezone = est?.timezone ?? 'America/Recife'

  // Postgres nao tem ILIKE em uuid. Lookup por prefixo virou um range
  // [low, high) construido a partir dos 4 hex chars do codigo. Mesmo
  // workaround usado em /reservar/consultar/[codigo].
  const startInt = parseInt(uuidPrefix, 16)
  const lowUuid = `${uuidPrefix}0000-0000-0000-0000-000000000000`
  const highUuid =
    startInt >= 0xffff
      ? 'ffffffff-ffff-ffff-ffff-ffffffffffff'
      : `${(startInt + 1).toString(16).padStart(4, '0')}0000-0000-0000-0000-000000000000`

  // Busca por prefixo do uuid + ownership. Limita a 2 pra detectar colisao
  // (raro, mas possivel — codigo e so 4 chars).
  const baseQuery = admin
    .from('reservations')
    .select(
      'id, slot_start, slot_end, guest_name, guest_contact, status, created_at, space:establishment_spaces(name, icon)'
    )
    .eq('user_id', user.id)
    .gte('id', lowUuid)
    .limit(2)
  const { data: rows } =
    startInt >= 0xffff
      ? await baseQuery.lte('id', highUuid)
      : await baseQuery.lt('id', highUuid)

  if (!rows || rows.length === 0) notFound()
  // Colisao de prefixo dentro do mesmo user: forca voltar pra listagem.
  if (rows.length > 1) notFound()

  const r = rows[0]
  const slot = new Date(r.slot_start)
  const slotEnd = new Date(r.slot_end ?? slot.getTime() + 60 * 60 * 1000)
  const contact = parseGuestContact(r.guest_contact)
  const spaceField = r.space as unknown as { name: string; icon: string | null } | null

  const ics = buildReservationIcs({
    uid: `${r.id}@parilla8187.antrop-ia.com`,
    summary: `Reserva ${reservationCodigo(r.id)} · Parrilla 8187`,
    description: [
      `Nome: ${r.guest_name}`,
      `Pessoas: ${contact.pessoas ?? '—'}`,
      spaceField?.name ? `Espaço: ${spaceField.name}` : null,
      contact.ocasiao ? `Ocasião: ${contact.ocasiao}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    location: 'Parrilla 8187 — Boa Viagem, Recife',
    startUTC: slot,
    endUTC: slotEnd,
  })
  const icsDataUrl = `data:text/calendar;charset=utf-8;base64,${Buffer.from(ics, 'utf-8').toString('base64')}`

  return (
    <>
      <PublicHeader />
      <ReservaDetailView
      id={r.id}
      codigo={reservationCodigo(r.id)}
      nome={r.guest_name}
      dateLabel={friendlyRelativeDate(formatLocalDate(slot, timezone), todayInTimezone(timezone))}
      timeLabel={formatLocalTime(slot, timezone)}
      turno={turnoFromDate(slot, timezone)}
      pessoas={contact.pessoas ?? 0}
      espacoNome={spaceField?.name ?? null}
      espacoIcon={spaceField?.icon ?? null}
      ocasiao={contact.ocasiao ?? null}
      observacao={contact.observacao ?? null}
      whatsappCliente={contact.whatsapp ?? null}
      status={r.status as 'confirmed' | 'pending' | 'cancelled'}
      createdAtISO={r.created_at}
      timezone={timezone}
      icsDataUrl={icsDataUrl}
      icsFilename={`reserva-${reservationCodigo(r.id).replace('#', '').toLowerCase()}.ics`}
      />
    </>
  )
}
