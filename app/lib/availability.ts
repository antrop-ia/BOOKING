/**
 * app/lib/availability.ts
 *
 * Cálculo de slots disponíveis por estabelecimento e dia.
 *
 * Sprint 4 (D.1): delega o trabalho pra function PL/pgSQL
 * `public.get_availability(establishment_id, date)` — 1 round-trip ao banco
 * em vez das 3 queries TS anteriores. Comportamento equivalente:
 * respeita business_hours, reservas (confirmed/pending) e slot_blocks.
 *
 * Definição da function: supabase/migrations/20260425_get_availability_function.sql
 */

import { createAdminClient } from '@/app/lib/supabase/server'

export type AvailableSlot = {
  start: string
  end: string
  available: boolean
}

type RpcRow = {
  slot_start: string
  slot_end: string
  available: boolean
}

export async function getAvailability(
  establishmentId: string,
  dayISO: string
): Promise<AvailableSlot[]> {
  // RLS pública não expõe reservations/slot_blocks; admin client server-side
  // executa a function SECURITY DEFINER e retorna apenas {start, end, available}.
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('get_availability', {
    p_establishment_id: establishmentId,
    p_date: dayISO,
  })

  if (error) {
    console.error('[getAvailability] rpc error', error)
    return []
  }

  const rows = (data ?? []) as RpcRow[]
  return rows.map((r) => ({
    start: new Date(r.slot_start).toISOString(),
    end: new Date(r.slot_end).toISOString(),
    available: r.available,
  }))
}
