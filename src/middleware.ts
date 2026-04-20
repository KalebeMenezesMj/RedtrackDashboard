/**
 * Middleware Next.js
 * - Protege rotas do dashboard principal → redireciona para /login
 * - Protege /admin/dashboard             → redireciona para /admin
 * - Registra visitas de páginas (fire-and-forget para /api/admin/track)
 */

import { NextRequest, NextResponse } from 'next/server'

// Rotas do dashboard que exigem autenticação
const DASH_PROTECTED = ['/', '/campanhas', '/analise-criativos']

// Prefixos/padrões que NÃO devem ser rastreados
const SKIP_TRACK = [
  /^\/_next\//,
  /^\/api\//,
  /^\/admin/,
  /^\/login/,
  /\.ico$/,
  /\.png$/, /\.jpg$/, /\.jpeg$/, /\.webp$/, /\.svg$/,
  /\.woff2?$/, /\.ttf$/,
  /\.css$/, /\.js$/,
  /^\/favicon/,
  /^\/images\//,
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Proteção do dashboard principal ──────────────────────────────────
  const isDashRoute =
    DASH_PROTECTED.includes(pathname) ||
    pathname.startsWith('/campanhas')  ||
    pathname.startsWith('/analise-criativos')

  if (isDashRoute) {
    const token = request.cookies.get('dash_session')?.value
    if (!token) {
      const url = new URL('/login', request.url)
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
  }

  // Redireciona /login para / se já estiver autenticado
  if (pathname === '/login') {
    const token = request.cookies.get('dash_session')?.value
    if (token) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── 2. Proteção do painel admin ─────────────────────────────────────────
  if (pathname.startsWith('/admin/dashboard')) {
    const token = request.cookies.get('admin_session')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // ── 3. Rastreamento de visitas ──────────────────────────────────────────
  if (!SKIP_TRACK.some(p => p.test(pathname))) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '0.0.0.0'

    const payload = JSON.stringify({
      ip,
      userAgent: request.headers.get('user-agent')       ?? '',
      path:      pathname,
      referrer:  request.headers.get('referer')          ?? '',
      language:  request.headers.get('accept-language')  ?? '',
      timestamp: new Date().toISOString(),
      country:   request.headers.get('x-vercel-ip-country') ||
                 request.headers.get('cf-ipcountry')         ||
                 request.geo?.country || '',
      city:      request.headers.get('x-vercel-ip-city') ||
                 request.geo?.city    || '',
    })

    fetch(new URL('/api/admin/track', request.url).toString(), {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-track-secret': process.env.INTERNAL_TOKEN ?? '',
      },
      body: payload,
    }).catch(() => { /* silencioso */ })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
