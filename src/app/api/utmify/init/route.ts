// GET /api/utmify/init?from=YYYY-MM-DD&to=YYYY-MM-DD&dashboardId=XXX
// Retorna dashboards + KPIs do primeiro dashboard (ou do dashboardId solicitado)
// em uma única requisição, paralelizando o máximo possível no servidor.

import { NextRequest, NextResponse } from 'next/server'
import { fetchDashboards, fetchDashboardInfo } from '@/lib/utmify'

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function subDays(d: Date, n: number): Date {
  const c = new Date(d); c.setDate(c.getDate() - n); return c
}

export async function GET(req: NextRequest) {
  if (!process.env.UTMIFY_EMAIL || !process.env.UTMIFY_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: 'UTMIFY_EMAIL e UTMIFY_PASSWORD não configurados no .env.local' },
      { status: 503 },
    )
  }

  const s    = req.nextUrl.searchParams
  const from = s.get('from') ?? formatDate(subDays(new Date(), 30))
  const to   = s.get('to')   ?? formatDate(new Date())

  try {
    // 1) Busca dashboards (cached 5 min)
    const dashboards = await fetchDashboards()

    if (!dashboards.length) {
      return NextResponse.json({ ok: true, dashboards: [], kpis: null, dashboardId: null })
    }

    // 2) Determina qual dashboard usar
    const requestedId = s.get('dashboardId')
    const dashboard   = requestedId
      ? (dashboards.find(d => d.id === requestedId) ?? dashboards[0])
      : dashboards[0]

    // 3) Busca KPIs em paralelo com dashboards (já temos, então só busca KPIs)
    const kpis = await fetchDashboardInfo(dashboard.id, from, to)

    return NextResponse.json({
      ok:          true,
      dashboards,
      kpis,
      dashboardId: dashboard.id,
      currency:    dashboard.currency ?? 'BRL',
      dateRange:   { from, to },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[API /utmify/init]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
