import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { LoginForm } from './LoginForm'

export const metadata = {
  title: 'Entrar',
  description: 'Acesse suas reservas da Parrilla 8187.',
}

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    redirect?: string
    email?: string
    resgatar?: string
  }>
}

export default async function EntrarPage({ searchParams }: PageProps) {
  const params = await searchParams

  // Se ja estiver logado, nao faz sentido ficar na tela de login
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(params.redirect ?? '/minhas-reservas')
  }

  return (
    <div
      className="min-h-screen max-w-[375px] mx-auto flex flex-col"
      style={{ backgroundColor: '#0A0906' }}
    >
      <div style={{ flex: 1, padding: '40px 22px' }}>
        {/* Logo / marca */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#0A0906',
              border: '2px solid #F5C042',
              margin: '0 auto 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '8px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: '#F5C042',
                }}
              >
                PARRILLA
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#F5C042',
                }}
              >
                8187
              </div>
            </div>
          </div>

          <div
            style={{
              color: '#F0E8D8',
              fontSize: '22px',
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: '6px',
            }}
          >
            Entre na sua conta
          </div>
          <div
            style={{
              color: '#7A6A50',
              fontSize: '13px',
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.5,
            }}
          >
            Envia um link mágico no seu e-mail. Sem senha pra decorar.
          </div>
        </div>

        <LoginForm
          initialEmail={params.email ?? ''}
          redirectTo={params.redirect}
          resgatar={params.resgatar}
        />

        <div
          style={{
            marginTop: '30px',
            textAlign: 'center',
          }}
        >
          <a
            href="/reservar"
            style={{
              color: '#7A6A50',
              fontSize: '12px',
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            ← Voltar para reservar
          </a>
        </div>
      </div>
    </div>
  )
}
