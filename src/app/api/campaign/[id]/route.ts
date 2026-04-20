import { NextRequest, NextResponse } from 'next/server'
import { fetchDailyReport } from '@/lib/redtrack'
import { cache } from '@/lib/reportCache'
import type { DateRange, ChartDataPoint } from '@/lib/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { searchParams } = req.nextUrl
  const { id: campaignId } = await params

  const dateRange: DateRange = {
    from: searchParams.get('from') ?? formatDate(subDays(new Date(), 30)),
    to:   searchParams.get('to')   ?? formatDate(new Date()),
  }

  const cacheKey = `daily:${dateRange.from}:${dateRange.to}:${campaignId}`

  try {
    let dailyRows = cache.getDailyReport(cacheKey)

    if (!dailyRows) {
      dailyRows = await fetchDailyReport(dateRange, campaignId)
      if (dailyRows.length) cache.setDailyReport(cacheKey, dailyRows)
    }

    const chartData: ChartDataPoint[] = dailyRows
      .filter(r => r.date)
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      .map(row => ({
        date:    row.date    ?? '',
        spend:   row.cost    ?? 0,
        revenue: row.revenue ?? 0,
        profit:  row.profit  ?? ((row.revenue ?? 0) - (row.cost ?? 0)),
        roi:     row.roi     ?? calcROI(row.revenue ?? 0, row.cost ?? 0),
      }))

    return NextResponse.json({ ok: true, chartData })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error(`[API /campaign/${campaignId}]`, message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function subDays(d: Date, n: number) {
  const c = new Date(d); c.setDate(c.getDate() - n); return c
}
function calcROI(revenue: number, cost: number) {
  return cost ? ((revenue - cost) / cost) * 100 : 0
}
