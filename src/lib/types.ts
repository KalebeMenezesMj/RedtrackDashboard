// ─── RedTrack API Types ───────────────────────────────────────────────────────

export interface RedTrackSettings {
  [key: string]: unknown
}

export interface RedTrackReportRow {
  // Campos de agrupamento (dependem do group usado)
  campaign_id?: string
  campaign?:    string   // nome da campanha quando group=campaign
  date?:        string   // quando group=date (YYYY-MM-DD)

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
  total_revenue?: number
  roas?:        number

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

export interface ReportFilters {
  dateRange:  DateRange
  campaignId: string
}
