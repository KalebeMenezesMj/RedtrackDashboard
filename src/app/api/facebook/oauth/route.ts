/**
 * GET /api/facebook/oauth
 * Inicia o fluxo OAuth do Facebook — redireciona para a tela de login da Meta.
 * Após o login, o Facebook retorna para /api/facebook/callback.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const SCOPES = 'ads_read'

export async function GET(req: NextRequest) {
  const appId = process.env.FACEBOOK_APP_ID
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  if (!appId) {
    return NextResponse.json(
      { error: 'FACEBOOK_APP_ID não configurado. Adicione ao .env.local.' },
      { status: 500 },
    )
  }

  // Anti-CSRF state token
  const state = crypto.randomBytes(16).toString('hex')
  const redirectUri = `${baseUrl}/api/facebook/callback`

  const oauthUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth')
  oauthUrl.searchParams.set('client_id', appId)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('scope', SCOPES)
  oauthUrl.searchParams.set('state', state)
  oauthUrl.searchParams.set('response_type', 'code')

  // Redirect to the login page — store state in a short-lived cookie for CSRF check
  const res = NextResponse.redirect(oauthUrl.toString())
  res.cookies.set('fb_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 min
    path: '/',
    sameSite: 'lax',
  })

  // Remember where to send the user back after auth
  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/analise-criativos'
  res.cookies.set('fb_return_to', returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
  })

  return res
}
