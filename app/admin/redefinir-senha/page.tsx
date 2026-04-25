import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { NovaSenhaForm } from './NovaSenhaForm'

export const metadata = {
  title: 'Redefinir senha',
  description: 'Crie uma nova senha para sua conta admin.',
}

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ code?: string; error?: string }>
}

export default async function RedefinirSenhaPage({ searchParams }: PageProps) {
  const { code } = await searchParams
  const supabase = await createClient()

  // Caso 1: chegou com ?code=... do email -> trocar code por sessao temporaria
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // Token invalido/expirado: redireciona pra esqueci-senha pra reenviar
      redirect('/admin/esqueci-senha?error=link_expirado')
    }
    // Continua o render — agora ha sessao ativa
  }

  // Caso 2: ja tem sessao (admin logado normalmente trocando senha,
  // ou continuou apos o exchange acima)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Sem code e sem sessao -> nao pode redefinir
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Link invalido</h1>
          <p className="mt-3 text-sm text-neutral-600">
            Este link expirou ou ja foi usado. Clique abaixo pra solicitar um novo.
          </p>
          <Link
            href="/admin/esqueci-senha"
            className="mt-6 inline-block rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Pedir novo link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Nova senha</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Conta: <span className="font-mono text-neutral-700">{user.email}</span>
          </p>
        </div>

        <NovaSenhaForm />
      </div>
    </div>
  )
}
