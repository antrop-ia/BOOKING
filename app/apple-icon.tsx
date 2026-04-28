import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0A0906',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          border: '6px solid #F5C042',
          borderRadius: '40px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            color: '#F5C042',
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '3px',
          }}
        >
          PARRILLA
        </div>
        <div
          style={{
            color: '#F5C042',
            fontSize: '52px',
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
            fontSize: '12px',
            letterSpacing: '4px',
            marginTop: '8px',
          }}
        >
          ★ ★ ★
        </div>
      </div>
    ),
    { ...size }
  )
}
