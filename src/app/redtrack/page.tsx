'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, TrendingUp, Activity, MousePointerClick,
  RefreshCw, AlertCircle, BarChart3, ShoppingCart, CreditCard,
  Layers, Menu, LineChart as LineIcon, Repeat2, Target,
  Download, Loader2, X, ChevronRight, Megaphone,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import Sidebar         from '@/components/Sidebar'
import DateRangePicker from '@/components/DateRangePicker'
import StatusBadge     from '@/components/StatusBadge'
import { formatCurrency, formatNumber, formatROI, roiBgColor } from '@/lib/format'
import { exportRedTrackCampaigns, exportRedTrackAds }           from '@/lib/exportRedTrackExcel'
import type { DateRange, KPIData, ChartDataPoint, CampaignRow, AdRow } from '@/lib/types'

/* RedTrack envia valores em USD */
const fmtUSD = (v: number) => formatCurrency(v, 'USD')

/* ─── Date helpers ───────────────────────────────────────────────────────── */
function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function today()            { return localDate() }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return localDate(d) }

/* ─── Section heading ────────────────────────────────────────────────────── */
function SectionHeading({ icon: Icon, title, badge }: {
  icon: React.ElementType; title: string; badge?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-6 h-6 rounded-lg bg-surface-raised border border-surface-muted flex items-center justify-center shrink-0">
        <Icon size={12} className="text-slate-400" strokeWidth={2.5} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <div className="flex-1 h-px bg-surface-border" />
      {badge}
    </div>
  )
}

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
const COLORS = {
  blue:   { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-300',    icon: 'text-blue-400'    },
  emerald:{ bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-300', icon: 'text-emerald-400' },
  violet: { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  text: 'text-violet-300',  icon: 'text-violet-400'  },
  amber:  { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-300',   icon: 'text-amber-400'   },
  rose:   { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'text-rose-300',    icon: 'text-rose-400'    },
  cyan:   { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-300',    icon: 'text-cyan-400'    },
}
type ColorKey = keyof typeof COLORS

function KCard({ icon: Icon, title, value, sub, color = 'blue', loading = false }: {
  icon: React.ElementType; title: string; value: string; sub?: string
  color?: ColorKey; loading?: boolean
}) {
  const c = COLORS[color]
  return (
    <div className="card p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.10em] text-slate-500 truncate">{title}</span>
        <div className={`w-7 h-7 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
          <Icon size={13} className={c.icon} strokeWidth={2.5} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-28 rounded-lg bg-surface-raised animate-pulse" />
      ) : (
        <span className={`text-[1.35rem] sm:text-[1.55rem] font-bold leading-none tabular-nums ${c.text}`}>
          {value}
        </span>
      )}
      {sub && !loading && (
        <span className="text-[11px] text-slate-600 font-medium">{sub}</span>
      )}
    </div>
  )
}

/* ─── Custom recharts tooltip ────────────────────────────────────────────── */
function ChartTip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl px-3.5 py-2.5 shadow-xl text-xs space-y-1">
      <p className="text-slate-400 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold tabular-nums">
          {p.name}: {fmtUSD(p.value)}
        </p>
      ))}
    </div>
  )
}

function ROITip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl px-3.5 py-2.5 shadow-xl text-xs space-y-1">
      <p className="text-slate-400 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold tabular-nums">
          {p.name === 'ROI' ? `ROI: ${p.value.toFixed(2)}%` : `Lucro: ${fmtUSD(p.value)}`}
        </p>
      ))}
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function RedTrackPage() {
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [dateRange,    setDateRange]    = useState<DateRange>({ from: daysAgo(30), to: today() })
  const [kpis,         setKpis]         = useState<KPIData | null>(null)
  const [chartData,    setChartData]    = useState<ChartDataPoint[]>([])
  const [campaigns,    setCampaigns]    = useState<CampaignRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [chartError,   setChartError]   = useState<string | null>(null)
  const [apiStatus,    setApiStatus]    = useState<'connected'|'error'|'loading'>('loading')
  const [lastUpdate,   setLastUpdate]   = useState('')

  // Painel de anúncios de uma campanha
  const [selCampaign,    setSelCampaign]    = useState<CampaignRow | null>(null)
  const [ads,            setAds]            = useState<AdRow[]>([])
  const [adsLoading,     setAdsLoading]     = useState(false)
  const [adsError,       setAdsError]       = useState<string | null>(null)
  const [isExportingCamp, setIsExportingCamp] = useState(false)
  const [isExportingAds,  setIsExportingAds]  = useState(false)

  const fetchData = useCallback(async (range: DateRange) => {
    setLoading(true); setError(null); setChartError(null); setApiStatus('loading')
    try {
      const p   = new URLSearchParams({ from: range.from, to: range.to })
      const res = await fetch(`/api/report?${p}`)
      const j   = await res.json()
      if (!j.ok) throw new Error(j.error ?? 'Falha na requisição')
      setKpis(j.kpis)
      if (j.chartData?.length)    setChartData(j.chartData)
      if (j.campaigns?.length)    setCampaigns(j.campaigns)
      if (j.chartError)           setChartError(j.chartError)
      setApiStatus('connected')
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setApiStatus('error')
    } finally { setLoading(false) }
  }, [])

  const retryCharts = useCallback(async (range: DateRange) => {
    setChartLoading(true); setChartError(null)
    try {
      const p   = new URLSearchParams({ from: range.from, to: range.to, charts_only: '1' })
      const res = await fetch(`/api/report?${p}`)
      const j   = await res.json()
      if (!j.ok) throw new Error(j.error ?? 'Falha')
      if (j.chartData?.length) setChartData(j.chartData)
      if (j.chartError)        setChartError(j.chartError)
    } catch (e: unknown) {
      setChartError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally { setChartLoading(false) }
  }, [])

  const fetchAds = useCallback(async (campaign: CampaignRow, range: DateRange) => {
    setSelCampaign(campaign); setAds([]); setAdsError(null); setAdsLoading(true)
    try {
      const p   = new URLSearchParams({ from: range.from, to: range.to, ads: '1' })
      const res = await fetch(`/api/campaign/${encodeURIComponent(campaign.id)}?${p}`)
      const j   = await res.json()
      if (!j.ok) throw new Error(j.error ?? 'Falha')
      setAds(j.ads ?? [])
      if (j.adsError) setAdsError(j.adsError)
    } catch (e: unknown) {
      setAdsError(e instanceof Error ? e.message : 'Erro ao carregar anúncios')
    } finally { setAdsLoading(false) }
  }, [])

  useEffect(() => { fetchData(dateRange) }, [fetchData, dateRange])

  /* ── Computed ─────────────────────────────────────────────────────────────── */
  const profit   = kpis?.totalProfit ?? 0
  const roi      = kpis?.roi ?? 0
  const isProfit = profit >= 0

  const clicks    = kpis?.clicks            ?? 0
  const checkouts = kpis?.initiateCheckouts ?? 0
  const purchases = kpis?.purchases         ?? 0

  const checkoutRate = clicks    > 0 ? (checkouts / clicks)    * 100 : 0
  const purchaseRate = checkouts > 0 ? (purchases / checkouts) * 100 : 0
  const overallCR    = clicks    > 0 ? (purchases / clicks)    * 100 : 0

  function fmtPct(v: number) {
    return v === 0 ? '—'
      : `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  }

  // top 5 campanhas por lucro
  const topCampaigns = [...campaigns].sort((a, b) => b.profit - a.profit).slice(0, 8)

  // chart data — formata datas curtas
  const chartFormatted = chartData.map(d => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }))

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto">

        {/* Header */}
        <header className="sticky top-0 z-40 bg-surface-card/95 border-b border-surface-border backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3.5 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden btn-icon !w-9 !h-9 shrink-0" aria-label="Abrir menu">
                <Menu size={16} />
              </button>
              <div className="hidden md:flex w-8 h-8 rounded-xl bg-blue-600 items-center justify-center shrink-0">
                <BarChart3 size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-[15px] font-bold text-slate-100 tracking-tight leading-none">RedTrack</h1>
                  <StatusBadge status={apiStatus} />
                </div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium leading-none">
                  {lastUpdate ? `Atualizado às ${lastUpdate}` : 'Dados de campanhas e conversões'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              <button onClick={() => fetchData(dateRange)} disabled={loading}
                className="btn-icon !w-9 !h-9" title="Atualizar">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-5 sm:p-6 space-y-8 max-w-screen-2xl mx-auto animate-fade-in-up">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl border text-sm animate-fade-in-up"
              style={{ background:'rgba(244,63,94,0.08)', borderColor:'rgba(244,63,94,0.22)', color:'#fda4af' }}>
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-rose-300">Falha ao carregar dados RedTrack</p>
                <p className="text-xs text-rose-400/70 mt-0.5 break-words">{error}</p>
              </div>
              <button onClick={() => fetchData(dateRange)} className="btn-secondary !py-1.5 !px-3 text-[11px] shrink-0">
                Tentar novamente
              </button>
            </div>
          )}

          {/* ── 1. Financeiro ────────────────────────────────────────────────── */}
          <section>
            <SectionHeading icon={DollarSign} title="Financeiro" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 stagger">
              <KCard icon={DollarSign} title="Gasto Total"
                value={loading ? '—' : fmtUSD(kpis?.totalSpend ?? 0)}
                color="blue" loading={loading}
              />
              <KCard icon={TrendingUp} title="Receita"
                value={loading ? '—' : fmtUSD(kpis?.totalRevenue ?? 0)}
                color="emerald" loading={loading}
              />
              <KCard icon={Activity} title="Lucro"
                value={loading ? '—' : fmtUSD(profit)}
                color={isProfit ? 'emerald' : 'rose'} loading={loading}
                sub={isProfit ? '▲ Lucrativo' : '▼ Prejuízo'}
              />
              <KCard icon={TrendingUp} title="ROI"
                value={loading ? '—' : formatROI(roi)}
                color={roi >= 0 ? 'violet' : 'amber'} loading={loading}
                sub={roi > 0 ? '▲ Acima do ponto de equilíbrio' : roi < 0 ? '▼ Abaixo' : 'Equilíbrio'}
              />
            </div>
          </section>

          {/* ── 2. Conversões ────────────────────────────────────────────────── */}
          <section>
            <SectionHeading icon={Target} title="Conversões" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 stagger">
              <KCard icon={MousePointerClick} title="Cliques"
                value={loading ? '—' : formatNumber(kpis?.clicks ?? 0)}
                color="amber" loading={loading}
              />
              <KCard icon={ShoppingCart} title="Compras"
                value={loading ? '—' : formatNumber(kpis?.purchases ?? 0)}
                color="emerald" loading={loading}
                sub={loading ? undefined : `${fmtPct(purchaseRate)} dos checkouts`}
              />
              <KCard icon={CreditCard} title="Init. Checkout"
                value={loading ? '—' : formatNumber(kpis?.initiateCheckouts ?? 0)}
                color="cyan" loading={loading}
                sub={loading ? undefined : `${fmtPct(checkoutRate)} dos cliques`}
              />
              <KCard icon={Activity} title="Conversões"
                value={loading ? '—' : formatNumber(kpis?.conversions ?? 0)}
                color="violet" loading={loading}
                sub={loading ? undefined : `CR geral: ${fmtPct(overallCR)}`}
              />
            </div>
          </section>

          {/* ── 3. Charts ────────────────────────────────────────────────────── */}
          <section>
            <SectionHeading icon={BarChart3} title="Performance Diária" badge={
              chartError && !chartLoading && chartData.length === 0 ? (
                <button onClick={() => retryCharts(dateRange)}
                  className="btn-secondary !py-1 !px-2.5 text-[10px] !border-amber-500/30 !text-amber-300 hover:!bg-amber-500/10 flex items-center gap-1">
                  <RefreshCw size={9} className={chartLoading ? 'animate-spin' : ''} />
                  Recarregar
                </button>
              ) : undefined
            } />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Gasto vs Receita */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <BarChart3 size={12} className="text-blue-400" strokeWidth={2.5} />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-100">Gasto vs Receita</h2>
                  <div className="flex items-center gap-3 ml-auto">
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-400" /> Gasto
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Receita
                    </span>
                  </div>
                </div>
                {loading || chartLoading ? (
                  <div className="h-48 rounded bg-surface-raised animate-pulse" />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={192}>
                    <BarChart data={chartFormatted} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#475569' }}
                        tickFormatter={(v, i) => i % Math.ceil(chartFormatted.length / 8) === 0 ? v : ''} />
                      <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={v => `$${Math.round(v)}`} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="spend"   name="Gasto"   fill="#60a5fa" fillOpacity={0.85} radius={[2,2,0,0]} />
                      <Bar dataKey="revenue" name="Receita" fill="#34d399" fillOpacity={0.85} radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-sm text-slate-600">Sem dados para o período</p>
                  </div>
                )}
              </div>

              {/* ROI + Lucro */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <LineIcon size={12} className="text-violet-400" strokeWidth={2.5} />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-100">ROI &amp; Lucro</h2>
                  <div className="flex items-center gap-3 ml-auto">
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Lucro
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                      <span className="w-2 h-2 rounded-full bg-violet-400" /> ROI
                    </span>
                  </div>
                </div>
                {loading || chartLoading ? (
                  <div className="h-48 rounded bg-surface-raised animate-pulse" />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={192}>
                    <LineChart data={chartFormatted} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#475569' }}
                        tickFormatter={(v, i) => i % Math.ceil(chartFormatted.length / 8) === 0 ? v : ''} />
                      <YAxis yAxisId="profit" tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={v=>`$${Math.round(v)}`} />
                      <YAxis yAxisId="roi" orientation="right" tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={v=>`${Math.round(v)}%`} />
                      <Tooltip content={<ROITip />} />
                      <Line yAxisId="profit" type="monotone" dataKey="profit" name="Lucro" stroke="#34d399" strokeWidth={2} dot={false} />
                      <Line yAxisId="roi"    type="monotone" dataKey="roi"    name="ROI"   stroke="#818cf8" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-sm text-slate-600">Sem dados para o período</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── 4. Funil de Conversão ────────────────────────────────────────── */}
          <section>
            <SectionHeading icon={Repeat2} title="Funil de Conversão" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label:'Cliques → Checkout',   rate:checkoutRate,  a:clicks,    b:checkouts, desc:'Iniciaram o processo de compra' },
                { label:'Checkout → Compra',     rate:purchaseRate,  a:checkouts, b:purchases, desc:'Converteram em compra aprovada' },
                { label:'CR Geral',              rate:overallCR,     a:clicks,    b:purchases, desc:'Compras sobre cliques totais' },
              ].map(item => {
                const good  = item.rate >= 3
                const warn  = item.rate >= 1
                const color = good ? 'text-emerald-300' : warn ? 'text-amber-300' : 'text-slate-400'
                return (
                  <div key={item.label} className="card p-4 sm:p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-slate-500 mb-3">{item.label}</p>
                    {loading ? <div className="h-8 w-24 rounded bg-surface-raised animate-pulse" /> : (
                      <>
                        <p className={`text-2xl font-bold tabular-nums ${color}`}>
                          {item.rate > 0 ? fmtPct(item.rate) : '—'}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1.5 font-medium">
                          {formatNumber(item.b)} de {formatNumber(item.a)} · {item.desc}
                        </p>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── 5. Campanhas ─────────────────────────────────────────────── */}
          <section>
            <SectionHeading icon={Layers} title="Campanhas"
              badge={
                <div className="flex items-center gap-2">
                  {!loading && campaigns.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-surface-raised border border-surface-muted px-2 py-0.5 rounded-md tabular-nums">
                      {campaigns.length} campanhas
                    </span>
                  )}
                  {/* Exportar campanhas */}
                  {!loading && campaigns.length > 0 && (
                    <button
                      title="Exportar campanhas para Excel"
                      disabled={isExportingCamp}
                      onClick={async () => {
                        setIsExportingCamp(true)
                        try { exportRedTrackCampaigns(campaigns, dateRange.from, dateRange.to) }
                        finally { setIsExportingCamp(false) }
                      }}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[10px] font-semibold transition-all
                        border border-emerald-500/30 bg-emerald-500/10 text-emerald-400
                        hover:bg-emerald-500/20 hover:border-emerald-500/50 disabled:opacity-40">
                      {isExportingCamp ? <Loader2 size={11} className="animate-spin"/> : <Download size={11}/>}
                      Excel
                    </button>
                  )}
                </div>
              }
            />
            <div className="card overflow-hidden">
              {loading ? (
                <div className="p-5 space-y-2">{[1,2,3,4,5].map(i=><div key={i} className="h-10 rounded bg-surface-raised animate-pulse"/>)}</div>
              ) : campaigns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-surface-border/60">
                        {['Campanha', 'Cliques', 'Conv.', 'Compras', 'Gasto', 'Receita', 'Lucro', 'ROI', 'CPA', ''].map((h, i) => (
                          <th key={i} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.10em] text-slate-600 first:pl-5">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => (
                        <tr key={c.id}
                          onClick={() => fetchAds(c, dateRange)}
                          className="border-b border-surface-border/30 hover:bg-surface-hover/50 transition-colors cursor-pointer group">
                          <td className="px-3 pl-5 py-2.5">
                            <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors truncate max-w-[220px]" title={c.name}>{c.name}</p>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-400 tabular-nums">{formatNumber(c.clicks)}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-400 tabular-nums">{formatNumber(c.conversions)}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-400 tabular-nums">{formatNumber(c.purchases)}</td>
                          <td className="px-3 py-2.5 text-xs text-blue-300 tabular-nums font-semibold">{fmtUSD(c.cost)}</td>
                          <td className="px-3 py-2.5 text-xs text-emerald-300 tabular-nums font-semibold">{fmtUSD(c.revenue)}</td>
                          <td className="px-3 py-2.5 text-xs tabular-nums font-semibold" style={{ color: c.profit >= 0 ? '#34d399' : '#f87171' }}>
                            {fmtUSD(c.profit)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${roiBgColor(c.roi)}`}>
                              {formatROI(c.roi)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-400 tabular-nums">{fmtUSD(c.cpa)}</td>
                          <td className="px-3 pr-4 py-2.5 text-right">
                            <ChevronRight size={13} className="text-slate-700 group-hover:text-slate-400 transition-colors inline"/>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-600">Nenhuma campanha encontrada no período</p>
                </div>
              )}
            </div>
          </section>

          {/* ── 6. Painel de Anúncios ────────────────────────────────────────── */}
          {selCampaign && (
            <section>
              <div className="card overflow-hidden border border-blue-500/20">

                {/* Cabeçalho do painel */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-surface-border/60 bg-blue-500/5">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                    <Megaphone size={12} className="text-blue-400" strokeWidth={2.5}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-slate-500">Anúncios</p>
                    <p className="text-xs font-medium text-slate-300 truncate" title={selCampaign.name}>{selCampaign.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Exportar anúncios */}
                    {!adsLoading && ads.length > 0 && (
                      <button
                        title="Exportar anúncios para Excel"
                        disabled={isExportingAds}
                        onClick={async () => {
                          setIsExportingAds(true)
                          try { exportRedTrackAds(ads, selCampaign.name, dateRange.from, dateRange.to) }
                          finally { setIsExportingAds(false) }
                        }}
                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[10px] font-semibold transition-all
                          border border-emerald-500/30 bg-emerald-500/10 text-emerald-400
                          hover:bg-emerald-500/20 hover:border-emerald-500/50 disabled:opacity-40">
                        {isExportingAds ? <Loader2 size={11} className="animate-spin"/> : <Download size={11}/>}
                        Excel
                      </button>
                    )}
                    {/* Recarregar */}
                    <button onClick={() => fetchAds(selCampaign, dateRange)} disabled={adsLoading}
                      className="btn-icon !w-7 !h-7" title="Recarregar anúncios">
                      <RefreshCw size={11} className={adsLoading ? 'animate-spin' : ''}/>
                    </button>
                    {/* Fechar */}
                    <button onClick={() => { setSelCampaign(null); setAds([]) }}
                      className="btn-icon !w-7 !h-7" title="Fechar">
                      <X size={13}/>
                    </button>
                  </div>
                </div>

                {/* Conteúdo */}
                {adsLoading ? (
                  <div className="p-5 space-y-2">{[1,2,3,4].map(i=>(
                    <div key={i} className="h-9 rounded-lg bg-surface-raised animate-pulse"/>
                  ))}</div>
                ) : adsError ? (
                  <div className="flex items-start gap-3 m-4 p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/8">
                    <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-xs font-semibold text-rose-300">Erro ao carregar anúncios</p>
                      <p className="text-[11px] text-rose-400/70 mt-0.5">{adsError}</p>
                    </div>
                  </div>
                ) : ads.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-slate-600">Nenhum anúncio encontrado para esta campanha no período</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr className="border-b border-surface-border/60 bg-surface-raised/30">
                          {['#', 'Anúncio', 'Cliques', 'Impr.', 'CTR%', 'CR%', 'Gasto', 'Receita', 'Lucro', 'ROI', 'CPA', 'Compras', 'Ck%'].map((h, i) => (
                            <th key={i} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 first:pl-5">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ads.map((ad, i) => (
                          <tr key={ad.id} className={`border-b border-surface-border/20 ${i%2===1?'bg-surface-raised/20':''}`}>
                            <td className="px-3 pl-5 py-2 text-[10px] text-slate-700 tabular-nums">{i+1}</td>
                            <td className="px-3 py-2 max-w-[240px]">
                              <p className="text-[11px] font-medium text-slate-300 truncate" title={ad.name}>{ad.name}</p>
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-400 tabular-nums">{formatNumber(ad.clicks)}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-500 tabular-nums">{formatNumber(ad.impressions)}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-400 tabular-nums">{ad.ctr.toFixed(2)}%</td>
                            <td className="px-3 py-2 text-[11px] text-slate-400 tabular-nums">{ad.cr.toFixed(2)}%</td>
                            <td className="px-3 py-2 text-[11px] text-blue-300 tabular-nums font-semibold">{fmtUSD(ad.cost)}</td>
                            <td className="px-3 py-2 text-[11px] text-emerald-300 tabular-nums font-semibold">{fmtUSD(ad.revenue)}</td>
                            <td className="px-3 py-2 text-[11px] tabular-nums font-semibold" style={{ color: ad.profit >= 0 ? '#34d399' : '#f87171' }}>
                              {fmtUSD(ad.profit)}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${roiBgColor(ad.roi)}`}>
                                {formatROI(ad.roi)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-400 tabular-nums">{fmtUSD(ad.cpa)}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-400 tabular-nums">{formatNumber(ad.purchases)}</td>
                            <td className="px-3 py-2 text-[11px] text-slate-500 tabular-nums">{ad.checkoutRate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="text-center py-8 border-t border-surface-border/30">
            <p className="text-[11px] text-slate-700 font-medium tracking-wide">
              RedTrack Analytics · Dados em tempo real
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
