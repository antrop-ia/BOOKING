/**
 * app/lib/availability.ts
 *
 * Cálculo de slots disponíveis por estabelecimento, dia, espaço e pessoas.
 *
 * Sprint F.3: agora usa `get_availability_v2` (PL/pgSQL) que recebe
 * space_id + party_size e retorna `available` baseado em capacidade do
 * espaço em pessoas, não em "1 reserva por slot".
 *
 * Definição da função:
 *   supabase/migrations/20260427b_slot_capacity_and_party.sql
 */

import { createAdminClient } from '@/app/lib/supabase/server'

export type AvailableSlot = {
  start: string
  end: string
  available: boolean
  remaining_pessoas: number
}

type RpcRow = {
  slot_start: string
  slot_end: string
  available: boolean
  remaining_pessoas: number
}

export async function getAvailability(
  establishmentId: string,
  dayISO: string,
  spaceId: string,
  partySize: number
): Promise<AvailableSlot[]> {
  // RLS pública não expõe reservations/slot_blocks; admin client server-side
  // executa a function SECURITY DEFINER e retorna apenas o agregado.
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('get_availability_v2', {
    p_establishment_id: establishmentId,
    p_date: dayISO,
    p_space_id: spaceId,
    p_party_size: partySize,
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
    remaining_pessoas: r.remaining_pessoas,
  }))
}
