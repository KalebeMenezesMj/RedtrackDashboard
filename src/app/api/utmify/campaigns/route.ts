// GET /api/utmify/campaigns
// Retorna campanhas Meta e/ou Google usando os endpoints /orders/search-objects
// Parâmetros: dashboardId, from, to, platform (meta|google|both), level, status, nameContains

import { NextRequest, NextResponse } from 'next/server'
import { fetchMetaCampaigns, fetchGoogleCampaigns } from '@/lib/utmify'

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function subDays(d: Date, n: number) {
  const c = new Date(d); c.setDate(c.getDate() - n); return c
}

export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams

  const dashboardId  = s.get('dashboardId')  ?? process.env.UTMIFY_DASHBOARD_ID ?? ''
  const from         = s.get('from')         ?? formatDate(subDays(new Date(), 30))
  const to           = s.get('to')           ?? formatDate(new Date())
  const platform     = s.get('platform')     ?? 'both'   // 'meta' | 'google' | 'both'
  const level        = s.get('level')        ?? 'campaign'
  const status       = s.get('status')       ?? null
  const nameContains = s.get('nameContains') ?? null

  if (!dashboardId) {
    return NextResponse.json({ ok: false, error: 'dashboardId obrigatório' }, { status: 400 })
  }
  if (!process.env.UTMIFY_EMAIL || !process.env.UTMIFY_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Credenciais UTMify não configuradas' }, { status: 503 })
  }

  const opts = { level: level as 'campaign' | 'account' | 'adGroup' | 'ad', status, nameContains }

  try {
    const [metaResult, googleResult] = await Promise.allSettled([
      platform !== 'google' ? fetchMetaCampaigns(dashboardId, from, to, opts)   : Promise.resolve([]),
      platform !== 'meta'   ? fetchGoogleCampaigns(dashboardId, from, to, opts) : Promise.resolve([]),
    ])

    const meta   = metaResult.status   === 'fulfilled' ? metaResult.value   : []
    const google = googleResult.status === 'fulfilled' ? googleResult.value : []

    const metaError   = metaResult.status   === 'rejected' ? String(metaResult.reason)   : null
    const googleError = googleResult.status === 'rejected' ? String(googleResult.reason) : null

    // Ordena por gasto decrescente
    const all = [...meta, ...google].sort((a, b) => b.spend - a.spend)

    return NextResponse.json({
      ok: true,
      campaigns: all,
      meta,
      google,
      errors: { meta: metaError, google: googleError },
      dateRange: { from, to },
      dashboardId,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[API /utmify/campaigns]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
