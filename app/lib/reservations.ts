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
  spaceId?: string | null
  /**
   * Sprint 8 I-06: id do usuario autenticado dono da reserva. Quando null,
   * a reserva fica anonima (fluxo publico classico). Resgate posterior via
   * I-07 vincula `user_id` retroativamente.
   */
  userId?: string | null
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
  | {
      ok: false
      error: string
      code?:
        | 'duplicate'
        | 'unknown'
        | 'invalid_phone'
        | 'over_limit'
        | 'over_capacity'
        | 'slot_blocked'
        | 'space_not_found'
    }

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

  // Sprint F.3: try_create_reservation faz advisory lock por (space, slot),
  // valida capacidade e insere atomicamente. Retorna error_code in
  // (over_capacity, slot_blocked, space_not_found) sem inserir, ou
  // error_code=NULL no sucesso.
  if (!params.spaceId) {
    return { ok: false, error: 'Escolha um espaço.', code: 'space_not_found' }
  }

  const { data, error } = await params.client.rpc('try_create_reservation', {
    p_tenant_id: params.tenantId,
    p_establishment_id: params.establishmentId,
    p_space_id: params.spaceId,
    p_slot_start: slotStart.toISOString(),
    p_slot_end: slotEnd.toISOString(),
    p_guest_name: params.guest.nome,
    p_guest_contact: guestContact,
    p_status: params.status,
    p_source: params.source,
    p_user_id: params.userId ?? null,
    p_party_size: params.partySize,
  })

  if (error) {
    return {
      ok: false,
      error: 'Não foi possível registrar a reserva. Tente novamente.',
      code: 'unknown',
    }
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        ok: boolean
        reservation_id: string | null
        error_code: string | null
        remaining_pessoas: number | null
      }
    | undefined

  if (!row) {
    return {
      ok: false,
      error: 'Não foi possível registrar a reserva. Tente novamente.',
      code: 'unknown',
    }
  }

  if (!row.ok) {
    if (row.error_code === 'over_capacity') {
      const left = row.remaining_pessoas ?? 0
      const msg =
        left === 0
          ? 'Esse horário está lotado nesse espaço. Escolha outro.'
          : `Restam apenas ${left} ${left === 1 ? 'vaga' : 'vagas'} nesse horário/espaço. Reduza o número de pessoas ou escolha outro.`
      return { ok: false, error: msg, code: 'over_capacity' }
    }
    if (row.error_code === 'slot_blocked') {
      return {
        ok: false,
        error: 'Esse horário foi bloqueado pelo restaurante. Escolha outro.',
        code: 'slot_blocked',
      }
    }
    if (row.error_code === 'space_not_found') {
      return {
        ok: false,
        error: 'Espaço inválido ou inativo.',
        code: 'space_not_found',
      }
    }
    return {
      ok: false,
      error: 'Não foi possível registrar a reserva. Tente novamente.',
      code: 'unknown',
    }
  }

  if (!row.reservation_id) {
    return {
      ok: false,
      error: 'Não foi possível registrar a reserva. Tente novamente.',
      code: 'unknown',
    }
  }

  const codigo = `#P8187-${row.reservation_id.slice(0, 4).toUpperCase()}`
  return { ok: true, codigo, reservationId: row.reservation_id }
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
