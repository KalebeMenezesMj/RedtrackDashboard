/**
 * POST /api/facebook/disconnect
 * Remove os cookies de autenticação do Facebook.
 */

import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('fb_access_token')
  res.cookies.delete('fb_user_id')
  res.cookies.delete('fb_user_name')
  return res
}
