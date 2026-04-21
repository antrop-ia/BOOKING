'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/app/lib/supabase/server'
import { resolveAdminTenantContext } from '@/app/lib/tenant'
import { slugifyName } from '@/app/lib/spaces'

export type ActionResult = { ok: true } | { ok: false; error: string }

export interface UpsertSpaceInput {
  id?: string
  name: string
  slug?: string
  description: string
  icon: string
  sortOrder: number
  isActive: boolean
}

async function ensureEditorContext(): Promise<
  | { ok: true; tenantId: string; establishmentId: string }
  | { ok: false; error: string }
> {
  const ctx = await resolveAdminTenantContext()
  if (!ctx) return { ok: false, error: 'Nao autorizado' }
  if (ctx.role === 'operator') {
    return { ok: false, error: 'Apenas owner e manager podem gerenciar espacos' }
  }

  const admin = createAdminClient()
  const { data: est } = await admin
    .from('establishments')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .limit(1)
    .maybeSingle()
  if (!est) return { ok: false, error: 'Estabelecimento nao encontrado' }

  return { ok: true, tenantId: ctx.tenantId, establishmentId: est.id }
}

function validate(input: UpsertSpaceInput): string | null {
  const name = input.name.trim()
  if (name.length < 2) return 'Nome precisa ter pelo menos 2 caracteres'
  if (name.length > 60) return 'Nome muito longo (maximo 60 caracteres)'
  if (input.description.trim().length > 240) {
    return 'Descricao muito longa (maximo 240 caracteres)'
  }
  if (input.icon && input.icon.trim().length > 8) {
    return 'Icone muito longo — use 1 emoji'
  }
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 999) {
    return 'Ordem invalida'
  }
  return null
}

export async function upsertSpace(input: UpsertSpaceInput): Promise<ActionResult> {
  const ctx = await ensureEditorContext()
  if (!ctx.ok) return ctx

  const err = validate(input)
  if (err) return { ok: false, error: err }

  const name = input.name.trim()
  const slug = (input.slug?.trim() || slugifyName(name)).slice(0, 60)
  if (!slug) return { ok: false, error: 'Slug invalido' }

  const admin = createAdminClient()
  const payload = {
    tenant_id: ctx.tenantId,
    establishment_id: ctx.establishmentId,
    name,
    slug,
    description: input.description.trim() || null,
    icon: input.icon.trim() || null,
    sort_order: input.sortOrder,
    is_active: input.isActive,
  }

  if (input.id) {
    const { error } = await admin
      .from('establishment_spaces')
      .update(payload)
      .eq('id', input.id)
      .eq('tenant_id', ctx.tenantId)
    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'Ja existe outro espaco com esse slug' }
      }
      console.error('[upsertSpace] update error', error)
      return { ok: false, error: 'Falha ao salvar espaco' }
    }
  } else {
    const { error } = await admin.from('establishment_spaces').insert(payload)
    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'Ja existe outro espaco com esse slug' }
      }
      console.error('[upsertSpace] insert error', error)
      return { ok: false, error: 'Falha ao criar espaco' }
    }
  }

  revalidatePath('/admin/configuracoes/espacos')
  revalidatePath('/reservar')
  return { ok: true }
}

export async function deleteSpace(spaceId: string): Promise<ActionResult> {
  const ctx = await ensureEditorContext()
  if (!ctx.ok) return ctx

  const admin = createAdminClient()
  const { error } = await admin
    .from('establishment_spaces')
    .delete()
    .eq('id', spaceId)
    .eq('tenant_id', ctx.tenantId)

  if (error) {
    console.error('[deleteSpace] error', error)
    return { ok: false, error: 'Falha ao remover espaco' }
  }

  revalidatePath('/admin/configuracoes/espacos')
  revalidatePath('/reservar')
  return { ok: true }
}
