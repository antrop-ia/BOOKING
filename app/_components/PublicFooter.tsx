import Link from 'next/link'

/**
 * Footer minimalista fixed no canto inferior. Sempre visivel nas paginas
 * publicas do fluxo de reserva pra cumprir LGPD (links de Privacidade e
 * Termos sempre disponiveis). Sutil pra nao competir com o conteudo principal.
 */
export function PublicFooter() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 12px',
        backgroundColor: 'rgba(10, 9, 6, 0.6)',
        backdropFilter: 'blur(6px)',
        borderRadius: '999px',
        border: '1px solid rgba(255,255,255,0.05)',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '10px',
        color: '#5C5549',
        pointerEvents: 'auto',
      }}
    >
      <Link
        href="/privacidade"
        style={{ color: '#7A6A50', textDecoration: 'none' }}
      >
        Privacidade
      </Link>
      <span style={{ color: '#3A2A18' }}>·</span>
      <Link href="/termos" style={{ color: '#7A6A50', textDecoration: 'none' }}>
        Termos
      </Link>
    </div>
  )
}
