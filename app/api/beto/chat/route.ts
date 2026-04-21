import { groq } from '@ai-sdk/groq'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { buildBetoSystemPrompt } from '@/app/lib/beto/system-prompt'
import { readBetoSession } from '@/app/lib/beto/session'
import { saveConversation } from '@/app/lib/beto/persistence'
import { resolvePublicTenantContext } from '@/app/lib/tenant'
import { rateLimit } from '@/app/lib/rate-limit'
import { logAuditEvent } from '@/app/lib/audit'

export const runtime = 'edge'
export const maxDuration = 30

const TENANT_SLUG = 'parrilla8187'
const ESTABLISHMENT_SLUG = 'boa-viagem'

const RATE_LIMIT = { limit: 30, windowMs: 60 * 60 * 1000 }

export async function POST(req: Request) {
  const sessionId = await readBetoSession()
  if (!sessionId) {
    // Middleware deveria ter criado o cookie. Se nao tem, abortar.
    return new Response(
      JSON.stringify({ error: 'Sessao invalida. Recarregue a pagina.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const limited = rateLimit(`beto:${sessionId}`, RATE_LIMIT)
  if (!limited.ok) {
    const retrySec = Math.ceil((limited.resetAt - Date.now()) / 1000)
    await logAuditEvent({
      eventType: 'rate_limit_beto',
      details: { sessionId, resetAtMs: limited.resetAt },
    })
    return new Response(
      JSON.stringify({ error: 'Muitas mensagens. Aguarda um pouco e tenta de novo.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retrySec),
        },
      }
    )
  }

  const ctx = await resolvePublicTenantContext(TENANT_SLUG, ESTABLISHMENT_SLUG)
  if (!ctx) {
    return new Response(JSON.stringify({ error: 'Estabelecimento indisponivel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages }: { messages: UIMessage[] } = await req.json()
  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: buildBetoSystemPrompt(),
    messages: modelMessages,
    temperature: 0.7,
    onFinish: async ({ text }) => {
      const assistantMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        parts: [{ type: 'text', text }],
      }
      try {
        await saveConversation(ctx.tenantId, sessionId, [
          ...messages,
          assistantMessage,
        ])
      } catch (err) {
        console.error('[beto] saveConversation failed', err)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
