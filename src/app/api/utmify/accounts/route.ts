import { NextRequest, NextResponse } from 'next/server'
import { fetchMetaProfiles, fetchGoogleProfiles } from '@/lib/utmify'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const dashboardId = searchParams.get('dashboardId') ?? process.env.UTMIFY_DASHBOARD_ID ?? ''

  if (!dashboardId) {
    return NextResponse.json({ ok: false, error: 'dashboardId obrigatório' }, { status: 400 })
  }
  if (!process.env.UTMIFY_EMAIL || !process.env.UTMIFY_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Credenciais UTMify não configuradas' }, { status: 503 })
  }

  // Busca perfis Meta e Google em paralelo; não falha se um dos dois não tiver dados
  const [metaResult, googleResult] = await Promise.allSettled([
    fetchMetaProfiles(dashboardId),
    fetchGoogleProfiles(dashboardId),
  ])

  const meta   = metaResult.status   === 'fulfilled' ? metaResult.value   : []
  const google = googleResult.status === 'fulfilled' ? googleResult.value : []

  return NextResponse.json({
    ok:      true,
    profiles: [...meta, ...google],
    meta,
    google,
  })
}
