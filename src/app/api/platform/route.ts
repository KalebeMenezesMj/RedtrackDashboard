import { NextRequest, NextResponse } from 'next/server'
import { fetchCampaignsByTag, fetchCampaignReport, fetchDailyReport } from '@/lib/redtrack'
import { cache } from '@/lib/reportCache'
import type { DateRange, KPIData, ChartDataPoint, CampaignRow, RedTrackReportRow } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const tag = searchParams.get('tag') ?? ''
  const dateRange: DateRange = {
    from: searchParams.get('from') ?? formatDate(subDays(new Date(), 30)),
    to:   searchParams.get('to')   ?? formatDate(new Date()),
  }

  if (!tag) return NextResponse.json({ ok: false, error: 'tag obrigatória' }, { status: 400 })

  try {
    // ── 1. IDs das campanhas da plataforma (cache 10 min) ─────────────────────
    let platformIds = cache.getPlatformIds(tag)
    if (!platformIds) {
      platformIds = await fetchCampaignsByTag(tag)
      cache.setPlatformIds(tag, platformIds)
    }

    if (!platformIds.length) {
      return NextResponse.json({
        ok: true, kpis: emptyKpis(), chartData: [], campaigns: [], dateRange,
      })
    }

    // ── 2. Relatório por campanha (cache 3 min) ───────────────────────────────
    const campaignCacheKey = `platform:${tag}:campaign:${dateRange.from}:${dateRange.to}`
    let campaignResult = cache.getCampaignReport(campaignCacheKey)

    if (!campaignResult) {
      campaignResult = await fetchCampaignReport(dateRange, platformIds)
      cache.setCampaignReport(campaignCacheKey, campaignResult)
    }

    const { items: campaignRows } = campaignResult

    // ── 3. Relatório diário filtrado pelos IDs da plataforma (cache 5 min) ──────
    const dailyCacheKey = `platform:${tag}:daily:${dateRange.from}:${dateRange.to}`
    let dailyRows: RedTrackReportRow[] = cache.getDailyReport(dailyCacheKey) ?? []

    if (!dailyRows.length) {
      try {
        // Passa todos os IDs da plataforma como filtro — a API aceita lista separada por vírgula
        const idsParam = platformIds.join(',')
        dailyRows = await fetchDailyReport(dateRange, idsParam)
        if (dailyRows.length) cache.setDailyReport(dailyCacheKey, dailyRows)
      } catch {
        dailyRows = cache.getDailyReport(dailyCacheKey, true) ?? []
      }
    }

    // ── KPIs ──────────────────────────────────────────────────────────────────
    // NOTA: r.revenue é sempre 0 na RedTrack — receita real em total_revenue / revenuetype1
    const summed = campaignRows.reduce(
      (acc, r) => {
        const rev = r.total_revenue ?? r.revenuetype1 ?? r.revenue ?? 0
        return {
          cost:              acc.cost              + (r.cost        ?? 0),
          revenue:           acc.revenue           + rev,
          profit:            acc.profit            + (r.profit      ?? (rev - (r.cost ?? 0))),
          conversions:       acc.conversions       + (r.conversions ?? 0),
          clicks:            acc.clicks            + (r.clicks      ?? 0),
          purchases:         acc.purchases         + (r.convtype1   ?? 0),
          initiateCheckouts: acc.initiateCheckouts + (r.convtype2   ?? 0),
        }
      },
      { cost: 0, revenue: 0, profit: 0, conversions: 0, clicks: 0, purchases: 0, initiateCheckouts: 0 },
    )

    const kpis: KPIData = {
      totalSpend:        summed.cost,
      totalRevenue:      summed.revenue,
      totalProfit:       summed.profit,
      roi:               calcROI(summed.revenue, summed.cost),
      conversions:       summed.conversions,
      clicks:            summed.clicks,
      purchases:         summed.purchases,
      initiateCheckouts: summed.initiateCheckouts,
    }

    // ── Chart Data ────────────────────────────────────────────────────────────
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

    // ── Tabela de campanhas ───────────────────────────────────────────────────
    const campaigns: CampaignRow[] = campaignRows.map((row, i) => {
      const rev  = row.total_revenue ?? row.revenuetype1 ?? row.revenue ?? 0
      const cost = row.cost ?? 0
      const conv = row.conversions ?? 0
      return {
        id:                row.campaign_id ?? String(i),
        name:              row.campaign    ?? `Campanha ${i + 1}`,
        clicks:            row.clicks      ?? 0,
        conversions:       conv,
        cost,
        revenue:           rev,
        profit:            row.profit ?? (rev - cost),
        roi:               row.roi    ?? calcROI(rev, cost),
        cpa:               row.cpa    ?? calcCPA(cost, conv),
        cr:                row.cr     ?? calcCR(conv, row.clicks ?? 0),
        purchases:         row.convtype1 ?? 0,
        initiateCheckouts: row.convtype2 ?? 0,
      }
    })

    return NextResponse.json({ ok: true, kpis, chartData, campaigns, dateRange, total: platformIds.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error(`[API /platform?tag=${tag}]`, message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyKpis(): KPIData {
  return { totalSpend: 0, totalRevenue: 0, totalProfit: 0, roi: 0, conversions: 0, clicks: 0, purchases: 0, initiateCheckouts: 0 }
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function subDays(d: Date, days: number): Date {
  const copy = new Date(d); copy.setDate(copy.getDate() - days); return copy
}

function calcROI(revenue: number, cost: number): number {
  return cost ? ((revenue - cost) / cost) * 100 : 0
}

function calcCPA(cost: number, conversions: number): number {
  return conversions ? cost / conversions : 0
}

function calcCR(conversions: number, clicks: number): number {
  return clicks ? (conversions / clicks) * 100 : 0
}
