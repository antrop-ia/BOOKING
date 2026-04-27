import { createAdminClient } from '@/app/lib/supabase/server'

export type AuditEventType =
  | 'rate_limit_reserve'
  | 'rate_limit_slots'
  | 'rate_limit_beto'
  | 'reservation_rejected_over_limit'
  | 'reservation_rejected_invalid_phone'
  | 'reservation_created'
  | 'burst_detected'

export interface LogEventInput {
  eventType: AuditEventType
  tenantId?: string | null
  establishmentId?: string | null
  ip?: string | null
  details?: Record<string, unknown>
}

/**
 * Registra um evento no audit_log. Best-effort: falha silenciosamente para
 * nunca derrubar a UX do usuario final. Use so em server-side (edge ou node).
 */
export async function logAuditEvent(input: LogEventInput): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('audit_log').insert({
      event_type: input.eventType,
      tenant_id: input.tenantId ?? null,
      establishment_id: input.establishmentId ?? null,
      ip: input.ip ?? null,
      details: input.details ?? {},
    })
  } catch (err) {
    // Nao re-throw: auditoria nao pode quebrar o fluxo principal.
    console.error('[audit] logEvent failed', err)
  }
}

/**
 * Sprint 6.A.3 — deteccao de burst: chamar logo apos uma reserva ser criada
 * com sucesso. Conta quantas reservas o IP fez na ultima janela; se passa do
 * threshold, registra um evento `burst_detected` com a contagem (uma vez —
 * nao spamma).
 *
 * Best-effort. Nunca bloqueia a reserva ja criada — so deixa rastro pra
 * humano investigar via /admin/audit.
 */
export async function checkReservationBurst(params: {
  ip: string | null
  tenantId: string | null
  establishmentId: string | null
  windowMs?: number
  threshold?: number
}): Promise<void> {
  if (!params.ip) return
  const windowMs = params.windowMs ?? 10 * 60_000
  const threshold = params.threshold ?? 5

  try {
    const admin = createAdminClient()
    const since = new Date(Date.now() - windowMs).toISOString()

    // Conta reservas criadas pelo mesmo IP na janela (inclusive a recem-criada).
    const { count: reservationCount } = await admin
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'reservation_created')
      .eq('ip', params.ip)
      .gte('ts', since)

    if ((reservationCount ?? 0) <= threshold) return

    // Anti-spam: so loga um burst_detected por IP por janela. Se ja existe um
    // burst_detected recente desse IP, nao registra de novo.
    const { count: existingBurst } = await admin
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'burst_detected')
      .eq('ip', params.ip)
      .gte('ts', since)

    if ((existingBurst ?? 0) > 0) return

    await logAuditEvent({
      eventType: 'burst_detected',
      tenantId: params.tenantId,
      establishmentId: params.establishmentId,
      ip: params.ip,
      details: {
        reservationCount,
        windowMinutes: Math.round(windowMs / 60_000),
        threshold,
      },
    })
  } catch (err) {
    console.error('[audit] checkReservationBurst failed', err)
  }
}
