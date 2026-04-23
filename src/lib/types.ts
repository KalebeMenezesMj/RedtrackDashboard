// ─── RedTrack API Types ───────────────────────────────────────────────────────

export interface RedTrackSettings {
  [key: string]: unknown
}

export interface RedTrackReportRow {
  // Campos de agrupamento (dependem do group usado)
  campaign_id?: string
  campaign?:    string   // nome da campanha quando group=campaign
  date?:        string   // quando group=date (YYYY-MM-DD)
  ad_id?:       string   // quando group=ad (rate-limited)
  ad?:          string   // nome do anúncio quando group=ad
  // sub params — sub2 = ad_id da plataforma (Facebook Ad ID etc.)
  sub1?:        string
  sub2?:        string
  sub3?:        string

  // RT params — campos nativos do RedTrack (disponíveis nos logs e em group=rt_*)
  rt_campaign?:    string   // nome da campanha RT (ex: "CP04 - [FB] [HA] [BM7/CA5]")
  rt_campaign_id?: string
  rt_adgroup?:     string   // nome do adgroup RT
  rt_adgroup_id?:  string
  rt_ad?:          string   // nome do anúncio RT — group=rt_ad retorna este campo
  rt_ad_id?:       string   // ID interno do anúncio RT

  // Métricas principais
  clicks:       number
  conversions:  number
  cost:         number
  revenue:      number
  profit:       number
  roi:          number
  ctr?:         number
  cr?:          number
  cpc?:         number
  cpa?:         number
  epc?:         number
  lp_views?:    number
  lp_clicks?:   number
  impressions?: number
  total_revenue?:  number
  revenuetype1?:   number   // receita de convtype1 (Purchase)
  revenuetype2?:   number   // receita de convtype2 (InitiateCheckout)
  roas?:           number

  // Tipos de conversão (convtype1 = Purchase, convtype2 = InitiateCheckout)
  convtype1?:   number
  convtype2?:   number
}

// Com total=true → {items: [...], total: {...}}
// Sem total     → array simples
export interface RedTrackReportWithTotal {
  items: RedTrackReportRow[]
  total: RedTrackReportRow
}

export type RedTrackReportResponse = RedTrackReportRow[]

// ─── Tipos internos ───────────────────────────────────────────────────────────

export interface DateRange {
  from: string   // YYYY-MM-DD
  to:   string   // YYYY-MM-DD
}

export interface KPIData {
  totalSpend:        number
  totalRevenue:      number
  totalProfit:       number
  roi:               number
  conversions:       number
  clicks:            number
  purchases:         number
  initiateCheckouts: number
}

export interface ChartDataPoint {
  date:     string
  spend:    number
  revenue:  number
  profit:   number
  roi:      number
}

export interface CampaignRow {
  id:                string
  name:              string
  clicks:            number
  conversions:       number
  cost:              number
  revenue:           number
  profit:            number
  roi:               number
  cpa:               number
  cr:                number
  purchases:         number
  initiateCheckouts: number
}

export type SortField = keyof CampaignRow
export type SortDir   = 'asc' | 'desc'

// ─── Ad-level breakdown (dentro de uma campanha) ──────────────────────────────

export interface AdRow {
  id:                string
  name:              string
  clicks:            number
  impressions:       number
  cost:              number
  revenue:           number
  profit:            number
  roi:               number
  ctr:               number   // click-through rate %
  cr:                number   // conversion rate %
  cpc:               number   // custo por clique
  cpa:               number   // custo por aquisição
  conversions:       number
  purchases:         number   // convtype1
  initiateCheckouts: number   // convtype2
  purchaseRate:      number   // compras / checkouts %
  checkoutRate:      number   // checkouts / cliques %
}

export interface ReportFilters {
  dateRange:  DateRange
  campaignId: string
}
