import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/app/lib/supabase/server'
import { resolveAdminTenantContext } from '@/app/lib/tenant'
import type { AuditEventType } from '@/app/lib/audit'
import { AuditDetailsCell } from './AuditDetailsCell'

const VALID_RANGES = ['24h', '7d', '30d', 'all'] as const
type Range = (typeof VALID_RANGES)[number]

const VALID_EVENT_TYPES: readonly AuditEventType[] = [
  'rate_limit_reserve',
  'rate_limit_slots',
  'rate_limit_beto',
  'reservation_rejected_over_limit',
  'reservation_rejected_invalid_phone',
  'reservation_created',
  'burst_detected',
]

const EVENT_LABEL: Record<AuditEventType, string> = {
  rate_limit_reserve: 'Rate limit (reserva)',
  rate_limit_slots: 'Rate limit (slots)',
  rate_limit_beto: 'Rate limit (Beto)',
  reservation_rejected_over_limit: 'Reserva rejeitada (limite/numero)',
  reservation_rejected_invalid_phone: 'Reserva rejeitada (telefone invalido)',
  reservation_created: 'Reserva criada',
  burst_detected: 'Burst detectado',
}

const EVENT_COLOR: Record<AuditEventType, string> = {
  rate_limit_reserve: 'bg-amber-100 text-amber-800',
  rate_limit_slots: 'bg-amber-100 text-amber-800',
  rate_limit_beto: 'bg-amber-100 text-amber-800',
  reservation_rejected_over_limit: 'bg-red-100 text-red-800',
  reservation_rejected_invalid_phone: 'bg-red-100 text-red-800',
  reservation_created: 'bg-emerald-100 text-emerald-800',
  burst_detected: 'bg-rose-100 text-rose-900 font-semibold',
}

const RANGE_HOURS: Record<Range, number | null> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
  all: null,
}

const PAGE_LIMIT = 200

export const metadata = {
  title: 'Auditoria',
}

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    event?: string
    ip?: string
    range?: string
  }>
}

export default async function AuditPage({ searchParams }: PageProps) {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) redirect('/admin/login')

  const params = await searchParams
  const range: Range = (VALID_RANGES as readonly string[]).includes(params.range ?? '')
    ? (params.range as Range)
    : '7d'
  const eventFilter = (VALID_EVENT_TYPES as readonly string[]).includes(params.event ?? '')
    ? (params.event as AuditEventType)
    : null
  const ipFilter = params.ip?.trim() ? params.ip.trim() : null

  const admin = createAdminClient()
  let query = admin
    .from('audit_log')
    .select('id, ts, event_type, ip, details, tenant_id, establishment_id')
    .eq('tenant_id', ctx.tenantId)
    .order('ts', { ascending: false })
    .limit(PAGE_LIMIT)

  const hours = RANGE_HOURS[range]
  if (hours !== null) {
    const since = new Date(Date.now() - hours * 60 * 60_000).toISOString()
    query = query.gte('ts', since)
  }
  if (eventFilter) {
    query = query.eq('event_type', eventFilter)
  }
  if (ipFilter) {
    query = query.eq('ip', ipFilter)
  }

  const { data: rows, error } = await query

  const tzFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Recife',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Auditoria</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Eventos de seguranca e atividade. Limite de {PAGE_LIMIT} linhas mais recentes.
          </p>
        </div>
      </div>

      <form
        action="/admin/audit"
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm"
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-600">Janela</span>
          <select
            name="range"
            defaultValue={range}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="24h">Ultimas 24h</option>
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="all">Tudo</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-600">Tipo de evento</span>
          <select
            name="event"
            defaultValue={eventFilter ?? ''}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {VALID_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_LABEL[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-600">IP</span>
          <input
            name="ip"
            type="text"
            defaultValue={ipFilter ?? ''}
            placeholder="opcional"
            className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm font-mono"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Filtrar
        </button>
        {(eventFilter || ipFilter || range !== '7d') && (
          <Link
            href="/admin/audit"
            className="text-xs text-neutral-500 underline hover:text-neutral-900"
          >
            Limpar filtros
          </Link>
        )}
      </form>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Erro ao consultar audit_log: {error.message}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Quando</th>
              <th className="px-3 py-2 text-left font-medium">Evento</th>
              <th className="px-3 py-2 text-left font-medium">IP</th>
              <th className="px-3 py-2 text-left font-medium">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(rows ?? []).map((row) => {
              const eventType = row.event_type as AuditEventType
              const known = (VALID_EVENT_TYPES as readonly string[]).includes(eventType)
              return (
                <tr key={row.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-neutral-700">
                    {tzFormatter.format(new Date(row.ts))}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${
                        known
                          ? EVENT_COLOR[eventType]
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {known ? EVENT_LABEL[eventType] : eventType}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-700">
                    {row.ip ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-700">
                    <AuditDetailsCell details={row.details} />
                  </td>
                </tr>
              )
            })}
            {(rows ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-center text-sm text-neutral-500"
                >
                  Nenhum evento no periodo/filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
