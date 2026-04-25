'use server'

import { headers } from 'next/headers'
import { createClient } from '@/app/lib/supabase/server'
import { clientIpFromHeaders, rateLimit } from '@/app/lib/rate-limit'
import { publicUrl } from '@/app/lib/public-url'

export type RequestResetResult =
  | { ok: true; email: string }
  | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Sprint 5.C — admin esqueci minha senha.
 *
 * Anti-enumeration: sempre retorna ok=true se o email passar na validacao
 * de formato, mesmo se a conta nao existir. O Supabase Auth nao envia email
 * pra contas inexistentes, mas a UI nunca revela isso ao caller.
 *
 * Rate limit 3/min por IP — mesmo padrao do magic link do cliente
 * (app/entrar/actions.ts).
 */
export async function requestAdminPasswordReset(
  formData: FormData
): Promise<RequestResetResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Email inválido' }
  }

  const requestHeaders = await headers()
  const ip = clientIpFromHeaders(requestHeaders)
  const limited = rateLimit(`admin-reset:${ip}`, { limit: 3, windowMs: 60_000 })
  if (!limited.ok) {
    return {
      ok: false,
      error: 'Muitas tentativas em pouco tempo. Aguarde um minuto.',
    }
  }

  const supabase = await createClient()
  const redirectTo = publicUrl('/admin/redefinir-senha', requestHeaders).toString()

  // Supabase Auth lida internamente com o caso "email nao existe": nao envia
  // email, mas tambem nao retorna erro distinto. Mantemos a resposta uniforme
  // pro caller pra evitar enumeration.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    console.error('[requestAdminPasswordReset] supabase error', error)
    // Mensagem generica — nao expor detalhe do Supabase ao publico
    return {
      ok: false,
      error: 'Não foi possível enviar o link agora. Tente novamente.',
    }
  }

  return { ok: true, email }
}
