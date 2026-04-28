import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Parrilla 8187 — Reservas',
    short_name: 'Parrilla 8187',
    description:
      'Reserve sua mesa na Parrilla 8187, bar e churrascaria em Boa Viagem, Recife.',
    start_url: '/reservar',
    display: 'standalone',
    background_color: '#0A0906',
    theme_color: '#F5C042',
    lang: 'pt-BR',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/apple-icon.svg',
        sizes: '180x180',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    categories: ['food', 'lifestyle'],
  }
}
