import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/app/lib/supabase/server'
import { resolveAdminTenantContext } from '@/app/lib/tenant'
import { BloqueiosView, type SlotBlockRow } from './BloqueiosView'

export default async function BloqueiosPage() {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) redirect('/admin/login')

  const admin = createAdminClient()

  const { data: est } = await admin
    .from('establishments')
    .select('id, name, timezone')
    .eq('tenant_id', ctx.tenantId)
    .limit(1)
    .maybeSingle()

  if (!est) {
    return (
      <section className="mx-auto max-w-3xl">
        <p className="text-sm text-red-600">Estabelecimento nao encontrado.</p>
      </section>
    )
  }

  const { data: blocksRaw } = await admin
    .from('slot_blocks')
    .select('id, slot_start, created_at')
    .eq('establishment_id', est.id)
    .gte('slot_start', new Date().toISOString())
    .order('slot_start', { ascending: true })
    .limit(200)

  const timezone = est.timezone ?? 'America/Recife'
  const blocks: SlotBlockRow[] = (blocksRaw ?? []).map((b) => ({
    id: b.id,
    slotStartISO: b.slot_start,
    dateLabel: new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(b.slot_start)),
    timeLabel: new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(b.slot_start)),
  }))

  const canEdit = ctx.role === 'owner' || ctx.role === 'manager'

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <Link href="/admin/configuracoes" className="hover:text-neutral-900">
          Configuracoes
        </Link>
        <span>/</span>
        <span className="text-neutral-900">Bloqueios de agenda</span>
      </div>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Bloqueios de agenda
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Marque horarios indisponiveis (feriados, eventos privados, fechamento)
        para que ninguem consiga reservar por <span className="font-mono">/reservar</span>.
      </p>

      <BloqueiosView
        establishmentId={est.id}
        timezone={timezone}
        initial={blocks}
        canEdit={canEdit}
        role={ctx.role}
      />
    </section>
  )
}
