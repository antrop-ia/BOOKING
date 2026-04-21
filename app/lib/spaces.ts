import { createAdminClient } from '@/app/lib/supabase/server'

export interface EstablishmentSpace {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
}

export interface EstablishmentSpaceRow extends EstablishmentSpace {
  tenantId: string
  establishmentId: string
  createdAt: string
  updatedAt: string
}

/**
 * Lista os espacos ativos de um establishment. Ordem estavel: sort_order
 * ASC, entao name ASC como tie-breaker.
 * Usa admin client (RLS publica permite SELECT mas queremos bypass garantido).
 */
export async function listActiveSpaces(
  establishmentId: string
): Promise<EstablishmentSpace[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('establishment_spaces')
    .select('id, name, slug, description, icon, sort_order, is_active')
    .eq('establishment_id', establishmentId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return (data ?? []).map(mapRow)
}

/**
 * Lista TODOS os espacos (ativos + inativos) para o admin gerenciar.
 */
export async function listAllSpacesForAdmin(
  tenantId: string,
  establishmentId: string
): Promise<EstablishmentSpaceRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('establishment_spaces')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('establishment_id', establishmentId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return (data ?? []).map((row) => ({
    ...mapRow(row),
    tenantId: row.tenant_id,
    establishmentId: row.establishment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function getSpaceById(
  spaceId: string
): Promise<EstablishmentSpace | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('establishment_spaces')
    .select('id, name, slug, description, icon, sort_order, is_active')
    .eq('id', spaceId)
    .maybeSingle()
  return data ? mapRow(data) : null
}

interface RawSpaceRow {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
}

function mapRow(row: RawSpaceRow): EstablishmentSpace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }
}

/**
 * Gera um slug legivel a partir do nome. Util quando o admin cria um
 * espaco novo: tira acentos, minusculas, substitui espacos por hifen.
 */
export function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
