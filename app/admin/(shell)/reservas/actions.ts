'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/app/lib/supabase/server'
import { resolveAdminTenantContext } from '@/app/lib/tenant'
import { createReservation } from '@/app/lib/reservations'

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

  revalidatePath('/admin/reservas')
  revalidatePath('/admin')
  return { ok: true, codigo: result.codigo, reservationId: result.reservationId }
}
