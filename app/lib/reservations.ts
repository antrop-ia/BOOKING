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
  | { ok: false; error: string; code?: 'duplicate' | 'unknown' }

export async function createReservation(
  params: CreateReservationParams
): Promise<CreateReservationResult> {
  const slotStart = new Date(params.slotStartISO)
  if (Number.isNaN(slotStart.getTime())) {
    return { ok: false, error: 'Horário inválido' }
  }
  const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000)

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
