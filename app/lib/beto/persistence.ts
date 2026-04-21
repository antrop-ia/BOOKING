import type { UIMessage } from 'ai'
import { createAdminClient } from '@/app/lib/supabase/server'

export interface BetoConversationRow {
  id: string
  tenant_id: string
  session_id: string
  messages: UIMessage[]
  created_at: string
  updated_at: string
}

export async function loadConversation(
  tenantId: string,
  sessionId: string
): Promise<UIMessage[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('beto_conversations')
    .select('messages')
    .eq('tenant_id', tenantId)
    .eq('session_id', sessionId)
    .maybeSingle()

  const raw = data?.messages as unknown
  if (Array.isArray(raw)) return raw as UIMessage[]
  return []
}

export async function saveConversation(
  tenantId: string,
  sessionId: string,
  messages: UIMessage[]
): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('beto_conversations')
    .upsert(
      {
        tenant_id: tenantId,
        session_id: sessionId,
        messages: messages as unknown as object,
      },
      { onConflict: 'tenant_id,session_id' }
    )
}

export async function clearConversation(
  tenantId: string,
  sessionId: string
): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('beto_conversations')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('session_id', sessionId)
}
