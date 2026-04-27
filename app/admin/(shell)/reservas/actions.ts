'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/app/lib/supabase/server'
import { resolveAdminTenantContext } from '@/app/lib/tenant'
import { createReservation } from '@/app/lib/reservations'
import { notifyGuestConfirmation, notifyNewReservation } from '@/app/lib/notifications'

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function confirmReservation(id: string): Promise<ActionResult> {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) return { ok: false, error: 'Não autorizado' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('reservations')
    .update({ status: 'confirmed' })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { ok: false, error: 'Falha ao confirmar reserva' }

  revalidatePath('/admin/reservas')
  revalidatePath('/admin')
  return { ok: true }
}

export async function cancelReservation(id: string): Promise<ActionResult> {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) return { ok: false, error: 'Não autorizado' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return { ok: false, error: 'Falha ao cancelar reserva' }

  revalidatePath('/admin/reservas')
  revalidatePath('/admin')
  return { ok: true }
}

export interface ManualReservationInput {
  slotStartISO: string
  partySize: number
  spaceId?: string | null
  guest: {
    nome: string
    whatsapp: string
    email?: string
    ocasiao?: string
    observacao?: string
  }
  status?: 'confirmed' | 'pending'
}

export async function createManualReservation(
  input: ManualReservationInput
): Promise<
  | { ok: true; codigo: string; reservationId: string }
  | { ok: false; error: string }
> {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) return { ok: false, error: 'Não autorizado' }

  const admin = createAdminClient()
  const { data: est, error: estErr } = await admin
    .from('establishments')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .limit(1)
    .maybeSingle()

  if (estErr || !est) return { ok: false, error: 'Estabelecimento não encontrado' }

  if (!input.guest.nome.trim() || !input.guest.whatsapp.trim()) {
    return { ok: false, error: 'Nome e WhatsApp são obrigatórios' }
  }
  if (!Number.isFinite(input.partySize) || input.partySize < 1) {
    return { ok: false, error: 'Número de pessoas inválido' }
  }
  // Sprint F.3: capacidade depende de space_id, entao admin tambem precisa
  // escolher um espaco. Sem space_id, try_create_reservation rejeita com
  // space_not_found.
  if (!input.spaceId || input.spaceId.trim() === '') {
    return { ok: false, error: 'Escolha um espaço.' }
  }

  const result = await createReservation({
    tenantId: ctx.tenantId,
    establishmentId: est.id,
    slotStartISO: input.slotStartISO,
    partySize: input.partySize,
    status: input.status ?? 'confirmed',
    source: 'admin',
    spaceId: input.spaceId ?? null,
    guest: input.guest,
    client: admin,
  })

  if (!result.ok) return { ok: false, error: result.error }

  // Sprint 9: notificações WhatsApp também aqui (criação manual). Best-effort.
  // Pega timezone do estabelecimento — fallback America/Recife.
  const { data: estTz } = await admin
    .from('establishments')
    .select('timezone')
    .eq('id', est.id)
    .maybeSingle()
  const timezone = estTz?.timezone ?? 'America/Recife'

  await Promise.all([
    notifyNewReservation({
      reservationId: result.reservationId,
      tenantId: ctx.tenantId,
      establishmentId: est.id,
      timezone,
      client: admin,
    }),
    notifyGuestConfirmation({
      reservationId: result.reservationId,
      tenantId: ctx.tenantId,
      establishmentId: est.id,
      timezone,
      client: admin,
    }),
  ])

  revalidatePath('/admin/reservas')
  revalidatePath('/admin')
  return { ok: true, codigo: result.codigo, reservationId: result.reservationId }
}
