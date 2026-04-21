import Link from 'next/link'
import { resolveAdminTenantContext } from '@/app/lib/tenant'
import { redirect } from 'next/navigation'
import { ConfiguracoesForm } from './ConfiguracoesForm'

export default async function ConfiguracoesPage() {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) redirect('/admin/login')

  const canEdit = ctx.role === 'owner' || ctx.role === 'manager'

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Identidade visual e dados do restaurante.
      </p>

      <ConfiguracoesForm
        initial={{
          name: ctx.tenantName,
          brandColor: ctx.brandColor,
          logoUrl: ctx.logoUrl ?? '',
        }}
        tenantSlug={ctx.tenantSlug}
        role={ctx.role}
        canEdit={canEdit}
      />

      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Operação
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <SettingCard
          href="/admin/configuracoes/horarios"
          title="Horários de funcionamento"
          description="Dias da semana, horário de abertura e fechamento, duração dos slots."
        />
        <SettingCard
          href="/admin/configuracoes/bloqueios"
          title="Bloqueios de agenda"
          description="Feriados, eventos privados e outros horários indisponíveis."
        />
      </div>
    </section>
  )
}

function SettingCard({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        <span className="text-neutral-400 transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{description}</p>
    </Link>
  )
}
