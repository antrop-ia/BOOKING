'use client'

import { useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { requestAdminPasswordReset } from './actions'

export function EsqueciSenhaForm() {
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!emailValid || isPending) return
    setError(null)
    const data = new FormData()
    data.set('email', email)
    startTransition(async () => {
      const res = await requestAdminPasswordReset(data)
      if (res.ok) {
        setSentTo(res.email)
      } else {
        setError(res.error)
      }
    })
  }

  if (sentTo) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-900">
        <p className="font-medium">Se o email existir, você vai receber um link.</p>
        <p className="mt-2 text-emerald-800">
          Enviamos um link de redefinição de senha para{' '}
          <span className="font-mono">{sentTo}</span>. Abra seu email e clique no
          link em até 1 hora.
        </p>
        <p className="mt-4 text-xs text-emerald-700">
          Não recebeu? Confira a caixa de spam, ou{' '}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="underline underline-offset-2 hover:text-emerald-900"
          >
            tente outro email
          </button>
          .
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-neutral-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-60"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!emailValid || isPending}
        className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Enviando...' : 'Receber link de redefinição'}
      </button>

      <div className="text-center">
        <Link href="/admin/login" className="text-xs text-neutral-500 underline hover:text-neutral-900">
          Voltar para o login
        </Link>
      </div>
    </form>
  )
}
