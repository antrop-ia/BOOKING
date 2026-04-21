import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/app/lib/supabase/server'
import { resolveAdminTenantContext } from '@/app/lib/tenant'
import { HorariosForm, type WeekdayRow } from './HorariosForm'

export default async function HorariosPage() {
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

  const { data: hours } = await admin
    .from('business_hours')
    .select('weekday, opens_at, closes_at, slot_duration_minutes')
    .eq('establishment_id', est.id)

  // Monta o array de 7 dias garantindo ordem consistente.
  const byWeekday = new Map(
    (hours ?? []).map((h) => [
      h.weekday as number,
      {
        opensAt: String(h.opens_at).slice(0, 5),
        closesAt: String(h.closes_at).slice(0, 5),
        slotDurationMinutes: h.slot_duration_minutes,
      },
    ])
  )

  const initial: WeekdayRow[] = [0, 1, 2, 3, 4, 5, 6].map((wd) => {
    const existing = byWeekday.get(wd)
    return {
      weekday: wd as WeekdayRow['weekday'],
      active: existing !== undefined,
      opensAt: existing?.opensAt ?? '11:00',
      closesAt: existing?.closesAt ?? '23:00',
      slotDurationMinutes: existing?.slotDurationMinutes ?? 60,
    }
  })

  const canEdit = ctx.role === 'owner' || ctx.role === 'manager'

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <Link href="/admin/configuracoes" className="hover:text-neutral-900">
          Configuracoes
        </Link>
        <span>/</span>
        <span className="text-neutral-900">Horarios de funcionamento</span>
      </div>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Horarios de funcionamento
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Define os dias e horas em que o restaurante aceita reservas. Mudancas
        aqui aparecem imediatamente em <span className="font-mono">/reservar</span>.
      </p>

      <HorariosForm
        establishmentId={est.id}
        establishmentName={est.name}
        initial={initial}
        canEdit={canEdit}
        role={ctx.role}
      />
    </section>
  )
}
