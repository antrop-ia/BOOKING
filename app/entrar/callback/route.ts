import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { tryAutoResgateByEmail } from '@/app/minhas-reservas/actions'
import { publicUrl } from '@/app/lib/public-url'

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
      publicUrl('/entrar?error=link_invalido', request.headers)
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[entrar/callback] exchange error', error)
    return NextResponse.redirect(
      publicUrl('/entrar?error=link_expirado', request.headers)
    )
  }

  // Sprint 8 I-10: se veio com ?resgatar=, tenta vincular a reserva
  // automaticamente comparando o email do user logado com o email gravado em
  // guest_contact. O ownership do email ja foi provado pelo magic link.
  // Falha silenciosa: o form manual em /minhas-reservas (I-07) continua
  // disponivel se o auto-vinculo nao bater.
  let autoVinculou = false
  if (resgatar) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.email) {
      try {
        autoVinculou = await tryAutoResgateByEmail(user.id, user.email, resgatar)
      } catch (e) {
        console.error('[entrar/callback] auto-resgate falhou', e)
      }
    }
  }

  // So preserva ?resgatar= se NAO conseguiu auto-vincular — assim o form
  // manual e o aviso so aparecem quando precisa de ajuda do user.
  const finalUrl = publicUrl(redirectTo, request.headers)
  if (resgatar && !autoVinculou) finalUrl.searchParams.set('resgatar', resgatar)

  return NextResponse.redirect(finalUrl)
}
