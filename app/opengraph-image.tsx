import { ImageResponse } from 'next/og'

export const alt = 'Parrilla 8187 — Bar e Churrascaria · Reservas online'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(135deg, #0A0906 0%, #161410 50%, #1F1B14 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '4px solid #F5C042',
            borderRadius: '999px',
            padding: '36px 60px',
            marginBottom: '50px',
          }}
        >
          <div
            style={{
              color: '#F5C042',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '8px',
            }}
          >
            PARRILLA
          </div>
          <div
            style={{
              color: '#F5C042',
              fontSize: '88px',
              fontWeight: 900,
              lineHeight: 1,
              marginTop: '4px',
            }}
          >
            8187
          </div>
          <div
            style={{
              color: '#7A6A50',
              fontSize: '20px',
              letterSpacing: '8px',
              marginTop: '6px',
            }}
          >
            ★ ★ ★
          </div>
        </div>

        <div
          style={{
            color: '#F0E8D8',
            fontSize: '52px',
            fontWeight: 700,
            letterSpacing: '-1px',
            textAlign: 'center',
            marginBottom: '12px',
          }}
        >
          Reserve sua mesa
        </div>

        <div
          style={{
            color: '#9B9385',
            fontSize: '24px',
            textAlign: 'center',
            marginBottom: '40px',
          }}
        >
          Bar e Churrascaria · Boa Viagem, Recife
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'rgba(245,192,66,0.12)',
            border: '2px solid rgba(245,192,66,0.3)',
            padding: '14px 28px',
            borderRadius: '8px',
          }}
        >
          <div style={{ color: '#C45C26', fontSize: '20px' }}>◆</div>
          <div
            style={{
              color: '#F5C042',
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '4px',
            }}
          >
            A MELHOR PICANHA DA CIDADE
          </div>
          <div style={{ color: '#C45C26', fontSize: '20px' }}>◆</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
