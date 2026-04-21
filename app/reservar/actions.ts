'use server'

import { headers } from 'next/headers'
import { resolvePublicTenantContext } from '@/app/lib/tenant'
import { clientIpFromHeaders, rateLimit } from '@/app/lib/rate-limit'
import { createReservation } from '@/app/lib/reservations'
import { createAdminClient } from '@/app/lib/supabase/server'
import { logAuditEvent } from '@/app/lib/audit'

const TENANT_SLUG = 'parrilla8187'
const ESTABLISHMENT_SLUG = 'boa-viagem'

interface CreateReservationInput {
  slotStartISO: string
  partySize: string
  dados: {
    nome: string
    whatsapp: string
    email?: string
    ocasiao?: string
    observacao?: string
  }
}

export async function createReservationAction(
  input: CreateReservationInput
): Promise<
  | { ok: true; codigo: string; reservationId: string }
  | { ok: false; error: string }
> {
  try {
    const ip = clientIpFromHeaders(await headers())
    const limited = rateLimit(`reserve:${ip}`, { limit: 5, windowMs: 60_000 })
    if (!limited.ok) {
      await logAuditEvent({
        eventType: 'rate_limit_reserve',
        ip,
        details: { resetAtMs: limited.resetAt },
      })
      return {
        ok: false,
        error: 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.',
      }
    }

    const ctx = await resolvePublicTenantContext(TENANT_SLUG, ESTABLISHMENT_SLUG)
    if (!ctx) return { ok: false, error: 'Estabelecimento não encontrado' }

    const partySize = Number(input.partySize)
    if (!Number.isFinite(partySize) || partySize < 1) {
      return { ok: false, error: 'Número de pessoas inválido' }
    }

    const result = await createReservation({
      tenantId: ctx.tenantId,
      establishmentId: ctx.establishmentId,
      slotStartISO: input.slotStartISO,
      partySize,
      status: 'confirmed',
      source: 'public',
      guest: input.dados,
      client: createAdminClient(),
    })

    if (!result.ok) {
      if (result.code === 'over_limit') {
        await logAuditEvent({
          eventType: 'reservation_rejected_over_limit',
          tenantId: ctx.tenantId,
          establishmentId: ctx.establishmentId,
          ip,
          details: { nome: input.dados.nome },
        })
      } else if (result.code === 'invalid_phone') {
        await logAuditEvent({
          eventType: 'reservation_rejected_invalid_phone',
          tenantId: ctx.tenantId,
          establishmentId: ctx.establishmentId,
          ip,
          details: { nome: input.dados.nome, whatsappRaw: input.dados.whatsapp },
        })
      }
      return { ok: false, error: result.error }
    }

    await logAuditEvent({
      eventType: 'reservation_created',
      tenantId: ctx.tenantId,
      establishmentId: ctx.establishmentId,
      ip,
      details: { reservationId: result.reservationId, partySize },
    })

    return { ok: true, codigo: result.codigo, reservationId: result.reservationId }
  } catch {
    return { ok: false, error: 'Erro inesperado. Tente novamente.' }
  }
}
