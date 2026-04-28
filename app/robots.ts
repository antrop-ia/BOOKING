import type { MetadataRoute } from 'next'

const BASE_URL = 'https://reservas.parilla8187.antrop-ia.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/reservar', '/reservar/consultar', '/privacidade', '/termos'],
        disallow: [
          '/admin/',
          '/api/',
          '/minhas-reservas',
          '/entrar',
          '/reservar/consultar/', // codigos individuais nao indexados
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
