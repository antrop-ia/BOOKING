'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/app/lib/supabase/server'

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Cancela uma reserva do proprio usuario logado.
 *
 * Validacao em duas camadas:
 *  1. usuario precisa estar logado
 *  2. UPDATE filtra por id AND user_id = auth.uid() — impede que URL/payload
 *     adulterado afete reserva de outro usuario
 *
 * Usa admin client porque a RLS de cliente so permite SELECT, nao UPDATE.
 */
export async function cancelOwnReservation(reservationId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Sessão expirada. Faça login novamente.' }

  if (!reservationId || typeof reservationId !== 'string') {
    return { ok: false, error: 'Reserva inválida' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId)
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .select('id')

  if (error) return { ok: false, error: 'Falha ao cancelar reserva. Tente novamente.' }

  if (!data || data.length === 0) {
    // 0 linhas afetadas: ou reserva nao existe, ou nao e do user, ou ja estava cancelada.
    return { ok: false, error: 'Reserva não encontrada ou já cancelada.' }
  }

  revalidatePath('/minhas-reservas')
  revalidatePath(`/minhas-reservas/${reservationId.slice(0, 4)}`)
  return { ok: true }
}
