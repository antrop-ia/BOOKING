'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/app/lib/supabase/server'
import { resolveAdminTenantContext } from '@/app/lib/tenant'

export type ActionResult = { ok: true } | { ok: false; error: string }

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

function isValidHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

export interface UpdateTenantInput {
  name: string
  brandColor: string
  logoUrl: string
}

export async function updateTenant(input: UpdateTenantInput): Promise<ActionResult> {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) return { ok: false, error: 'Não autorizado' }

  // Operator nao pode editar identidade do tenant (so owner e manager)
  if (ctx.role === 'operator') {
    return { ok: false, error: 'Apenas owner e manager podem editar as configurações' }
  }

  const name = input.name.trim()
  const brandColor = input.brandColor.trim()
  const logoUrl = input.logoUrl.trim()

  if (name.length < 3) {
    return { ok: false, error: 'Nome precisa ter pelo menos 3 caracteres' }
  }
  if (name.length > 80) {
    return { ok: false, error: 'Nome muito longo (máximo 80 caracteres)' }
  }
  if (!HEX_COLOR_RE.test(brandColor)) {
    return { ok: false, error: 'Cor de marca precisa estar no formato #RRGGBB' }
  }
  if (logoUrl && !isValidHttpsUrl(logoUrl)) {
    return { ok: false, error: 'URL do logo precisa ser HTTPS válida (ou vazia)' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('tenants')
    .update({
      name,
      brand_color: brandColor,
      logo_url: logoUrl || null,
    })
    .eq('id', ctx.tenantId)

  if (error) {
    console.error('[updateTenant] supabase error', error)
    return { ok: false, error: 'Falha ao salvar. Tente novamente.' }
  }

  revalidatePath('/admin', 'layout')
  return { ok: true }
}
