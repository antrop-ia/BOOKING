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

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: 'Data inválida' }, { status: 400 })
  }

  const ctx = await resolvePublicTenantContext(TENANT_SLUG, ESTABLISHMENT_SLUG)
  if (!ctx) {
    return NextResponse.json({ ok: false, error: 'Establishment não encontrado' }, { status: 404 })
  }

  const slots = await getAvailability(ctx.establishmentId, date)

  // Filtra por turno: almoço 11-16, jantar 17-23 (baseado em horário LOCAL do estabelecimento)
  const filtered = slots.filter((s) => {
    const d = new Date(s.start)
    const hour = d.getHours()
    if (turno === 'almoco') return hour >= 11 && hour < 16
    return hour >= 17 && hour < 24
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
