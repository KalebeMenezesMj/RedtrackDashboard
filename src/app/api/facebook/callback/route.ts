/**
 * GET /api/facebook/callback
 * Callback OAuth do Facebook.
 * 1. Valida state (CSRF)
 * 2. Troca o code por um short-lived token
 * 3. Estende para long-lived token (60 dias)
 * 4. Busca nome do usuário via /me
 * 5. Salva tokens em cookies httpOnly
 * 6. Redireciona de volta para a página de origem
 */

import { NextRequest, NextResponse } from 'next/server'

const FB_API = 'https://graph.facebook.com/v20.0'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appId     = process.env.FACEBOOK_APP_ID     ?? ''
  const appSecret = process.env.FACEBOOK_APP_SECRET ?? ''
  const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const returnTo  = req.cookies.get('fb_return_to')?.value ?? '/analise-criativos'
  const savedState = req.cookies.get('fb_oauth_state')?.value

  // Helper: redirect back to page with error message in query string
  const fail = (msg: string) => {
    const url = new URL(returnTo, baseUrl)
    url.searchParams.set('fb_error', msg)
    return NextResponse.redirect(url.toString())
  }

  // User denied or Facebook returned an error
  if (error) return fail(`Facebook recusou a autenticação: ${error}`)
  if (!code)  return fail('Código de autorização ausente.')

  // CSRF check
  if (!savedState || savedState !== state) return fail('Estado OAuth inválido. Tente novamente.')

  const redirectUri = `${baseUrl}/api/facebook/callback`

  try {
    // ── Step 1: Exchange code for short-lived access token ──────────────
    const tokenRes = await fetch(
      `${FB_API}/oauth/access_token` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${appSecret}` +
      `&code=${code}`,
      { cache: 'no-store' },
    )
    const tokenJson = await tokenRes.json()
    if (tokenJson.error) throw new Error(tokenJson.error.message)
    const shortToken: string = tokenJson.access_token

    // ── Step 2: Extend to long-lived token (60 days) ────────────────────
    const extendRes = await fetch(
      `${FB_API}/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&fb_exchange_token=${shortToken}`,
      { cache: 'no-store' },
    )
    const extendJson = await extendRes.json()
    const longToken: string = extendJson.access_token ?? shortToken
    const expiresIn: number = extendJson.expires_in ?? 5184000 // 60 days fallback

    // ── Step 3: Fetch user profile ───────────────────────────────────────
    const meRes = await fetch(
      `${FB_API}/me?fields=id,name&access_token=${encodeURIComponent(longToken)}`,
      { cache: 'no-store' },
    )
    const meJson = await meRes.json()
    const userName: string  = meJson.name ?? 'Usuário'
    const userId:   string  = meJson.id   ?? ''

    // ── Step 4: Set cookies and redirect ────────────────────────────────
    const maxAge = Math.min(expiresIn, 5184000) // cap at 60 days
    const dest = new URL(returnTo, baseUrl)
    dest.searchParams.set('fb_connected', '1')

    const res = NextResponse.redirect(dest.toString())

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge,
      path: '/',
      sameSite: 'lax' as const,
    }

    res.cookies.set('fb_access_token', longToken, cookieOpts)
    res.cookies.set('fb_user_id',   userId,   cookieOpts)
    // name is NOT httpOnly so client JS can read it for display
    res.cookies.set('fb_user_name', userName, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge,
      path: '/',
      sameSite: 'lax',
    })

    // Clear temp cookies
    res.cookies.delete('fb_oauth_state')
    res.cookies.delete('fb_return_to')

    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[facebook/callback]', msg)
    return fail(msg)
  }
}
