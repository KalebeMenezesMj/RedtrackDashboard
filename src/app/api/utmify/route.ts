import { NextRequest, NextResponse } from 'next/server'
import { fetchDashboardInfo } from '@/lib/utmify'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const dashboardId = searchParams.get('dashboardId')
    ?? process.env.UTMIFY_DASHBOARD_ID
    ?? ''

  const from = searchParams.get('from') ?? formatDate(subDays(new Date(), 30))
  const to   = searchParams.get('to')   ?? formatDate(new Date())

  if (!dashboardId) {
    return NextResponse.json(
      { ok: false, error: 'dashboardId não informado. Configure UTMIFY_DASHBOARD_ID no .env.local ou passe ?dashboardId=...' },
      { status: 400 },
    )
  }

  if (!process.env.UTMIFY_EMAIL || !process.env.UTMIFY_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: 'UTMIFY_EMAIL e UTMIFY_PASSWORD não configurados no .env.local' },
      { status: 503 },
    )
  }

  try {
    const kpis = await fetchDashboardInfo(dashboardId, from, to)
    return NextResponse.json({ ok: true, kpis, dashboardId, dateRange: { from, to } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[API /utmify]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function subDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() - days)
  return copy
}
