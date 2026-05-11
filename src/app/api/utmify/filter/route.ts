// GET /api/utmify/filter
// Busca dashboard-info filtrado por plataforma e/ou conta específica
// Parâmetros: dashboardId, from, to, platform, metaAccountId, googleAccountId

import { NextRequest, NextResponse } from 'next/server'
import { fetchDashboardInfoFiltered } from '@/lib/utmify'

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function subDays(d: Date, n: number) {
  const c = new Date(d); c.setDate(c.getDate() - n); return c
}

export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams

  const dashboardId     = s.get('dashboardId')     ?? process.env.UTMIFY_DASHBOARD_ID ?? ''
  const from            = s.get('from')             ?? formatDate(subDays(new Date(), 30))
  const to              = s.get('to')               ?? formatDate(new Date())
  const platform        = s.get('platform')         ?? null   // "Meta" | "Google" | etc.
  const trafficSource   = s.get('trafficSource')    ?? null   // "MetaAds" | "google"
  const metaAccountId   = s.get('metaAccountId')   ?? null
  const googleAccountId = s.get('googleAccountId') ?? null

  if (!dashboardId) {
    return NextResponse.json({ ok: false, error: 'dashboardId obrigatório' }, { status: 400 })
  }
  if (!process.env.UTMIFY_EMAIL || !process.env.UTMIFY_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Credenciais UTMify não configuradas' }, { status: 503 })
  }

  try {
    const kpis = await fetchDashboardInfoFiltered(dashboardId, from, to, {
      platforms:          platform        ? [platform]        : undefined,
      trafficSource:      trafficSource   ?? undefined,
      metaAdAccountIds:   metaAccountId   ? [metaAccountId]   : undefined,
      googleAdAccountIds: googleAccountId ? [googleAccountId] : undefined,
    })

    return NextResponse.json({ ok: true, kpis, dashboardId, dateRange: { from, to } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[API /utmify/filter]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
