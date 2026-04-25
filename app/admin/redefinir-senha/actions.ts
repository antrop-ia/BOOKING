'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'

export type UpdatePasswordResult = { ok: true } | { ok: false; error: string }

const MIN_LEN = 8
const MAX_LEN = 72 // limite pratico do bcrypt usado pelo Supabase Auth

/**
 * Sprint 5.C — atualiza a senha do admin logado.
 *
 * Requer sessao ativa (criada pelo callback do magic link de reset).
 * Usado tanto no fluxo "esqueci minha senha" (depois do exchangeCodeForSession)
 * quanto no caso do user querer trocar a senha estando logado normalmente.
 *
 * Apos sucesso, redireciona pra /admin/login com flag de sucesso — assim a
 * sessao temporaria do reset cai e o user faz login com a senha nova.
 */
export async function updateAdminPassword(
  formData: FormData
): Promise<UpdatePasswordResult> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (password.length < MIN_LEN) {
    return { ok: false, error: `A senha precisa ter pelo menos ${MIN_LEN} caracteres.` }
  }
  if (password.length > MAX_LEN) {
    return { ok: false, error: `A senha pode ter no maximo ${MAX_LEN} caracteres.` }
  }
  if (password !== confirm) {
    return { ok: false, error: 'As senhas nao batem. Confirme a mesma em ambos os campos.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      error: 'Sessao expirou. Solicite um novo link de redefinicao.',
    }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    console.error('[updateAdminPassword] supabase error', error)
    if (error.message.toLowerCase().includes('weak')) {
      return { ok: false, error: 'Senha fraca. Misture letras, numeros e simbolos.' }
    }
    if (error.message.toLowerCase().includes('same')) {
      return { ok: false, error: 'A nova senha precisa ser diferente da atual.' }
    }
    return { ok: false, error: 'Falha ao atualizar a senha. Tente novamente.' }
  }

  // Encerra a sessao temporaria pra forcar login limpo com a senha nova.
  await supabase.auth.signOut()
  redirect('/admin/login?success=senha_redefinida')
}
