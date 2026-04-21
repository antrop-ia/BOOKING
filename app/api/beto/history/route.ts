import { readBetoSession } from '@/app/lib/beto/session'
import { loadConversation, clearConversation } from '@/app/lib/beto/persistence'
import { resolvePublicTenantContext } from '@/app/lib/tenant'

export const runtime = 'edge'

const TENANT_SLUG = 'parrilla8187'
const ESTABLISHMENT_SLUG = 'boa-viagem'

async function tenantId(): Promise<string | null> {
  const ctx = await resolvePublicTenantContext(TENANT_SLUG, ESTABLISHMENT_SLUG)
  return ctx?.tenantId ?? null
}

export async function GET() {
  const sessionId = await readBetoSession()
  if (!sessionId) return Response.json({ messages: [] })

  const tid = await tenantId()
  if (!tid) return Response.json({ messages: [] })

  const messages = await loadConversation(tid, sessionId)
  return Response.json({ messages })
}

// DELETE apaga a conversa do banco mas mantem o cookie de sessao.
// Proxima mensagem cria uma nova conversa no banco com o mesmo session_id.
// Para trocar de sessao completamente, o usuario limpa cookies manualmente.
export async function DELETE() {
  const sessionId = await readBetoSession()
  if (!sessionId) return Response.json({ ok: true })

  const tid = await tenantId()
  if (!tid) return Response.json({ ok: true })

  try {
    await clearConversation(tid, sessionId)
  } catch (err) {
    console.error('[beto] clearConversation failed', err)
  }
  return Response.json({ ok: true })
}
