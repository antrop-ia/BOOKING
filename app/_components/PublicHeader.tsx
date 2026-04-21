import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/server'
import { signOutCliente } from '@/app/entrar/actions'

interface Props {
  /**
   * Se passado, renderiza link "Minhas reservas" pra navegar pra la quando o
   * user esta logado. Default: true. Em /minhas-reservas a gente passa false
   * pra nao listar a propria pagina.
   */
  showMinhasReservas?: boolean
}

/**
 * Header discreto top-right pras telas publicas. Server component que le a
 * sessao do Supabase Auth. Sem JS extra: o "menu" e horizontal, sem dropdown.
 *
 * NAO renderizar em /entrar (voce ja esta logando) nem em /admin (tem shell
 * proprio).
 */
export async function PublicHeader({ showMinhasReservas = true }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div
      style={{
        position: 'fixed',
        top: '14px',
        right: '14px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {user ? (
        <>
          {showMinhasReservas && (
            <Link
              href="/minhas-reservas"
              style={{
                display: 'inline-block',
                padding: '6px 10px',
                backgroundColor: 'rgba(245,192,66,0.12)',
                border: '1px solid rgba(245,192,66,0.35)',
                color: '#F5C042',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderRadius: '4px',
              }}
            >
              Minhas reservas
            </Link>
          )}
          <form action={signOutCliente} style={{ display: 'inline' }}>
            <button
              type="submit"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#7A6A50',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
              title={user.email ?? ''}
            >
              Sair
            </button>
          </form>
        </>
      ) : (
        <Link
          href="/entrar"
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            backgroundColor: 'rgba(245,192,66,0.12)',
            border: '1px solid rgba(245,192,66,0.35)',
            color: '#F5C042',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          Entrar
        </Link>
      )}
    </div>
  )
}
