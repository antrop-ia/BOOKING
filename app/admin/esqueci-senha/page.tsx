import { EsqueciSenhaForm } from './EsqueciSenhaForm'

export const metadata = {
  title: 'Esqueci minha senha',
  description: 'Receba um link para redefinir sua senha de admin.',
}

export const dynamic = 'force-dynamic'

export default function EsqueciSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Esqueci minha senha</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Informe o email da sua conta admin. Vamos enviar um link para você
            criar uma senha nova.
          </p>
        </div>

        <EsqueciSenhaForm />
      </div>
    </div>
  )
}
