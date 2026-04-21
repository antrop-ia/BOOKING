import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/app/lib/supabase/server'
import { resolveAdminTenantContext } from '@/app/lib/tenant'
import { listAllSpacesForAdmin, type EstablishmentSpaceRow } from '@/app/lib/spaces'
import { EspacosView } from './EspacosView'

export default async function EspacosPage() {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: est } = await admin
    .from('establishments')
    .select('id, name')
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

  const spaces: EstablishmentSpaceRow[] = await listAllSpacesForAdmin(
    ctx.tenantId,
    est.id
  )
  const canEdit = ctx.role === 'owner' || ctx.role === 'manager'

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <Link href="/admin/configuracoes" className="hover:text-neutral-900">
          Configurações
        </Link>
        <span>/</span>
        <span className="text-neutral-900">Espaços do restaurante</span>
      </div>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Espaços do restaurante
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Os clientes escolhem obrigatoriamente um espaço ao reservar. Adicione,
        edite ou remova áreas do restaurante — as ativas aparecem em{' '}
        <span className="font-mono">/reservar</span>.
      </p>

      <EspacosView
        initial={spaces}
        establishmentName={est.name}
        canEdit={canEdit}
        role={ctx.role}
      />
    </section>
  )
}
