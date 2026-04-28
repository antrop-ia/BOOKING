import { NextResponse } from 'next/server'
import { resolvePublicTenantContext } from '@/app/lib/tenant'
import { getAvailability } from '@/app/lib/availability'
import { clientIpFromHeaders, rateLimit } from '@/app/lib/rate-limit'
import { logAuditEvent } from '@/app/lib/audit'

const TENANT_SLUG = 'parrilla8187'
const ESTABLISHMENT_SLUG = 'boa-viagem'

export async function GET(request: Request) {
  const ip = clientIpFromHeaders(request.headers)
  const limited = rateLimit(`slots:${ip}`, { limit: 30, windowMs: 60_000 })
  if (!limited.ok) {
    await logAuditEvent({
      eventType: 'rate_limit_slots',
      ip,
      details: { resetAtMs: limited.resetAt },
    })
    return NextResponse.json(
      { ok: false, error: 'Muitas requisições. Tente novamente em alguns segundos.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.max(1, Math.ceil((limited.resetAt - Date.now()) / 1000)).toString(),
        },
      }
    )
  }

  const url = new URL(request.url)
  const date = url.searchParams.get('date')
  const turno = (url.searchParams.get('turno') ?? 'jantar') as 'almoco' | 'jantar'
  const spaceId = url.searchParams.get('space_id')
  const partySizeRaw = url.searchParams.get('party_size')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: 'Data inválida' }, { status: 400 })
  }
  if (!spaceId || !/^[0-9a-f-]{36}$/i.test(spaceId)) {
    return NextResponse.json({ ok: false, error: 'Espaço inválido' }, { status: 400 })
  }
  const partySize = Number(partySizeRaw)
  if (!Number.isFinite(partySize) || partySize < 1 || partySize > 50) {
    return NextResponse.json({ ok: false, error: 'Número de pessoas inválido' }, { status: 400 })
  }

  const ctx = await resolvePublicTenantContext(TENANT_SLUG, ESTABLISHMENT_SLUG)
  if (!ctx) {
    return NextResponse.json({ ok: false, error: 'Establishment não encontrado' }, { status: 404 })
  }

  const slots = await getAvailability(ctx.establishmentId, date, spaceId, partySize)

  // Filtra por turno: almoço 11-16, jantar 17-23 — em hora LOCAL do
  // estabelecimento (ctx.timezone, default America/Recife). Antes usava
  // d.getHours() que retorna server-local (UTC), entao slots gerados em
  // BR caiam no balde errado. Intl.DateTimeFormat com timeZone resolve.
  const tz = ctx.timezone || 'America/Recife'
  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    hourCycle: 'h23',
  })
  const filtered = slots.filter((s) => {
    const localHour = parseInt(hourFormatter.format(new Date(s.start)), 10)
    if (turno === 'almoco') return localHour >= 11 && localHour < 16
    return localHour >= 17 && localHour < 24
  })

  // Cache-Control de 60s e setado no middleware.ts (Sprint 4 D.2). Em Next 16,
  // GET route handlers dinamicos descartam Cache-Control setado aqui — o
  // middleware atua sobre o response final e preserva o header.
  return NextResponse.json({
    ok: true,
    date,
    turno,
    slots: filtered,
  })
}
