'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/app/lib/supabase/server'
import { resolveAdminTenantContext } from '@/app/lib/tenant'

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function createSlotBlock(input: {
  establishmentId: string
  slotStartISO: string
}): Promise<ActionResult> {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) return { ok: false, error: 'Nao autorizado' }
  if (ctx.role === 'operator') {
    return { ok: false, error: 'Apenas owner e manager podem bloquear horarios' }
  }

  const start = new Date(input.slotStartISO)
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: 'Data/hora invalida' }
  }
  if (start.getTime() < Date.now() - 60 * 60 * 1000) {
    return { ok: false, error: 'Nao e possivel bloquear um horario no passado' }
  }

  const admin = createAdminClient()

  // Confirma ownership do establishment.
  const { data: est } = await admin
    .from('establishments')
    .select('id')
    .eq('id', input.establishmentId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()
  if (!est) return { ok: false, error: 'Estabelecimento nao encontrado' }

  const { error } = await admin
    .from('slot_blocks')
    .insert({
      tenant_id: ctx.tenantId,
      establishment_id: input.establishmentId,
      slot_start: start.toISOString(),
    })

  if (error) {
    // Pode ser conflito de unique index; mensagem amigavel.
    if (error.code === '23505') {
      return { ok: false, error: 'Esse horario ja esta bloqueado' }
    }
    console.error('[createSlotBlock] error', error)
    return { ok: false, error: 'Falha ao salvar bloqueio' }
  }

  revalidatePath('/admin/configuracoes/bloqueios')
  revalidatePath('/reservar')
  return { ok: true }
}

export async function deleteSlotBlock(id: string): Promise<ActionResult> {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) return { ok: false, error: 'Nao autorizado' }
  if (ctx.role === 'operator') {
    return { ok: false, error: 'Apenas owner e manager podem remover bloqueios' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('slot_blocks')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) {
    console.error('[deleteSlotBlock] error', error)
    return { ok: false, error: 'Falha ao remover bloqueio' }
  }

  revalidatePath('/admin/configuracoes/bloqueios')
  revalidatePath('/reservar')
  return { ok: true }
}
