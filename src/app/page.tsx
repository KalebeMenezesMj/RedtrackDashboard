'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, TrendingUp, Activity, MousePointerClick, RefreshCw, AlertCircle,
  ShoppingCart, CreditCard, BarChart3, Layers, PieChart as PieIcon,
  LineChart as LineIcon, LayoutDashboard, Sparkles, ArrowRight, Menu,
} from 'lucide-react'
import KPICard           from '@/components/KPICard'
import DateRangePicker   from '@/components/DateRangePicker'
import ROILineChart      from '@/components/ROILineChart'
import SpendRevenueChart from '@/components/SpendRevenueChart'
import CampaignPieChart  from '@/components/CampaignPieChart'
import CampaignTable     from '@/components/CampaignTable'
import CampaignDrawer    from '@/components/CampaignDrawer'
import Sidebar           from '@/components/Sidebar'
import StatusBadge       from '@/components/StatusBadge'
import InfoTooltip       from '@/components/InfoTooltip'
import { formatCurrency, formatROI, formatNumber } from '@/lib/format'
import type { DateRange, KPIData, ChartDataPoint, CampaignRow } from '@/lib/types'

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function today() { return localDate() }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return localDate(d)
}

/* ─── Section heading ─────────────────────────────────────────────────── */
function SectionHeading({
  icon: Icon, title, badge,
}: {
  icon: React.ElementType
  title: string
  badge?: React.ReactNode
  color?: 'brand' | 'blue' | 'violet' | 'emerald'  // kept for API compat
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      {/* Clean neutral icon box — no per-color tinting at section level */}
      <div className="w-6 h-6 rounded-lg bg-surface-raised border border-surface-muted flex items-center justify-center shrink-0">
        <Icon size={12} className="text-slate-400" strokeWidth={2.5} />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      {/* Solid rule instead of gradient fade */}
      <div className="flex-1 h-px bg-surface-border" />
      {badge}
    </div>
  )
}

/* ─── Chart card wrapper ──────────────────────────────────────────────── */
function ChartCard({
  icon: Icon,
  title,
  subtitle,
  legend,
  tooltip,
  children,
  className = '',
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  legend?: React.ReactNode
  tooltip?: { title: string; text: string }
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-500/12 border border-brand-500/22 flex items-center justify-center shrink-0">
              <Icon size={12} className="text-brand-300" strokeWidth={2.5} />
            </div>
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">{title}</h2>
            {tooltip && (
              <InfoTooltip title={tooltip.title} text={tooltip.text} position="bottom" />
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-600 mt-1.5 ml-8 font-medium">{subtitle}</p>
          )}
        </div>
        {legend && (
          <div className="flex items-center gap-3 shrink-0">{legend}</div>
        )}
      </div>
      {children}
    </div>
  )
}

/* ─── Legend dot ──────────────────────────────────────────────────────── */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Flat dot — no neon bloom, just the semantic color */}
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[10px] text-slate-500 font-medium">{label}</span>
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [sidebarOpen,      setSidebarOpen]      = useState(false)
  const [dateRange,        setDateRange]        = useState<DateRange>({ from: daysAgo(30), to: today() })
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRow | null>(null)
  const [kpis,             setKpis]             = useState<KPIData | null>(null)
  const [chartData,        setChartData]        = useState<ChartDataPoint[]>([])
  const [campaigns,        setCampaigns]        = useState<CampaignRow[]>([])
  const [loading,          setLoading]          = useState(true)
  const [chartLoading,     setChartLoading]     = useState(false)
  const [error,            setError]            = useState<string | null>(null)
  const [chartError,       setChartError]       = useState<string | null>(null)
  const [apiStatus,        setApiStatus]        = useState<'connected' | 'error' | 'loading'>('loading')
  const [lastUpdate,       setLastUpdate]       = useState('')

  const fetchData = useCallback(async (range: DateRange) => {
    setLoading(true)
    setError(null)
    setChartError(null)
    setApiStatus('loading')
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to })
      const res    = await fetch(`/api/report?${params}`)
      const json   = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Falha na requisição')
      setKpis(json.kpis)
      if (json.chartData?.length) setChartData(json.chartData)
      if (json.campaigns?.length) setCampaigns(json.campaigns)
      if (json.chartError) setChartError(json.chartError)
      setApiStatus('connected')
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setApiStatus('error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Recarrega apenas os gráficos sem refazer as KPIs
  const retryCharts = useCallback(async (range: DateRange) => {
    setChartLoading(true)
    setChartError(null)
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to, charts_only: '1' })
      const res    = await fetch(`/api/report?${params}`)
      const json   = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Falha')
      if (json.chartData?.length) setChartData(json.chartData)
      if (json.chartError) setChartError(json.chartError)
    } catch (e: unknown) {
      setChartError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setChartLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(dateRange) }, [fetchData, dateRange])

  const profit   = kpis?.totalProfit ?? 0
  const roi      = kpis?.roi ?? 0
  const isProfit = profit >= 0
  const hasRev   = campaigns.some(c => c.revenue > 0)

  // ── Taxas de funil ────────────────────────────────────────────────────────
  const clicks    = kpis?.clicks            ?? 0
  const checkouts = kpis?.initiateCheckouts ?? 0
  const purchases = kpis?.purchases         ?? 0

  /** Init. Checkout / Cliques × 100 */
  const checkoutRate = clicks    > 0 ? (checkouts / clicks)    * 100 : 0
  /** Compras / Init. Checkout × 100 */
  const purchaseRate = checkouts > 0 ? (purchases / checkouts) * 100 : 0

  function fmtPct(v: number) {
    return v === 0 ? '—' : `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  }
  // Tom visual: ≥20% compra = boa, ≥10% = ok, <10% = aviso
  function purchaseTone(v: number): 'good' | 'warn' | 'neutral' {
    if (v === 0) return 'neutral'
    return v >= 20 ? 'good' : v >= 10 ? 'warn' : 'neutral'
  }
  // Tom visual checkout: ≥1% = boa, ≥0.3% = ok, <0.3% = aviso
  function checkoutTone(v: number): 'good' | 'warn' | 'neutral' {
    if (v === 0) return 'neutral'
    return v >= 1 ? 'good' : v >= 0.3 ? 'warn' : 'neutral'
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      <CampaignDrawer
        campaign={selectedCampaign}
        dateRange={dateRange}
        onClose={() => setSelectedCampaign(null)}
      />

      <main className="flex-1 overflow-y-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-surface-card/95 border-b border-surface-border backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3.5 max-w-screen-2xl mx-auto">

            {/* Left: icon + title */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden btn-icon !w-9 !h-9 shrink-0"
                aria-label="Abrir menu"
              >
                <Menu size={16} />
              </button>
              {/* Flat brand icon — no gradient, no shadow bloom */}
              <div className="hidden md:flex w-8 h-8 rounded-xl bg-brand-600 items-center justify-center shrink-0">
                <LayoutDashboard size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-[15px] font-bold text-slate-100 tracking-tight leading-none">
                    Painel Geral
                  </h1>
                  <StatusBadge status={apiStatus} />
                </div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium leading-none">
                  {lastUpdate ? `Atualizado às ${lastUpdate}` : 'Carregando dados…'}
                </p>
              </div>
            </div>

            {/* Right: controls */}
            <div className="flex items-center gap-2">
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              <button
                onClick={() => fetchData(dateRange)}
                disabled={loading}
                title="Atualizar dados"
                aria-label="Atualizar dados"
                className="btn-icon !w-9 !h-9"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-5 sm:p-6 space-y-8 max-w-screen-2xl mx-auto animate-fade-in-up">

          {/* ── Error banner ─────────────────────────────────────────────── */}
          {error && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl border text-sm animate-fade-in-up"
              style={{
                background: 'rgba(244,63,94,0.08)',
                borderColor: 'rgba(244,63,94,0.22)',
                color: '#fda4af',
              }}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-rose-300">Falha ao carregar os dados</p>
                <p className="text-xs text-rose-400/70 mt-0.5 break-words">{error}</p>
              </div>
              <button
                onClick={() => fetchData(dateRange)}
                className="btn-secondary !py-1.5 !px-3 text-[11px] shrink-0"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* ── KPI Cards ────────────────────────────────────────────────── */}
          <section>
            <SectionHeading icon={Sparkles} title="Visão geral" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 stagger">
              <KPICard
                title="Gasto Total"
                value={loading ? '—' : formatCurrency(kpis?.totalSpend ?? 0)}
                icon={DollarSign}
                color="blue"
                loading={loading}
                tooltip="Total investido em anúncios por todas as campanhas ativas no período selecionado."
              />
              <KPICard
                title="Receita"
                value={loading ? '—' : formatCurrency(kpis?.totalRevenue ?? 0)}
                icon={TrendingUp}
                color="emerald"
                loading={loading}
                tooltip="Receita total gerada pelas campanhas ativas no período selecionado."
              />
              <KPICard
                title="Lucro"
                value={loading ? '—' : formatCurrency(profit)}
                icon={Activity}
                color={isProfit ? 'emerald' : 'red'}
                loading={loading}
                delta={loading ? undefined : isProfit ? '▲ Lucrativo' : '▼ Prejuízo'}
                positive={isProfit}
                tooltip="Receita menos Gasto. Positivo = lucrativo; negativo = prejuízo no período."
              />
              <KPICard
                title="ROI"
                value={loading ? '—' : formatROI(roi)}
                icon={TrendingUp}
                color={roi >= 0 ? 'violet' : 'amber'}
                loading={loading}
                delta={loading ? undefined : roi > 0 ? '▲ Acima do ponto de equilíbrio' : roi < 0 ? '▼ Abaixo' : 'Equilíbrio'}
                positive={roi >= 0}
                tooltip="Retorno sobre o investimento de todas as campanhas. Acima de 0% indica lucro."
              />
              <KPICard
                title="Conversões"
                value={loading ? '—' : formatNumber(kpis?.conversions ?? 0)}
                icon={Activity}
                color="violet"
                loading={loading}
                tooltip="Total de eventos de conversão registrados em todas as campanhas ativas."
              />
              <KPICard
                title="Cliques"
                value={loading ? '—' : formatNumber(kpis?.clicks ?? 0)}
                icon={MousePointerClick}
                color="amber"
                loading={loading}
                tooltip="Total de cliques rastreados pelo RedTrack no período selecionado."
              />
              <KPICard
                title="Compras"
                value={loading ? '—' : formatNumber(kpis?.purchases ?? 0)}
                icon={ShoppingCart}
                color="emerald"
                loading={loading}
                tooltip="Número de eventos do tipo Purchase — compras confirmadas no período."
                funnel={loading ? undefined : {
                  label: 'de checkouts',
                  value: fmtPct(purchaseRate),
                  tone:  purchaseTone(purchaseRate),
                }}
              />
              <KPICard
                title="Init. Checkout"
                value={loading ? '—' : formatNumber(kpis?.initiateCheckouts ?? 0)}
                icon={CreditCard}
                color="cyan"
                loading={loading}
                tooltip="Usuários que iniciaram o checkout. Indica intenção de compra antes da conversão."
                funnel={loading ? undefined : {
                  label: 'dos cliques',
                  value: fmtPct(checkoutRate),
                  tone:  checkoutTone(checkoutRate),
                }}
              />
            </div>
          </section>

          {/* ── Charts ───────────────────────────────────────────────────── */}
          <section>
            <SectionHeading icon={BarChart3} title="Performance" color="blue" />

            {/* Banner de erro dos gráficos — não bloqueia as KPIs */}
            {chartError && !chartLoading && chartData.length === 0 && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 mb-4 rounded-xl border border-amber-500/25 bg-amber-500/8 text-amber-300 text-xs animate-fade-in-up">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertCircle size={14} className="shrink-0 text-amber-400" />
                  <div>
                    <p className="font-semibold text-amber-300">Gráficos indisponíveis</p>
                    <p className="text-amber-400/70 mt-0.5 font-medium">Rate limit da API — os dados de KPI foram carregados normalmente.</p>
                  </div>
                </div>
                <button
                  onClick={() => retryCharts(dateRange)}
                  className="btn-secondary !py-1.5 !px-3 text-[11px] shrink-0 !border-amber-500/30 !text-amber-300 hover:!bg-amber-500/10"
                >
                  <RefreshCw size={11} className="mr-1.5" />
                  Recarregar gráficos
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* ROI Line Chart — 2/3 */}
              <ChartCard
                icon={LineIcon}
                title="ROI e Lucro ao Longo do Tempo"
                subtitle="Tendência diária de performance"
                className="lg:col-span-2"
                tooltip={{ title: 'ROI e Lucro ao Longo do Tempo', text: 'Mostra a evolução diária do Lucro (em $) e do ROI (%) no período.' }}
                legend={
                  <>
                    <LegendDot color="#34d399" label="Lucro" />
                    <LegendDot color="#818cf8" label="ROI" />
                  </>
                }
              >
                <ROILineChart data={chartData} loading={loading || chartLoading} />
              </ChartCard>

              {/* Pie Chart — 1/3 */}
              <ChartCard
                icon={PieIcon}
                title={hasRev ? 'Receita por Campanha' : 'Gasto por Campanha'}
                subtitle={hasRev ? 'Participação na receita total' : 'Distribuição do investimento'}
                tooltip={{
                  title: 'Distribuição',
                  text: hasRev
                    ? 'Distribuição percentual da receita entre as campanhas de maior resultado.'
                    : 'Distribuição percentual do investimento entre as campanhas com maior gasto.',
                }}
              >
                <CampaignPieChart campaigns={campaigns} loading={loading} />
              </ChartCard>
            </div>

            {/* Bar Chart — full width */}
            <div className="mt-4">
              <ChartCard
                icon={BarChart3}
                title="Gasto vs Receita"
                subtitle="Comparativo diário de custo e receita"
                tooltip={{ title: 'Gasto vs Receita', text: 'Comparativo diário entre o valor investido e o retorno gerado. Receita acima do gasto = dia lucrativo.' }}
                legend={
                  <>
                    <LegendDot color="#60a5fa" label="Gasto" />
                    <LegendDot color="#34d399" label="Receita" />
                  </>
                }
              >
                <SpendRevenueChart data={chartData} loading={loading || chartLoading} />
              </ChartCard>
            </div>
          </section>

          {/* ── Campaigns Table ──────────────────────────────────────────── */}
          <section>
            <SectionHeading
              icon={Layers}
              title="Campanhas ativas"
              color="violet"
              badge={!loading && campaigns.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-surface-raised border border-surface-muted px-2 py-0.5 rounded-md tabular-nums">
                  {campaigns.length} campanhas
                </span>
              ) : undefined}
            />

            <div className="card overflow-hidden">
              {/* Table hint */}
              {!loading && campaigns.length > 0 && (
                <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-border/60 bg-surface-card/50">
                  <ArrowRight size={11} className="text-slate-600 shrink-0" />
                  <p className="text-[11px] text-slate-600 font-medium">
                    Clique em uma campanha para ver o detalhamento completo
                  </p>
                </div>
              )}
              <div className="p-1">
                <CampaignTable
                  campaigns={campaigns}
                  loading={loading}
                  onSelect={setSelectedCampaign}
                />
              </div>
            </div>
          </section>

          {/* ── Footer ───────────────────────────────────────────────────── */}
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
