'use server'

import { headers } from 'next/headers'
import { resolvePublicTenantContext } from '@/app/lib/tenant'
import { clientIpFromHeaders, rateLimit } from '@/app/lib/rate-limit'
import { createReservation } from '@/app/lib/reservations'
import { createAdminClient } from '@/app/lib/supabase/server'

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
      return { ok: false, error: result.error }
    }

    return { ok: true, codigo: result.codigo, reservationId: result.reservationId }
  } catch {
    return { ok: false, error: 'Erro inesperado. Tente novamente.' }
  }
}
