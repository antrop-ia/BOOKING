import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolveAdminTenantContext } from '@/app/lib/tenant'
import { createAdminClient } from '@/app/lib/supabase/server'
import { isEvolutionConfigured } from '@/app/lib/notifications'
import { NotificacoesView } from './NotificacoesView'

export const dynamic = 'force-dynamic'

const DEFAULT_TEMPLATE =
  '🎉 Nova reserva\n\n{nome} ({pessoas} pessoas)\n📅 {data} às {hora}\n📍 {espaco}\n💬 {ocasiao}\n\nCódigo: {codigo}'

export default async function NotificacoesPage() {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) redirect('/admin/login')

  const admin = createAdminClient()
  const [{ data: settings }, { data: logs }] = await Promise.all([
    admin
      .from('notification_settings')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle(),
    admin
      .from('notification_log')
      .select('id, event_type, target_number, status, error, attempted_at')
      .eq('tenant_id', ctx.tenantId)
      .order('attempted_at', { ascending: false })
      .limit(20),
  ])

  const canEdit = ctx.role === 'owner' || ctx.role === 'manager'

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Notificações WhatsApp
        </h1>
        <Link
          href="/admin/configuracoes"
          className="text-xs text-neutral-500 underline hover:text-neutral-300"
        >
          ← Configurações
        </Link>
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        Avisa o WhatsApp do restaurante quando chega reserva nova. Integração
        via Evolution API (instância própria).
      </p>

      <NotificacoesView
        initial={{
          enabled: settings?.enabled ?? false,
          instance_name: settings?.instance_name ?? '',
          staff_numbers: settings?.staff_numbers ?? [],
          template_new_reservation:
            settings?.template_new_reservation ?? DEFAULT_TEMPLATE,
        }}
        evolutionConfigured={isEvolutionConfigured()}
        canEdit={canEdit}
        logs={(logs ?? []).map((l) => ({
          id: l.id as string,
          event_type: l.event_type as string,
          target_number: l.target_number as string,
          status: l.status as string,
          error: l.error as string | null,
          attempted_at: l.attempted_at as string,
        }))}
      />
    </section>
  )
}
