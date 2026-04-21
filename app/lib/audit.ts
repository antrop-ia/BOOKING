import { createAdminClient } from '@/app/lib/supabase/server'

export type AuditEventType =
  | 'rate_limit_reserve'
  | 'rate_limit_slots'
  | 'rate_limit_beto'
  | 'reservation_rejected_over_limit'
  | 'reservation_rejected_invalid_phone'
  | 'reservation_created'

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
