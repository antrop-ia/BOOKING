'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/app/lib/supabase/server'
import { resolveAdminTenantContext } from '@/app/lib/tenant'

export type ActionResult = { ok: true } | { ok: false; error: string }

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface WeekdaySetting {
  weekday: Weekday
  active: boolean
  opensAt: string              // HH:mm ou HH:mm:ss
  closesAt: string
  slotDurationMinutes: number
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/

function normalizeTime(raw: string): string | null {
  if (!TIME_RE.test(raw)) return null
  const [h, m] = raw.split(':')
  return `${h}:${m}:00`
}

function validate(entries: WeekdaySetting[]): string | null {
  if (!Array.isArray(entries) || entries.length !== 7) {
    return 'Payload invalido — esperado 7 dias'
  }
  for (const e of entries) {
    if (![0, 1, 2, 3, 4, 5, 6].includes(e.weekday)) {
      return 'Dia da semana invalido'
    }
    if (!e.active) continue
    const open = normalizeTime(e.opensAt)
    const close = normalizeTime(e.closesAt)
    if (!open || !close) return 'Formato de hora invalido (use HH:mm)'
    if (open >= close) return 'O horario de abertura precisa ser antes do fechamento'
    if (!Number.isInteger(e.slotDurationMinutes)) {
      return 'Duracao de slot invalida'
    }
    if (e.slotDurationMinutes < 30 || e.slotDurationMinutes > 180) {
      return 'Duracao de slot deve estar entre 30 e 180 minutos'
    }
  }
  return null
}

export async function updateBusinessHours(
  establishmentId: string,
  entries: WeekdaySetting[]
): Promise<ActionResult> {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) return { ok: false, error: 'Nao autorizado' }
  if (ctx.role === 'operator') {
    return { ok: false, error: 'Apenas owner e manager podem editar horarios' }
  }

  const err = validate(entries)
  if (err) return { ok: false, error: err }

  const admin = createAdminClient()

  // Garante que o establishment pertence ao tenant do usuario logado.
  const { data: est } = await admin
    .from('establishments')
    .select('id')
    .eq('id', establishmentId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()
  if (!est) return { ok: false, error: 'Estabelecimento nao encontrado' }

  // Estrategia: deletar todas as linhas e reinserir so os dias ativos.
  // Atomicidade ideal viria com RPC, mas 7 linhas + tenant isolado e aceitavel.
  const { error: delErr } = await admin
    .from('business_hours')
    .delete()
    .eq('establishment_id', establishmentId)

  if (delErr) {
    console.error('[updateBusinessHours] delete error', delErr)
    return { ok: false, error: 'Falha ao limpar horarios anteriores' }
  }

  const rowsToInsert = entries
    .filter((e) => e.active)
    .map((e) => ({
      tenant_id: ctx.tenantId,
      establishment_id: establishmentId,
      weekday: e.weekday,
      opens_at: normalizeTime(e.opensAt),
      closes_at: normalizeTime(e.closesAt),
      slot_duration_minutes: e.slotDurationMinutes,
    }))

  if (rowsToInsert.length > 0) {
    const { error: insErr } = await admin
      .from('business_hours')
      .insert(rowsToInsert)

    if (insErr) {
      console.error('[updateBusinessHours] insert error', insErr)
      return { ok: false, error: 'Falha ao salvar novos horarios' }
    }
  }

  revalidatePath('/admin/configuracoes/horarios')
  revalidatePath('/admin/reservas')
  revalidatePath('/reservar')
  return { ok: true }
}
