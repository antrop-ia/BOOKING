'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/app/lib/supabase/server'
import { resolveAdminTenantContext } from '@/app/lib/tenant'
import { normalizeWhatsapp } from '@/app/lib/reservations'
import {
  ensureInstanceWithQR,
  getInstanceStatus,
  isEvolutionConfigured,
  sendWhatsAppText,
  renderTemplate,
  type InstanceStatus,
  type NotificationContext,
} from '@/app/lib/notifications'

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

export interface NotificationSettingsInput {
  enabled: boolean
  instance_name: string
  staff_numbers: string[]
  template_new_reservation: string
  notify_guest: boolean
  template_guest_confirmation: string
}

function assertManager() {
  return resolveAdminTenantContext().then((ctx) => {
    if (!ctx) return { ok: false as const, error: 'Não autorizado' }
    if (ctx.role === 'operator') {
      return {
        ok: false as const,
        error: 'Apenas owner e manager podem editar notificações',
      }
    }
    return { ok: true as const, ctx }
  })
}

export async function updateNotificationSettings(
  input: NotificationSettingsInput
): Promise<ActionResult> {
  const guard = await assertManager()
  if (!guard.ok) return guard
  const { ctx } = guard

  const instance = input.instance_name.trim()
  if (input.enabled && !instance) {
    return { ok: false, error: 'Defina um nome de instância antes de ativar' }
  }
  if (instance && !/^[a-z0-9_-]{3,40}$/i.test(instance)) {
    return {
      ok: false,
      error: 'Nome da instância: 3 a 40 caracteres (letras, números, _ ou -)',
    }
  }

  // Normaliza e deduplica numeros
  const normalized: string[] = []
  const seen = new Set<string>()
  for (const raw of input.staff_numbers) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const n = normalizeWhatsapp(trimmed)
    if (!n.ok) return { ok: false, error: `Número inválido: ${trimmed} — ${n.error}` }
    if (seen.has(n.digits)) continue
    seen.add(n.digits)
    normalized.push(n.digits)
  }
  if (input.enabled && normalized.length === 0) {
    return {
      ok: false,
      error: 'Adicione ao menos 1 número staff antes de ativar',
    }
  }

  const template = input.template_new_reservation.trim()
  if (template.length < 10 || template.length > 1000) {
    return { ok: false, error: 'Template (staff) precisa ter entre 10 e 1000 caracteres' }
  }

  const guestTemplate = input.template_guest_confirmation.trim()
  if (guestTemplate.length < 10 || guestTemplate.length > 1000) {
    return { ok: false, error: 'Template (cliente) precisa ter entre 10 e 1000 caracteres' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('notification_settings')
    .upsert(
      {
        tenant_id: ctx.tenantId,
        enabled: input.enabled,
        instance_name: instance || null,
        staff_numbers: normalized,
        template_new_reservation: template,
        notify_guest: input.notify_guest,
        template_guest_confirmation: guestTemplate,
      },
      { onConflict: 'tenant_id' }
    )

  if (error) {
    console.error('[updateNotificationSettings] supabase error', error)
    return { ok: false, error: 'Falha ao salvar. Tente novamente.' }
  }

  revalidatePath('/admin/configuracoes/notificacoes')
  return { ok: true }
}

export async function checkInstanceStatus(): Promise<
  ActionResult<InstanceStatus & { instanceName: string | null; evolutionConfigured: boolean }>
> {
  const guard = await assertManager()
  if (!guard.ok) return guard
  const { ctx } = guard

  const admin = createAdminClient()
  const { data } = await admin
    .from('notification_settings')
    .select('instance_name')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()

  const instance = data?.instance_name ?? null
  if (!isEvolutionConfigured() || !instance) {
    return {
      ok: true,
      data: {
        state: 'unknown',
        instanceName: instance,
        evolutionConfigured: isEvolutionConfigured(),
      },
    }
  }

  const status = await getInstanceStatus(instance)
  return {
    ok: true,
    data: {
      ...status,
      instanceName: instance,
      evolutionConfigured: true,
    },
  }
}

export async function requestQrCode(): Promise<
  ActionResult<InstanceStatus & { instanceName: string }>
> {
  const guard = await assertManager()
  if (!guard.ok) return guard
  const { ctx } = guard

  const admin = createAdminClient()
  const { data } = await admin
    .from('notification_settings')
    .select('instance_name')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()

  const instance = data?.instance_name
  if (!instance) return { ok: false, error: 'Salve a config com um nome de instância primeiro' }
  if (!isEvolutionConfigured()) return { ok: false, error: 'EVOLUTION_API_URL/KEY não configurados' }

  const res = await ensureInstanceWithQR(instance)
  return { ok: true, data: { ...res, instanceName: instance } }
}

export async function sendTestNotification(): Promise<ActionResult<{ sent: number; failed: number }>> {
  const guard = await assertManager()
  if (!guard.ok) return guard
  const { ctx } = guard

  const admin = createAdminClient()
  const { data: settings } = await admin
    .from('notification_settings')
    .select('instance_name, staff_numbers, template_new_reservation')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()

  if (!settings) return { ok: false, error: 'Salve as configurações antes de testar' }
  if (!settings.instance_name) return { ok: false, error: 'Defina o nome da instância' }
  if (!settings.staff_numbers?.length) return { ok: false, error: 'Adicione ao menos 1 número staff' }
  if (!isEvolutionConfigured()) return { ok: false, error: 'Evolution não configurada no servidor' }

  const fakeCtx: NotificationContext = {
    nome: 'Teste da Parrilla',
    data: 'Hoje',
    hora: '20:00',
    pessoas: 4,
    espaco: '🏛️ Salão interno',
    ocasiao: 'teste de notificação',
    codigo: '#P8187-TEST',
  }
  const text = `[teste] ${renderTemplate(settings.template_new_reservation, fakeCtx)}`

  let sent = 0
  let failed = 0
  for (const to of settings.staff_numbers as string[]) {
    const r = await sendWhatsAppText({ to, text, instanceName: settings.instance_name })
    await admin.from('notification_log').insert({
      tenant_id: ctx.tenantId,
      event_type: 'test',
      target_number: to,
      status: r.ok ? 'sent' : 'failed',
      error: r.ok ? null : r.error,
      response: (r.ok ? r.response : r.response) ?? null,
    })
    if (r.ok) sent++
    else failed++
  }

  revalidatePath('/admin/configuracoes/notificacoes')
  if (failed > 0 && sent === 0) {
    return { ok: false, error: 'Todas as mensagens falharam. Veja o histórico.' }
  }
  return { ok: true, data: { sent, failed } }
}

export async function resendNotification(
  logId: string
): Promise<ActionResult<{ sent: boolean }>> {
  const guard = await assertManager()
  if (!guard.ok) return guard
  const { ctx } = guard

  const admin = createAdminClient()
  const { data: log } = await admin
    .from('notification_log')
    .select('tenant_id, reservation_id, event_type, target_number')
    .eq('id', logId)
    .single()
  if (!log || log.tenant_id !== ctx.tenantId) {
    return { ok: false, error: 'Entrada não encontrada' }
  }

  const { data: settings } = await admin
    .from('notification_settings')
    .select('instance_name, template_new_reservation')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()
  if (!settings?.instance_name) return { ok: false, error: 'Config incompleta' }

  // Reenvio só pra new_reservation (precisa da reserva pra renderizar); test retry
  // reenvia com dados fake.
  let text: string
  if (log.event_type === 'new_reservation' && log.reservation_id) {
    const { data: res } = await admin
      .from('reservations')
      .select(`
        id,
        slot_start,
        guest_name,
        guest_contact,
        establishment_spaces ( name, icon )
      `)
      .eq('id', log.reservation_id)
      .single()
    if (!res) return { ok: false, error: 'Reserva original não existe mais' }

    const { buildContextFromReservation } = await import('@/app/lib/notifications')
    const rawSpace = res.establishment_spaces as
      | { name: string; icon: string | null }[]
      | { name: string; icon: string | null }
      | null
    const space = Array.isArray(rawSpace) ? rawSpace[0] ?? null : rawSpace
    const { data: est } = await admin
      .from('establishments')
      .select('timezone')
      .eq('tenant_id', ctx.tenantId)
      .limit(1)
      .maybeSingle()
    const timezone = est?.timezone ?? 'America/Recife'

    const cc = buildContextFromReservation(
      {
        id: res.id,
        slot_start: res.slot_start,
        guest_name: res.guest_name,
        guest_contact: res.guest_contact,
        space_name: space?.name ?? null,
        space_icon: space?.icon ?? null,
      },
      timezone
    )
    text = `[reenvio] ${renderTemplate(settings.template_new_reservation, cc)}`
  } else {
    return { ok: false, error: 'Só é possível reenviar notificações de reserva' }
  }

  const r = await sendWhatsAppText({
    to: log.target_number,
    text,
    instanceName: settings.instance_name,
  })
  await admin.from('notification_log').insert({
    tenant_id: ctx.tenantId,
    reservation_id: log.reservation_id,
    event_type: log.event_type,
    target_number: log.target_number,
    status: r.ok ? 'sent' : 'failed',
    error: r.ok ? null : r.error,
    response: (r.ok ? r.response : r.response) ?? null,
  })

  revalidatePath('/admin/configuracoes/notificacoes')
  return r.ok ? { ok: true, data: { sent: true } } : { ok: false, error: r.error }
}
