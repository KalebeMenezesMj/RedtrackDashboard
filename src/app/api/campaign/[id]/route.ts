import { NextRequest, NextResponse } from 'next/server'
import { fetchDailyReport, fetchAdReport } from '@/lib/redtrack'
import { cache } from '@/lib/reportCache'
import type { DateRange, ChartDataPoint, AdRow } from '@/lib/types'

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

  // ?ads=1 → carrega breakdown de anúncios sob demanda (evita rate limit no load inicial)
  const includeAds = searchParams.get('ads') === '1'

  const dailyCacheKey = `daily:${dateRange.from}:${dateRange.to}:${campaignId}`
  const adsCacheKey   = `ads:${dateRange.from}:${dateRange.to}:${campaignId}`

  try {
    // ── Relatório diário ────────────────────────────────────────────────────
    let dailyRows = cache.getDailyReport(dailyCacheKey)
    if (!dailyRows) {
      dailyRows = await fetchDailyReport(dateRange, campaignId)
      if (dailyRows.length) cache.setDailyReport(dailyCacheKey, dailyRows)
    }

    const chartData: ChartDataPoint[] = dailyRows
      .filter(r => r.date)
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      .map(row => {
        const rev  = row.total_revenue ?? row.revenuetype1 ?? row.revenue ?? 0
        const cost = row.cost ?? 0
        return {
          date:    row.date ?? '',
          spend:   cost,
          revenue: rev,
          profit:  row.profit ?? (rev - cost),
          roi:     row.roi    ?? calcROI(rev, cost),
        }
      })

    // ── Anúncios — somente quando explicitamente solicitado ─────────────────
    if (!includeAds) {
      return NextResponse.json({ ok: true, chartData, ads: null })
    }

    let adRows = cache.getDailyReport(adsCacheKey)
    let adsError: string | null = null

    if (!adRows) {
      try {
        adRows = await fetchAdReport(dateRange, campaignId)
        if (adRows.length) cache.setDailyReport(adsCacheKey, adRows)
      } catch (err) {
        adsError = (err as Error).message ?? 'Erro ao carregar anúncios'
        adRows   = []
        console.warn(`[API /campaign/${campaignId}] ads indisponíveis:`, adsError)
      }
    }

    const ads: AdRow[] = (adRows ?? []).map((row, i) => {
      const rev       = row.total_revenue ?? row.revenuetype1 ?? row.revenue ?? 0
      const cost      = row.cost          ?? 0
      const clicks    = row.clicks        ?? 0
      const checkouts = row.convtype2     ?? 0
      const purchases = row.convtype1     ?? 0
      const conv      = row.conversions   ?? 0
      // group=rt_ad  → row.rt_ad = nome real ("CP04 - [FB] [HA]"), row.rt_ad_id = ID interno RT
      // group=sub2   → row.sub2 = Ad ID da plataforma (Facebook etc.) como fallback
      return {
        id:                row.rt_ad_id ?? row.sub2 ?? row.ad_id ?? String(i),
        name:              row.rt_ad    ?? row.sub2 ?? row.ad    ?? `Anúncio ${i + 1}`,
        clicks,
        impressions:       row.impressions ?? 0,
        cost,
        revenue:           rev,
        profit:            row.profit  ?? (rev - cost),
        roi:               row.roi     ?? calcROI(rev, cost),
        ctr:               row.ctr     ?? calcPct(clicks,    row.impressions ?? 0),
        cr:                row.cr      ?? calcPct(conv,       clicks),
        cpc:               row.cpc     ?? (clicks > 0 ? cost / clicks : 0),
        cpa:               row.cpa     ?? (conv   > 0 ? cost / conv   : 0),
        conversions:       conv,
        purchases,
        initiateCheckouts: checkouts,
        purchaseRate:      calcPct(purchases, checkouts),
        checkoutRate:      calcPct(checkouts, clicks),
      }
    })

    ads.sort((a, b) => b.cost - a.cost)

    return NextResponse.json({ ok: true, chartData, ads, adsError })
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
function calcPct(a: number, b: number) {
  return b > 0 ? (a / b) * 100 : 0
}
