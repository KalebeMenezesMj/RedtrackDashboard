/**
 * POST /api/admin/auth  → login do painel admin
 * DELETE /api/admin/auth → logout do painel admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSession, safeEqual } from '@/lib/session'

const COOKIE  = 'admin_session'
const IS_PROD = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json() as {
      username?: string
      password?: string
    }

    const envUser = process.env.ADMIN_USERNAME ?? ''
    const envPass = process.env.ADMIN_PASSWORD ?? ''

    const ok = envUser.length > 0 && envPass.length > 0
      && safeEqual(username ?? '', envUser)
      && safeEqual(password ?? '', envPass)

    if (!ok) {
      await new Promise(r => setTimeout(r, 800))
      return NextResponse.json({ ok: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }

    const token = await createSession()

    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path:     '/',
      maxAge:   8 * 60 * 60,
      secure:   IS_PROD,
    })
    return res
  } catch {
    return NextResponse.json({ ok: false, error: 'Erro interno.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
