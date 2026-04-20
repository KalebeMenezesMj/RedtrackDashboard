import { NextRequest, NextResponse } from 'next/server'
import { fetchActiveCampaignIds, fetchCampaignReport, fetchDailyReport } from '@/lib/redtrack'
import { cache } from '@/lib/reportCache'
import type { DateRange, KPIData, ChartDataPoint, CampaignRow, RedTrackReportRow } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const dateRange: DateRange = {
    from: searchParams.get('from') ?? formatDate(subDays(new Date(), 30)),
    to:   searchParams.get('to')   ?? formatDate(new Date()),
  }
  const campaignId = searchParams.get('campaign_id') ?? undefined

  try {
    // ── 1. IDs de campanhas ativas (cache 10 min) ─────────────────────────────
    let activeCampaignIds = cache.getCampaignIds()
    if (!activeCampaignIds) {
      activeCampaignIds = await fetchActiveCampaignIds()
      cache.setCampaignIds(activeCampaignIds)
    }

    // ── 2. Relatório por campanha (cache 3 min) ───────────────────────────────
    const campaignCacheKey = `campaign:${dateRange.from}:${dateRange.to}`
    let campaignResult = cache.getCampaignReport(campaignCacheKey)

    if (!campaignResult) {
      campaignResult = await fetchCampaignReport(dateRange, activeCampaignIds)
      cache.setCampaignReport(campaignCacheKey, campaignResult)
    }

    const { items: campaignRows, total: totalRow } = campaignResult

    // ── 3. Relatório diário (cache 5 min — usa stale se 429) ─────────────────
    const cacheKey = `daily:${dateRange.from}:${dateRange.to}:${campaignId ?? ''}`
    let dailyRows: RedTrackReportRow[] = cache.getDailyReport(cacheKey) ?? []

    if (!dailyRows.length) {
      try {
        dailyRows = await fetchDailyReport(dateRange, campaignId)
        if (dailyRows.length) cache.setDailyReport(cacheKey, dailyRows)
      } catch (err) {
        // Rate limited — usa cache expirado se houver (melhor que vazio)
        dailyRows = cache.getDailyReport(cacheKey, true) ?? []
        if (!dailyRows.length)
          console.warn('[API /report] relatório diário indisponível:', (err as Error).message)
      }
    }

    // ── KPIs — calculados somando os items (campanhas ativas) ─────────────────
    // Não usamos o `total` da API pois ele pode incluir campanhas inativas
    const summed = campaignRows.reduce(
      (acc, r) => ({
        cost:              acc.cost              + (r.cost        ?? 0),
        revenue:           acc.revenue           + (r.revenue     ?? 0),
        profit:            acc.profit            + (r.profit      ?? ((r.revenue ?? 0) - (r.cost ?? 0))),
        conversions:       acc.conversions       + (r.conversions ?? 0),
        clicks:            acc.clicks            + (r.clicks      ?? 0),
        purchases:         acc.purchases         + (r.convtype1   ?? 0),
        initiateCheckouts: acc.initiateCheckouts + (r.convtype2   ?? 0),
      }),
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
      .map(row => ({
        date:    row.date    ?? '',
        spend:   row.cost    ?? 0,
        revenue: row.revenue ?? 0,
        profit:  row.profit  ?? ((row.revenue ?? 0) - (row.cost ?? 0)),
        roi:     row.roi     ?? calcROI(row.revenue ?? 0, row.cost ?? 0),
      }))

    // ── Tabela ────────────────────────────────────────────────────────────────
    const campaigns: CampaignRow[] = campaignRows.map((row, i) => ({
      id:                row.campaign_id ?? String(i),
      name:              row.campaign    ?? `Campanha ${i + 1}`,
      clicks:            row.clicks      ?? 0,
      conversions:       row.conversions ?? 0,
      cost:              row.cost        ?? 0,
      revenue:           row.revenue     ?? 0,
      profit:            row.profit      ?? ((row.revenue ?? 0) - (row.cost ?? 0)),
      roi:               row.roi         ?? calcROI(row.revenue ?? 0, row.cost ?? 0),
      cpa:               row.cpa         ?? calcCPA(row.cost ?? 0, row.conversions ?? 0),
      cr:                row.cr          ?? calcCR(row.conversions ?? 0, row.clicks ?? 0),
      purchases:         row.convtype1   ?? 0,
      initiateCheckouts: row.convtype2   ?? 0,
    }))

    return NextResponse.json({ ok: true, kpis, chartData, campaigns, dateRange })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[API /report]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
