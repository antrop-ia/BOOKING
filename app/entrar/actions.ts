'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { clientIpFromHeaders, rateLimit } from '@/app/lib/rate-limit'

export type RequestLinkResult =
  | { ok: true; email: string }
  | { ok: false; error: string }

export interface RequestLinkInput {
  email: string
  redirect?: string
  resgatar?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function sanitizeRedirect(raw?: string): string {
  // Aceita apenas paths internos pra evitar open-redirect
  if (!raw) return '/minhas-reservas'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/minhas-reservas'
  return raw
}

/**
 * Dispara o email com magic link do Supabase. Rate limit 3/min por IP pra
 * desencorajar abuso (e tambem evitar explodir a cota de email gratuita).
 */
export async function requestLoginLink(
  input: RequestLinkInput
): Promise<RequestLinkResult> {
  const email = input.email.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Email inválido' }
  }

  const ip = clientIpFromHeaders(await headers())
  const limited = rateLimit(`login-link:${ip}`, { limit: 3, windowMs: 60_000 })
  if (!limited.ok) {
    return {
      ok: false,
      error: 'Muitas tentativas em pouco tempo. Aguarde um minuto.',
    }
  }

  // Constroi URL de callback preservando onde o usuario queria ir
  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? ''
  const redirectPath = sanitizeRedirect(input.redirect)

  const callbackUrl = new URL('/entrar/callback', origin)
  callbackUrl.searchParams.set('redirect', redirectPath)
  if (input.resgatar) {
    callbackUrl.searchParams.set('resgatar', input.resgatar)
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      // Permite criar usuario automaticamente no primeiro acesso (cliente final)
      shouldCreateUser: true,
    },
  })

  if (error) {
    console.error('[requestLoginLink] supabase error', error)
    return {
      ok: false,
      error: 'Não foi possível enviar o link agora. Tente novamente.',
    }
  }

  return { ok: true, email }
}

/**
 * Logout do cliente final. Usada no header e na pagina de "sair".
 */
export async function signOutCliente() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
