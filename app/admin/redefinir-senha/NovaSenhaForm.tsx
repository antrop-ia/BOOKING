'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { updateAdminPassword } from './actions'

export function NovaSenhaForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const passwordValid = password.length >= 8
  const matches = password === confirm
  const canSubmit = passwordValid && matches && !isPending

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    const data = new FormData()
    data.set('password', password)
    data.set('confirm', confirm)
    startTransition(async () => {
      const res = await updateAdminPassword(data)
      if (!res.ok) setError(res.error)
      // Sucesso: action faz redirect; nada mais a fazer aqui.
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-xs font-medium text-neutral-700">
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
          minLength={8}
          maxLength={72}
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-60"
        />
        {password.length > 0 && !passwordValid && (
          <p className="mt-1 text-xs text-red-600">Mínimo de 8 caracteres.</p>
        )}
      </div>

      <div>
        <label htmlFor="confirm" className="block text-xs font-medium text-neutral-700">
          Confirme a senha
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={isPending}
          minLength={8}
          maxLength={72}
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-60"
        />
        {confirm.length > 0 && !matches && (
          <p className="mt-1 text-xs text-red-600">As senhas não batem.</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Salvando...' : 'Salvar nova senha'}
      </button>
    </form>
  )
}
