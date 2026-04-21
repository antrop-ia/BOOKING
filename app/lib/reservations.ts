import type { SupabaseClient } from '@supabase/supabase-js'

export interface GuestContactParts {
  whatsapp: string
  email?: string
  ocasiao?: string
  observacao?: string
  pessoas?: number
}

export function buildGuestContact(parts: GuestContactParts): string {
  return [
    parts.whatsapp,
    parts.email,
    parts.ocasiao ? `ocasião: ${parts.ocasiao}` : null,
    parts.observacao ? `obs: ${parts.observacao}` : null,
    typeof parts.pessoas === 'number' ? `pessoas: ${parts.pessoas}` : null,
  ]
    .filter(Boolean)
    .join(' | ')
}

export function parseGuestContact(raw: string | null | undefined): GuestContactParts {
  if (!raw) return { whatsapp: '' }
  const segments = raw.split('|').map((s) => s.trim())
  const out: GuestContactParts = { whatsapp: segments[0] ?? '' }
  for (const seg of segments.slice(1)) {
    if (!seg) continue
    const lower = seg.toLowerCase()
    if (lower.startsWith('ocasião:')) {
      out.ocasiao = seg.slice(seg.indexOf(':') + 1).trim()
    } else if (lower.startsWith('obs:')) {
      out.observacao = seg.slice(seg.indexOf(':') + 1).trim()
    } else if (lower.startsWith('pessoas:')) {
      const n = Number(seg.slice(seg.indexOf(':') + 1).trim())
      if (Number.isFinite(n)) out.pessoas = n
    } else if (!out.email && seg.includes('@')) {
      out.email = seg
    }
  }
  return out
}

export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled'
export type ReservationSource = 'public' | 'admin'

export interface CreateReservationParams {
  tenantId: string
  establishmentId: string
  slotStartISO: string
  partySize: number
  status: ReservationStatus
  source: ReservationSource
  guest: {
    nome: string
    whatsapp: string
    email?: string
    ocasiao?: string
    observacao?: string
  }
  client: SupabaseClient
}

export type CreateReservationResult =
  | { ok: true; codigo: string; reservationId: string }
  | { ok: false; error: string; code?: 'duplicate' | 'unknown' | 'invalid_phone' | 'over_limit' }

/**
 * Limite de reservas futuras ativas por numero de WhatsApp.
 * Vale apenas para o fluxo publico — admin pode criar quantas quiser.
 */
const PUBLIC_WHATSAPP_LIMIT = 3

export async function createReservation(
  params: CreateReservationParams
): Promise<CreateReservationResult> {
  const slotStart = new Date(params.slotStartISO)
  if (Number.isNaN(slotStart.getTime())) {
    return { ok: false, error: 'Horário inválido' }
  }
  const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000)

  // Validacao robusta de WhatsApp (aplicada a publico + admin).
  const phone = normalizeWhatsapp(params.guest.whatsapp)
  if (!phone.ok) {
    return { ok: false, error: phone.error, code: 'invalid_phone' }
  }

  // Limite de reservas futuras por numero — anti-abuse, so fluxo publico.
  if (params.source === 'public') {
    const count = await countActiveReservationsByWhatsapp(
      params.client,
      params.establishmentId,
      phone.digits
    )
    if (count >= PUBLIC_WHATSAPP_LIMIT) {
      return {
        ok: false,
        error: `Você já tem ${PUBLIC_WHATSAPP_LIMIT} reservas ativas nesse número. Cancele uma antes de fazer outra.`,
        code: 'over_limit',
      }
    }
  }

  const guestContact = buildGuestContact({
    whatsapp: params.guest.whatsapp,
    email: params.guest.email,
    ocasiao: params.guest.ocasiao,
    observacao: params.guest.observacao,
    pessoas: params.partySize,
  })

  const { data, error } = await params.client
    .from('reservations')
    .insert({
      tenant_id: params.tenantId,
      establishment_id: params.establishmentId,
      slot_start: slotStart.toISOString(),
      slot_end: slotEnd.toISOString(),
      guest_name: params.guest.nome,
      guest_contact: guestContact,
      status: params.status,
      source: params.source,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        error: 'Esse horário acabou de ser reservado. Escolha outro.',
        code: 'duplicate',
      }
    }
    return {
      ok: false,
      error: 'Não foi possível registrar a reserva. Tente novamente.',
      code: 'unknown',
    }
  }

  const codigo = `#P8187-${data.id.slice(0, 4).toUpperCase()}`
  return { ok: true, codigo, reservationId: data.id }
}

export function reservationCodigo(id: string): string {
  return `#P8187-${id.slice(0, 4).toUpperCase()}`
}

export function sanitizeWhatsappDigits(raw: string): string {
  return raw.replace(/\D+/g, '')
}

export function whatsappLink(phoneRaw: string, message: string): string {
  const digits = sanitizeWhatsappDigits(phoneRaw)
  const normalized = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

/**
 * Valida e normaliza um numero de WhatsApp brasileiro.
 * Aceita com ou sem codigo do pais; retorna sempre digits com prefixo 55.
 *
 * Formatos validos (apos remover nao-digitos):
 *   - 10 digitos: DDD(2) + fixo(8)       — ex: 8133334444
 *   - 11 digitos: DDD(2) + movel(9)      — ex: 81999334444
 *   - 12 digitos: 55 + DDD + fixo(8)     — ex: 558133334444
 *   - 13 digitos: 55 + DDD + movel(9)    — ex: 5581999334444
 */
export function normalizeWhatsapp(
  raw: string
): { ok: true; digits: string } | { ok: false; error: string } {
  const digits = sanitizeWhatsappDigits(raw)
  if (digits.length < 10) {
    return {
      ok: false,
      error: 'Número de WhatsApp incompleto. Inclua DDD + 8 ou 9 dígitos.',
    }
  }
  if (digits.length > 13) {
    return { ok: false, error: 'Número de WhatsApp muito longo.' }
  }
  if (digits.length === 12 || digits.length === 13) {
    if (!digits.startsWith('55')) {
      return { ok: false, error: 'Número internacional não suportado (use formato BR).' }
    }
    return { ok: true, digits }
  }
  return { ok: true, digits: `55${digits}` }
}

/**
 * Conta reservas futuras nao-canceladas no estabelecimento cujo numero de
 * WhatsApp (normalizado) bata com o fornecido. Usa `parseGuestContact` em
 * cada linha — O(n) no total de reservas futuras, aceitavel enquanto o
 * volume e baixo. Uma coluna normalizada + indice resolve isso no futuro.
 */
async function countActiveReservationsByWhatsapp(
  client: SupabaseClient,
  establishmentId: string,
  normalizedDigits: string
): Promise<number> {
  const { data } = await client
    .from('reservations')
    .select('guest_contact')
    .eq('establishment_id', establishmentId)
    .gte('slot_start', new Date().toISOString())
    .neq('status', 'cancelled')

  if (!data) return 0

  return data.filter((r) => {
    const parsed = parseGuestContact(r.guest_contact)
    const theirs = normalizeWhatsapp(parsed.whatsapp)
    return theirs.ok && theirs.digits === normalizedDigits
  }).length
}
