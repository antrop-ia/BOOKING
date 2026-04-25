import Link from 'next/link'
import { signIn } from './actions'

type PageProps = {
  searchParams: Promise<{ error?: string; success?: string }>
}

const SUCCESS_MESSAGES: Record<string, string> = {
  senha_redefinida: 'Senha redefinida. Faça login com a nova senha.',
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { error, success } = await searchParams
  const successMessage = success ? SUCCESS_MESSAGES[success] : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Entre com sua conta para gerenciar as reservas
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {successMessage}
          </div>
        )}

        <form action={signIn} className="space-y-4">
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
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-neutral-700">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Entrar
          </button>

          {error && (
            <p className="pt-2 text-center text-sm text-red-600">{error}</p>
          )}
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/admin/esqueci-senha"
            className="text-xs text-neutral-500 underline hover:text-neutral-900"
          >
            Esqueci minha senha
          </Link>
        </div>
      </div>
    </div>
  )
}
