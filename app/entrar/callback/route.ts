import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

/**
 * Recebe o redirect do magic link do Supabase Auth.
 *
 * Fluxo:
 *   1. Supabase envia email com link pra /entrar/callback?code=... [+ redirect + resgatar]
 *   2. Aqui trocamos o code por sessao via exchangeCodeForSession
 *   3. Redirecionamos pro destino (default /minhas-reservas) com cookies da sessao ja setados
 *
 * Se algo falhar, redirect pra /entrar com error.
 */

function safeRedirectPath(raw: string | null): string {
  if (!raw) return '/minhas-reservas'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/minhas-reservas'
  return raw
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const redirectTo = safeRedirectPath(url.searchParams.get('redirect'))
  const resgatar = url.searchParams.get('resgatar')

  if (!code) {
    return NextResponse.redirect(
      new URL('/entrar?error=link_invalido', request.url)
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[entrar/callback] exchange error', error)
    return NextResponse.redirect(
      new URL('/entrar?error=link_expirado', request.url)
    )
  }

  // Se o usuario clicou num link vindo da ConfirmacaoScreen (I-10),
  // preserva o `resgatar` no destino para /minhas-reservas tratar o vinculo
  // automatico da reserva. Sprint 8 — I-07 implementa a logica.
  const finalUrl = new URL(redirectTo, request.url)
  if (resgatar) finalUrl.searchParams.set('resgatar', resgatar)

  return NextResponse.redirect(finalUrl)
}
