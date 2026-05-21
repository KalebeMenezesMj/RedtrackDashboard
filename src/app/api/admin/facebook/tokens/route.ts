/**
 * GET  /api/admin/facebook/tokens  — list all saved tokens (admin only)
 * POST /api/admin/facebook/tokens  — add a new token (validates with FB API)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { createToken, listTokens } from '@/lib/facebook-db'

const FB_GRAPH = 'https://graph.facebook.com/v20.0'

function unauthorized() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!await validateSession(token)) return unauthorized()

  try {
    const tokens = await listTokens()
    // Mask token for display: show first 8 + last 4 chars
    const masked = tokens.map(t => ({
      ...t,
      token: t.token.slice(0, 8) + '…' + t.token.slice(-4),
    }))
    return NextResponse.json({ tokens: masked })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!await validateSession(token)) return unauthorized()

  try {
    const { label, token } = await req.json() as { label: string; token: string }
    if (!label?.trim() || !token?.trim()) {
      return NextResponse.json({ error: 'label e token são obrigatórios' }, { status: 400 })
    }

    // Validate token with Facebook API
    const fbRes  = await fetch(`${FB_GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(token.trim())}`, { cache: 'no-store' })
    const fbJson = await fbRes.json()
    if (fbJson.error) {
      return NextResponse.json({ error: `Token inválido: ${fbJson.error.message}` }, { status: 400 })
    }

    const row = await createToken(label.trim(), token.trim(), fbJson.name)
    return NextResponse.json({
      token: { ...row, token: row.token.slice(0, 8) + '…' + row.token.slice(-4) },
      fb_user_name: fbJson.name,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
