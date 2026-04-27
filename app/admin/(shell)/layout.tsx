import { redirect } from 'next/navigation'
import type { CSSProperties } from 'react'
import { resolveAdminTenantContext } from '@/app/lib/tenant'
import { signOut } from '@/app/admin/login/actions'
import { AdminNavLink } from './nav-link'

export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) redirect('/admin/login')

  const brandStyle = {
    '--brand-primary': ctx.brandColor,
  } as CSSProperties

  return (
    <div style={brandStyle} className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-neutral-200 bg-white p-6 md:block">
          <div className="mb-10 flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            />
            <span className="text-sm font-medium tracking-tight">
              {ctx.tenantName}
            </span>
          </div>

          <nav className="space-y-0.5 text-sm">
            <AdminNavLink href="/admin">Dashboard</AdminNavLink>
            <AdminNavLink href="/admin/reservas">Reservas</AdminNavLink>
            <AdminNavLink href="/admin/configuracoes">Configurações</AdminNavLink>
            <AdminNavLink href="/admin/audit">Auditoria</AdminNavLink>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
            <div className="text-xs text-neutral-500 md:hidden">
              {ctx.tenantName}
            </div>
            <div className="ml-auto flex items-center gap-4 text-sm text-neutral-600">
              <span className="hidden sm:block">{ctx.role}</span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-md border border-neutral-200 px-3 py-1 text-xs text-neutral-700 transition-colors hover:bg-neutral-100"
                >
                  Sair
                </button>
              </form>
            </div>
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
