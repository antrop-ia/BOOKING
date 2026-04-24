import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { parseGuestContact, normalizeWhatsapp } from './reservations'
import { formatLocalDate, formatLocalTime, friendlyRelativeDate, todayInTimezone } from './date'

/**
 * Sprint 9: cliente HTTP best-effort pra Evolution API + renderizador de
 * template de mensagem. Isolado em server-only: nunca pode chegar no bundle
 * do cliente (expõe API key).
 *
 * Endpoint Evolution v2.x:  POST {evolution_url}/message/sendText/{instance}
 * Headers: apikey
 * Body:    { number, text, delay?, linkPreview? }
 */

export interface NotificationSettings {
  enabled: boolean
  instance_name: string | null
  staff_numbers: string[]
  template_new_reservation: string
  notify_guest: boolean
  template_guest_confirmation: string
}

/**
 * URL + API key da Evolution API vem do env do servidor — nunca do banco,
 * pra nao expor segredo via RLS. Multi-tenant futuro pode migrar pra
 * colunas dedicadas se cada tenant tiver sua propria instancia.
 */
function evolutionConfig(): { url: string; apiKey: string } | null {
  const url = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  if (!url || !apiKey) return null
  return { url, apiKey }
}

export function isEvolutionConfigured(): boolean {
  return evolutionConfig() !== null
}

export interface NotificationContext {
  nome: string
  data: string    // ex: "sex, 24 abr" / "Hoje"
  hora: string    // ex: "19:30"
  pessoas: number
  espaco: string
  ocasiao: string
  codigo: string  // ex: "#P8187-ABCD"
}

// ─────────────────────────────────────────────────────────────────
// renderTemplate
// ─────────────────────────────────────────────────────────────────

const PLACEHOLDERS = ['nome', 'data', 'hora', 'pessoas', 'espaco', 'ocasiao', 'codigo'] as const

export function renderTemplate(template: string, ctx: NotificationContext): string {
  return PLACEHOLDERS.reduce((acc, key) => {
    return acc.split(`{${key}}`).join(String(ctx[key] ?? ''))
  }, template)
}

/**
 * Lista de variaveis disponiveis no template, pra UI do admin.
 */
export const TEMPLATE_VARIABLES = PLACEHOLDERS.slice()

// ─────────────────────────────────────────────────────────────────
// buildContextFromReservation
// ─────────────────────────────────────────────────────────────────

export interface ReservationForNotification {
  id: string
  slot_start: string
  guest_name: string
  guest_contact: string | null
  space_name?: string | null
  space_icon?: string | null
}

export function buildContextFromReservation(
  res: ReservationForNotification,
  timezone: string
): NotificationContext {
  const parsed = parseGuestContact(res.guest_contact ?? undefined)
  const slotDate = new Date(res.slot_start)
  const localDate = formatLocalDate(slotDate, timezone)
  const today = todayInTimezone(timezone)
  const dataFriendly = friendlyRelativeDate(localDate, today)
  const hora = formatLocalTime(slotDate, timezone)

  const espaco = res.space_name
    ? `${res.space_icon ?? ''} ${res.space_name}`.trim()
    : '—'

  return {
    nome: res.guest_name,
    data: dataFriendly,
    hora,
    pessoas: parsed.pessoas ?? 1,
    espaco,
    ocasiao: parsed.ocasiao ?? '—',
    codigo: `#P8187-${res.id.slice(0, 4).toUpperCase()}`,
  }
}

// ─────────────────────────────────────────────────────────────────
// sendWhatsAppText
// ─────────────────────────────────────────────────────────────────

export type SendResult =
  | { ok: true; response: unknown }
  | { ok: false; error: string; status?: number; response?: unknown }

export interface SendWhatsAppParams {
  to: string
  text: string
  instanceName: string
  /** Timeout em ms (default 5000). */
  timeoutMs?: number
}

export async function sendWhatsAppText(params: SendWhatsAppParams): Promise<SendResult> {
  const { to, text, instanceName } = params
  const timeoutMs = params.timeoutMs ?? 5000

  const cfg = evolutionConfig()
  if (!cfg) {
    return { ok: false, error: 'EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados no servidor.' }
  }
  if (!instanceName) {
    return { ok: false, error: 'instance_name não definido.' }
  }

  const normalized = normalizeWhatsapp(to)
  if (!normalized.ok) {
    return { ok: false, error: `Número inválido: ${normalized.error}` }
  }

  const url = `${cfg.url.replace(/\/+$/, '')}/message/sendText/${encodeURIComponent(instanceName)}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.apiKey,
      },
      body: JSON.stringify({ number: normalized.digits, text }),
      signal: controller.signal,
    })
    const body: unknown = await res.json().catch(() => null)

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `Evolution respondeu ${res.status}`,
        response: body,
      }
    }
    return { ok: true, response: body }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  } finally {
    clearTimeout(timer)
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers de instancia — usados pelo admin UI pra parear / ver status
// ─────────────────────────────────────────────────────────────────

export type InstanceState = 'open' | 'close' | 'connecting' | 'unknown'

export interface InstanceStatus {
  state: InstanceState
  qrcodeBase64?: string | null
}

async function evolutionFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const cfg = evolutionConfig()
  if (!cfg) throw new Error('Evolution não configurada no servidor.')
  return fetch(`${cfg.url.replace(/\/+$/, '')}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.apiKey,
      ...(init.headers ?? {}),
    },
  })
}

export async function getInstanceStatus(instanceName: string): Promise<InstanceStatus> {
  try {
    const res = await evolutionFetch(`/instance/connectionState/${encodeURIComponent(instanceName)}`)
    if (!res.ok) return { state: 'unknown' }
    const body = (await res.json()) as { instance?: { state?: string }; state?: string }
    const state = (body.instance?.state ?? body.state ?? 'unknown') as InstanceState
    return { state }
  } catch {
    return { state: 'unknown' }
  }
}

/**
 * Cria instancia se nao existir e devolve QR code em base64. Se ja existir
 * e estiver `open`, retorna state=open sem QR. Se estiver `close` (perdeu
 * sessao), re-chama connect pra gerar novo QR.
 */
export async function ensureInstanceWithQR(instanceName: string): Promise<InstanceStatus> {
  const current = await getInstanceStatus(instanceName)
  if (current.state === 'open') return current

  // Tenta criar (idempotente — erro se ja existe, a gente cai no connect)
  await evolutionFetch('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }),
  }).catch(() => null)

  // Pega o QR
  const res = await evolutionFetch(`/instance/connect/${encodeURIComponent(instanceName)}`)
  if (!res.ok) return current
  const body = (await res.json()) as {
    base64?: string
    code?: string
    qrcode?: { base64?: string }
    instance?: { state?: string }
  }
  const qr = body.base64 ?? body.qrcode?.base64 ?? null
  const state = (body.instance?.state ?? 'connecting') as InstanceState
  return { state, qrcodeBase64: qr }
}

// ─────────────────────────────────────────────────────────────────
// notifyNewReservation — hook chamado após createReservation
// ─────────────────────────────────────────────────────────────────
// Best-effort total: nunca lança, nunca derruba o fluxo. Cada tentativa
// (ok ou falha) grava em notification_log pra troubleshoot depois.

export interface NotifyNewReservationParams {
  reservationId: string
  tenantId: string
  establishmentId: string
  timezone: string
  /** Admin client (service_role) — leitura das settings e escrita no log. */
  client: SupabaseClient
}

export async function notifyNewReservation(
  params: NotifyNewReservationParams
): Promise<void> {
  try {
    const { data: settings } = await params.client
      .from('notification_settings')
      .select('*')
      .eq('tenant_id', params.tenantId)
      .maybeSingle()

    if (!settings || !settings.enabled) return
    if (!settings.staff_numbers || settings.staff_numbers.length === 0) return
    if (!settings.instance_name) return
    if (!isEvolutionConfigured()) return

    const { data: res } = await params.client
      .from('reservations')
      .select(`
        id,
        slot_start,
        guest_name,
        guest_contact,
        establishment_spaces ( name, icon )
      `)
      .eq('id', params.reservationId)
      .single()

    if (!res) return

    const rawSpace = res.establishment_spaces as
      | { name: string; icon: string | null }[]
      | { name: string; icon: string | null }
      | null
    const space = Array.isArray(rawSpace) ? rawSpace[0] ?? null : rawSpace

    const ctx = buildContextFromReservation(
      {
        id: res.id,
        slot_start: res.slot_start,
        guest_name: res.guest_name,
        guest_contact: res.guest_contact,
        space_name: space?.name ?? null,
        space_icon: space?.icon ?? null,
      },
      params.timezone
    )
    const text = renderTemplate(settings.template_new_reservation, ctx)

    // Dispara pra cada staff number, loga cada tentativa
    await Promise.all(
      settings.staff_numbers.map(async (raw: string) => {
        const sendResult = await sendWhatsAppText({
          to: raw,
          text,
          instanceName: settings.instance_name,
        })

        await params.client.from('notification_log').insert({
          tenant_id: params.tenantId,
          reservation_id: params.reservationId,
          event_type: 'new_reservation',
          target_number: raw,
          status: sendResult.ok ? 'sent' : 'failed',
          error: sendResult.ok ? null : sendResult.error,
          response: (sendResult.ok ? sendResult.response : sendResult.response) ?? null,
        })
      })
    )
  } catch (err) {
    // Best-effort: falha silenciosa. Log para dev.
    console.error('[notifyNewReservation] silent failure', err)
  }
}

// ─────────────────────────────────────────────────────────────────
// notifyGuestConfirmation — manda WhatsApp pro proprio cliente
// ─────────────────────────────────────────────────────────────────
// Best-effort: nao deve quebrar o fluxo. Le o WhatsApp do guest_contact
// e envia o template_guest_confirmation. Toggle independente
// (notify_guest) e do enabled — admin pode ter notificacao staff
// rodando e desligar a do cliente, ou vice-versa.

export async function notifyGuestConfirmation(
  params: NotifyNewReservationParams
): Promise<void> {
  try {
    const { data: settings } = await params.client
      .from('notification_settings')
      .select('*')
      .eq('tenant_id', params.tenantId)
      .maybeSingle()

    if (!settings || !settings.notify_guest) return
    if (!settings.instance_name) return
    if (!isEvolutionConfigured()) return

    const { data: res } = await params.client
      .from('reservations')
      .select(`
        id,
        slot_start,
        guest_name,
        guest_contact,
        establishment_spaces ( name, icon )
      `)
      .eq('id', params.reservationId)
      .single()

    if (!res) return

    const parsed = parseGuestContact(res.guest_contact ?? undefined)
    if (!parsed.whatsapp) return // cliente nao informou WhatsApp -> abandona

    const rawSpace = res.establishment_spaces as
      | { name: string; icon: string | null }[]
      | { name: string; icon: string | null }
      | null
    const space = Array.isArray(rawSpace) ? rawSpace[0] ?? null : rawSpace

    const ctx = buildContextFromReservation(
      {
        id: res.id,
        slot_start: res.slot_start,
        guest_name: res.guest_name,
        guest_contact: res.guest_contact,
        space_name: space?.name ?? null,
        space_icon: space?.icon ?? null,
      },
      params.timezone
    )
    const text = renderTemplate(settings.template_guest_confirmation, ctx)

    const sendResult = await sendWhatsAppText({
      to: parsed.whatsapp,
      text,
      instanceName: settings.instance_name,
    })

    await params.client.from('notification_log').insert({
      tenant_id: params.tenantId,
      reservation_id: params.reservationId,
      event_type: 'guest_confirmation',
      target_number: parsed.whatsapp,
      status: sendResult.ok ? 'sent' : 'failed',
      error: sendResult.ok ? null : sendResult.error,
      response: (sendResult.ok ? sendResult.response : sendResult.response) ?? null,
    })
  } catch (err) {
    console.error('[notifyGuestConfirmation] silent failure', err)
  }
}
