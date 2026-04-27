import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/app/lib/supabase/server'
import {
  parseGuestContact,
  reservationCodigo,
  whatsappLink,
} from '@/app/lib/reservations'
import {
  formatLocalDate,
  formatLocalTime,
  friendlyRelativeDate,
  todayInTimezone,
  turnoFromDate,
} from '@/app/lib/date'
import { buildReservationIcs } from '@/app/lib/ics'
import { RESTAURANT_INFO } from '@/app/lib/beto/menu'
import { ConsultaPublicaView } from './ConsultaPublicaView'

export const metadata = {
  title: 'Reserva',
  description: 'Detalhes da sua reserva.',
}

export const dynamic = 'force-dynamic'

const ESTABLISHMENT_SLUG = 'boa-viagem'

interface PageProps {
  params: Promise<{ codigo: string }>
}

export default async function ConsultaPublicaPage({ params }: PageProps) {
  const { codigo: codigoRaw } = await params
  const codigo = (codigoRaw ?? '').replace(/^#/, '').trim().toLowerCase()

  // Codigo segue formato P8187-XXXX (4 hex chars do uuid). Para qualquer outro
  // formato voltamos pra tela de input com a flag de erro adequada.
  if (!/^p8187-[0-9a-f]{4}$/.test(codigo)) {
    redirect('/reservar/consultar?error=invalido')
  }
  const uuidPrefix = codigo.split('-')[1]

  // Postgres nao tem ILIKE em uuid. Lookup por prefixo virou um range
  // [low, high) construido a partir dos 4 hex chars do codigo.
  const startInt = parseInt(uuidPrefix, 16)
  const lowUuid = `${uuidPrefix}0000-0000-0000-0000-000000000000`
  const highUuid =
    startInt >= 0xffff
      ? 'ffffffff-ffff-ffff-ffff-ffffffffffff'
      : `${(startInt + 1).toString(16).padStart(4, '0')}0000-0000-0000-0000-000000000000`

  const admin = createAdminClient()

  const { data: est } = await admin
    .from('establishments')
    .select('id, timezone')
    .eq('slug', ESTABLISHMENT_SLUG)
    .limit(1)
    .maybeSingle()

  const timezone = est?.timezone ?? 'America/Recife'

  // Lookup publico — limita a 2 pra detectar colisao (raro pq sao 16^4
  // = 65k combinacoes).
  const baseQuery = admin
    .from('reservations')
    .select(
      'id, slot_start, slot_end, guest_name, guest_contact, status, created_at, space:establishment_spaces(name, icon)'
    )
    .gte('id', lowUuid)
    .limit(2)
  const { data: rows } =
    startInt >= 0xffff
      ? await baseQuery.lte('id', highUuid)
      : await baseQuery.lt('id', highUuid)

  if (!rows || rows.length === 0) {
    redirect('/reservar/consultar?error=nao_encontrada')
  }
  if (rows.length > 1) {
    redirect('/reservar/consultar?error=ambiguo')
  }

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

  // Whatsapp do restaurante (se cadastrado em RESTAURANT_INFO)
  const restauranteWhatsapp = RESTAURANT_INFO.whatsapp
    ? whatsappLink(
        RESTAURANT_INFO.whatsapp,
        `Olá! Sobre a reserva ${reservationCodigo(r.id)}.`
      )
    : null

  // notFound apenas pra typecheck garantir que codigo sempre tem prefixo valido.
  // Em runtime o ilike acima ja filtrou, mas mantemos a checagem por seguranca.
  if (!r) notFound()

  return (
    <ConsultaPublicaView
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
      status={r.status as 'confirmed' | 'pending' | 'cancelled'}
      icsDataUrl={icsDataUrl}
      icsFilename={`reserva-${reservationCodigo(r.id).replace('#', '').toLowerCase()}.ics`}
      restauranteWhatsapp={restauranteWhatsapp}
    />
  )
}
