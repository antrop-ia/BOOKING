'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/app/lib/supabase/server'
import {
  parseGuestContact,
  normalizeWhatsapp,
  reservationCodigo,
} from '@/app/lib/reservations'
import { rateLimit } from '@/app/lib/rate-limit'

export type ResgatarResult =
  | { ok: true; codigo: string }
  | { ok: false; error: string }

interface ResgatarInput {
  codigo: string
  whatsapp: string
}

/**
 * Sprint 8 — I-07. Resgata uma reserva feita anonimamente (`user_id IS NULL`)
 * vinculando ao usuario logado.
 *
 * Validacao em camadas:
 *   1. user precisa estar logado
 *   2. rate limit 5 tentativas/min por user (anti brute-force de codigos)
 *   3. codigo precisa bater no formato P8187-XXXX
 *   4. WhatsApp normalizado precisa bater com o `guest_contact` da reserva
 *   5. UPDATE filtra por user_id IS NULL pra evitar race condition (dois
 *      clientes resgatando ao mesmo tempo).
 */
export async function resgatarReserva(input: ResgatarInput): Promise<ResgatarResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Sessão expirada. Faça login novamente.' }

  const limited = rateLimit(`resgatar:${user.id}`, { limit: 5, windowMs: 60_000 })
  if (!limited.ok) {
    return { ok: false, error: 'Muitas tentativas. Aguarde um minuto.' }
  }

  const codigoNorm = (input.codigo ?? '').replace(/^#/, '').trim().toLowerCase()
  const match = codigoNorm.match(/^p8187-([0-9a-f]{4})$/)
  if (!match) {
    return { ok: false, error: 'Código inválido. Use o formato #P8187-XXXX.' }
  }
  const uuidPrefix = match[1]

  const phone = normalizeWhatsapp(input.whatsapp ?? '')
  if (!phone.ok) return { ok: false, error: phone.error }

  const admin = createAdminClient()

  // Procura reservas anonimas com prefixo do uuid. Limita 5 (raro mais de 1
  // colidir, mas defensivo). Filtramos por whatsapp em memoria.
  const { data: rows, error: lookupErr } = await admin
    .from('reservations')
    .select('id, guest_contact, user_id')
    .ilike('id', `${uuidPrefix}%`)
    .is('user_id', null)
    .limit(5)

  if (lookupErr) return { ok: false, error: 'Falha ao buscar reserva. Tente novamente.' }

  const candidato = (rows ?? []).find((r) => {
    const parsed = parseGuestContact(r.guest_contact)
    const theirs = normalizeWhatsapp(parsed.whatsapp)
    return theirs.ok && theirs.digits === phone.digits
  })

  if (!candidato) {
    // Se ha algum row com o prefixo mas user_id ja preenchido, mensagem
    // diferente. Caso contrario, generico.
    const { data: existentes } = await admin
      .from('reservations')
      .select('id, user_id')
      .ilike('id', `${uuidPrefix}%`)
      .limit(1)
    if (existentes && existentes.length > 0 && existentes[0].user_id) {
      return { ok: false, error: 'Essa reserva já está vinculada a outra conta.' }
    }
    return { ok: false, error: 'Reserva não encontrada para esse código + WhatsApp.' }
  }

  const { error: updateErr, data: updated } = await admin
    .from('reservations')
    .update({ user_id: user.id })
    .eq('id', candidato.id)
    .is('user_id', null)
    .select('id')

  if (updateErr) return { ok: false, error: 'Falha ao vincular reserva. Tente novamente.' }
  if (!updated || updated.length === 0) {
    return { ok: false, error: 'Essa reserva já está vinculada a outra conta.' }
  }

  revalidatePath('/minhas-reservas')
  return { ok: true, codigo: reservationCodigo(candidato.id) }
}

/**
 * Sprint 8 — I-10. Tenta resgate automatico apos login: aceita matching por
 * EMAIL (em vez de WhatsApp) — funciona porque o usuario provou ownership do
 * email via magic link. Usado no callback quando vem ?resgatar=.
 *
 * Retorna `true` se vinculou, `false` se nao bateu (silencioso — UI mostra
 * aviso normal de resgatar manual).
 */
export async function tryAutoResgateByEmail(
  userId: string,
  userEmail: string,
  codigoRaw: string
): Promise<boolean> {
  const codigoNorm = codigoRaw.replace(/^#/, '').trim().toLowerCase()
  const match = codigoNorm.match(/^p8187-([0-9a-f]{4})$/)
  if (!match) return false
  const uuidPrefix = match[1]

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('reservations')
    .select('id, guest_contact, user_id')
    .ilike('id', `${uuidPrefix}%`)
    .is('user_id', null)
    .limit(5)

  const emailLower = userEmail.toLowerCase()
  const candidato = (rows ?? []).find((r) => {
    const parsed = parseGuestContact(r.guest_contact)
    return parsed.email?.toLowerCase() === emailLower
  })
  if (!candidato) return false

  const { data: updated } = await admin
    .from('reservations')
    .update({ user_id: userId })
    .eq('id', candidato.id)
    .is('user_id', null)
    .select('id')

  return Boolean(updated && updated.length > 0)
}
