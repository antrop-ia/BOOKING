import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { publicUrl } from '@/app/lib/public-url'

const BETO_COOKIE = 'beto_session'
const BETO_MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

/**
 * Middleware centraliza 4 responsabilidades:
 *   1. /reservar + /api/beto/* — garante o cookie beto_session (sem forcar
 *      a pagina a ser dinamica).
 *   2. /admin/* — exige sessao Supabase Auth valida, redirect para
 *      /admin/login quando nao houver.
 *   3. /minhas-reservas/* — exige sessao do cliente final (Sprint 8),
 *      redirect para /entrar quando nao houver.
 *   4. /api/reservar/slots — Sprint 4 (D.2): seta Cache-Control de 60s.
 *      Necessario aqui pq Next 16 descarta Cache-Control setado dentro do
 *      route handler em rotas dynamic-by-default.
 */

const SLOTS_CACHE_CONTROL =
  'public, max-age=60, s-maxage=60, stale-while-revalidate=30'

function ensureBetoCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (request.cookies.has(BETO_COOKIE)) return response
  response.cookies.set(BETO_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: BETO_MAX_AGE,
  })
  return response
}

function buildSupabaseClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Beto / reservar — so setar cookie
  if (
    pathname === '/reservar' ||
    pathname.startsWith('/reservar/') ||
    pathname.startsWith('/api/beto/')
  ) {
    return ensureBetoCookie(request, NextResponse.next({ request }))
  }

  // Sprint 4 (D.2): cache HTTP de 60s na API publica de slots.
  if (pathname === '/api/reservar/slots') {
    const response = NextResponse.next({ request })
    response.headers.set('Cache-Control', SLOTS_CACHE_CONTROL)
    return response
  }

  // Rotas publicas do admin (login + reset de senha — Sprint 5.C)
  if (
    pathname === '/admin/login' ||
    pathname === '/admin/esqueci-senha' ||
    pathname === '/admin/redefinir-senha'
  ) {
    return NextResponse.next()
  }

  // Cliente final: proteger /minhas-reservas/*
  if (pathname === '/minhas-reservas' || pathname.startsWith('/minhas-reservas/')) {
    let response = NextResponse.next({ request })
    const supabase = buildSupabaseClient(request, response)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const redirectUrl = publicUrl('/entrar', request.headers)
      // Preserva a rota original pra voltar apos o login
      redirectUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
      return NextResponse.redirect(redirectUrl)
    }

    return response
  }

  // Resto de /admin exige auth via membership (ja validado no layout via resolveAdminTenantContext)
  let response = NextResponse.next({ request })
  const supabase = buildSupabaseClient(request, response)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const redirectUrl = publicUrl('/admin/login', request.headers)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/reservar',
    '/reservar/:path*',
    '/api/beto/:path*',
    '/api/reservar/slots',
    '/admin/:path*',
    '/minhas-reservas',
    '/minhas-reservas/:path*',
  ],
}
