'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  ArrowLeft, DollarSign, TrendingUp, Activity, MousePointerClick, RefreshCw,
  AlertCircle, ShoppingCart, CreditCard, ChevronRight, BarChart3, Layers,
  PieChart as PieIcon, LineChart as LineIcon, Sparkles, Globe2,
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

/* ─── Platforms ────────────────────────────────────────────────────────────── */

interface Platform {
  tag:  string
  name: string
  logo: string
}

const PLATFORMS: Platform[] = [
  { tag: 'FB',  name: 'Facebook', logo: '/images/facebook.svg.png' },
  { tag: 'GG',  name: 'Google',   logo: '/images/google.svg.png'   },
  { tag: 'YT',  name: 'YouTube',  logo: '/images/youtube.png'      },
  { tag: 'TTK', name: 'TikTok',   logo: '/images/tiktok.png'       },
  { tag: 'OT',  name: 'Outbrain', logo: '/images/outbrain.png'     },
  { tag: 'TB',  name: 'Taboola',  logo: '/images/taboola.png'      },
]

/* ─── Date helpers ─────────────────────────────────────────────────────────── */

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function today() { return localDate() }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return localDate(d)
}

/* ─── Section heading ──────────────────────────────────────────────────────── */

function SectionHeading({
  icon: Icon, title, badge,
}: { icon: React.ElementType; title: string; badge?: React.ReactNode }) {
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[10px] text-slate-500 font-medium">{label}</span>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function CampanhasPage() {
  const [selected,         setSelected]         = useState<Platform | null>(null)
  const [dateRange,        setDateRange]        = useState<DateRange>({ from: daysAgo(30), to: today() })
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRow | null>(null)
  const [kpis,             setKpis]             = useState<KPIData | null>(null)
  const [chartData,        setChartData]        = useState<ChartDataPoint[]>([])
  const [campaigns,        setCampaigns]        = useState<CampaignRow[]>([])
  const [loading,          setLoading]          = useState(false)
  const [chartLoading,     setChartLoading]     = useState(false)
  const [error,            setError]            = useState<string | null>(null)
  const [chartError,       setChartError]       = useState<string | null>(null)
  const [apiStatus,        setApiStatus]        = useState<'connected' | 'error' | 'loading'>('loading')
  const [lastUpdate,       setLastUpdate]       = useState('')

  const fetchData = useCallback(async (platform: Platform, range: DateRange) => {
    setLoading(true)
    setError(null)
    setChartError(null)
    setApiStatus('loading')
    try {
      const params = new URLSearchParams({ tag: platform.tag, from: range.from, to: range.to })
      const res  = await fetch(`/api/platform?${params}`)
      const json = await res.json()
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

  const retryCharts = useCallback(async (platform: Platform, range: DateRange) => {
    setChartLoading(true)
    setChartError(null)
    try {
      const params = new URLSearchParams({ tag: platform.tag, from: range.from, to: range.to })
      const res  = await fetch(`/api/platform?${params}`)
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Falha')
      if (json.chartData?.length) setChartData(json.chartData)
      if (json.chartError) setChartError(json.chartError)
    } catch (e: unknown) {
      setChartError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setChartLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selected) fetchData(selected, dateRange)
  }, [selected, dateRange, fetchData])

  const handleBack = () => {
    setSelected(null)
    setKpis(null)
    setChartData([])
    setCampaigns([])
    setError(null)
    setApiStatus('loading')
    setSelectedCampaign(null)
  }

  const profit   = kpis?.totalProfit ?? 0
  const roi      = kpis?.roi ?? 0
  const isProfit = profit >= 0
  const hasRev   = campaigns.some(c => c.revenue > 0)

  // ── Taxas de funil ────────────────────────────────────────────────────────
  const clicks    = kpis?.clicks            ?? 0
  const checkouts = kpis?.initiateCheckouts ?? 0
  const purchases = kpis?.purchases         ?? 0
  const checkoutRate = clicks    > 0 ? (checkouts / clicks)    * 100 : 0
  const purchaseRate = checkouts > 0 ? (purchases / checkouts) * 100 : 0

  function fmtPct(v: number) {
    return v === 0 ? '—' : `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  }
  function purchaseTone(v: number): 'good' | 'warn' | 'neutral' {
    if (v === 0) return 'neutral'
    return v >= 20 ? 'good' : v >= 10 ? 'warn' : 'neutral'
  }
  function checkoutTone(v: number): 'good' | 'warn' | 'neutral' {
    if (v === 0) return 'neutral'
    return v >= 1 ? 'good' : v >= 0.3 ? 'warn' : 'neutral'
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />

      {selected && (
        <CampaignDrawer
          campaign={selectedCampaign}
          dateRange={dateRange}
          onClose={() => setSelectedCampaign(null)}
        />
      )}

      <main className="flex-1 overflow-y-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-surface-card/95 border-b border-surface-border backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap px-5 sm:px-6 py-4 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-3 min-w-0">
              {selected ? (
                <button
                  onClick={handleBack}
                  aria-label="Voltar para plataformas"
                  className="btn-icon shrink-0"
                >
                  <ArrowLeft size={14} />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
                  <Globe2 size={16} className="text-white" strokeWidth={2.5} />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {selected && (
                    <Image src={selected.logo} alt={selected.name} width={18} height={18}
                      className="rounded-md object-contain opacity-90 shrink-0" />
                  )}
                  <h1 className="text-base font-bold text-slate-100 tracking-tight truncate">
                    {selected ? selected.name : 'Campanhas por Plataforma'}
                  </h1>
                  {selected && <StatusBadge status={apiStatus} />}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  {selected
                    ? lastUpdate ? `Atualizado às ${lastUpdate}` : 'Carregando…'
                    : 'Selecione uma plataforma para analisar os dados'}
                </p>
              </div>
            </div>

            {selected && (
              <div className="flex items-center gap-2 flex-wrap">
                <DateRangePicker value={dateRange} onChange={setDateRange} />
                <button
                  onClick={() => fetchData(selected, dateRange)}
                  disabled={loading}
                  title="Atualizar dados"
                  aria-label="Atualizar dados"
                  className="btn-icon !w-9 !h-9 disabled:opacity-40"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="p-5 sm:p-6 space-y-6 max-w-screen-2xl mx-auto">

          {/* ── Platform Grid ─────────────────────────────────────────────── */}
          {!selected && (
            <>
              {/* Hero intro */}
              <section className="rounded-2xl border border-surface-border bg-surface-card p-6 sm:p-8">
                <div className="max-w-xl">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-2">Análise por canal</p>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight mb-2">
                    Escolha uma plataforma para começar
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Acesse KPIs, gráficos e campanhas filtradas por canal de mídia. Cada plataforma carrega dados em tempo real do RedTrack.
                  </p>
                </div>
              </section>

              <section>
                <SectionHeading icon={Layers} title="Plataformas disponíveis" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.tag}
                      onClick={() => setSelected(p)}
                      className="group relative bg-surface-card border border-surface-border rounded-xl p-5
                                 flex flex-col items-center gap-3.5 text-left overflow-hidden
                                 hover:border-surface-muted hover:bg-surface-hover
                                 transition-colors duration-150 cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-xl bg-surface-raised border border-surface-border flex items-center justify-center p-2.5">
                        <Image src={p.logo} alt={p.name} width={40} height={40}
                          className="object-contain w-9 h-9" />
                      </div>

                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                          {p.name}
                        </p>
                        <p className="text-[9px] text-slate-600 font-mono mt-0.5 uppercase tracking-wider">
                          [{p.tag}]
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 group-hover:text-brand-400 transition-colors">
                        Analisar
                        <ChevronRight size={11} strokeWidth={2.5} />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ── Platform Dashboard ────────────────────────────────────────── */}
          {selected && (
            <>
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm animate-fade-in-up">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Falha ao carregar os dados</p>
                    <p className="text-xs text-rose-400/80 mt-0.5 break-words">{error}</p>
                  </div>
                  <button
                    onClick={() => fetchData(selected, dateRange)}
                    className="btn-secondary !py-1 !px-2.5 text-[11px] shrink-0"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {/* KPIs */}
              <section>
                <SectionHeading icon={Sparkles} title={`Visão geral · ${selected.name}`} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <KPICard title="Gasto Total"    value={loading ? '—' : formatCurrency(kpis?.totalSpend ?? 0)}
                    icon={DollarSign}  color="blue" loading={loading}
                    tooltip="Total investido em anúncios pelas campanhas desta plataforma no período." />
                  <KPICard title="Receita"        value={loading ? '—' : formatCurrency(kpis?.totalRevenue ?? 0)}
                    icon={TrendingUp}  color="emerald" loading={loading}
                    tooltip="Receita total gerada pelas campanhas desta plataforma no período." />
                  <KPICard title="Lucro"          value={loading ? '—' : formatCurrency(profit)}
                    icon={Activity}    color={isProfit ? 'emerald' : 'red'} loading={loading}
                    delta={loading ? undefined : isProfit ? '▲ Lucrativo' : '▼ Prejuízo'} positive={isProfit}
                    tooltip="Receita menos Gasto. Positivo = lucrativo; negativo = prejuízo." />
                  <KPICard title="ROI"            value={loading ? '—' : formatROI(roi)}
                    icon={TrendingUp}  color={roi >= 0 ? 'violet' : 'amber'} loading={loading}
                    delta={loading ? undefined : roi > 0 ? '▲ Acima do ponto de equilíbrio' : roi < 0 ? '▼ Abaixo' : 'Ponto de equilíbrio'} positive={roi >= 0}
                    tooltip="Retorno sobre o investimento das campanhas desta plataforma." />
                  <KPICard title="Conversões"     value={loading ? '—' : formatNumber(kpis?.conversions ?? 0)}
                    icon={Activity}    color="violet" loading={loading}
                    tooltip="Total de eventos de conversão registrados." />
                  <KPICard title="Cliques"        value={loading ? '—' : formatNumber(kpis?.clicks ?? 0)}
                    icon={MousePointerClick} color="amber" loading={loading}
                    tooltip="Total de cliques rastreados pelo RedTrack." />
                  <KPICard title="Compras"        value={loading ? '—' : formatNumber(kpis?.purchases ?? 0)}
                    icon={ShoppingCart} color="emerald" loading={loading}
                    tooltip="Número de eventos do tipo Purchase (compras confirmadas)."
                    funnel={loading ? undefined : {
                      label: 'de checkouts',
                      value: fmtPct(purchaseRate),
                      tone:  purchaseTone(purchaseRate),
                    }} />
                  <KPICard title="Init. Checkout" value={loading ? '—' : formatNumber(kpis?.initiateCheckouts ?? 0)}
                    icon={CreditCard}  color="cyan" loading={loading}
                    tooltip="Usuários que iniciaram o checkout."
                    funnel={loading ? undefined : {
                      label: 'dos cliques',
                      value: fmtPct(checkoutRate),
                      tone:  checkoutTone(checkoutRate),
                    }} />
                </div>
              </section>

              {/* Charts */}
              <section>
                <SectionHeading icon={BarChart3} title="Performance" />

                {/* Banner erro gráficos */}
                {chartError && !chartLoading && chartData.length === 0 && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 mb-4 rounded-xl border border-amber-500/25 bg-amber-500/8 text-amber-300 text-xs animate-fade-in-up">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AlertCircle size={14} className="shrink-0 text-amber-400" />
                      <div>
                        <p className="font-semibold text-amber-300">Gráficos indisponíveis</p>
                        <p className="text-amber-400/70 mt-0.5 font-medium">Rate limit da API — KPIs e campanhas carregaram normalmente.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => selected && retryCharts(selected, dateRange)}
                      className="btn-secondary !py-1.5 !px-3 text-[11px] shrink-0 !border-amber-500/30 !text-amber-300 hover:!bg-amber-500/10"
                    >
                      <RefreshCw size={11} className="mr-1.5" />
                      Recarregar gráficos
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="card p-5 lg:col-span-2">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <LineIcon size={13} className="text-brand-300 shrink-0" strokeWidth={2.5} />
                          <h2 className="text-sm font-semibold text-slate-100">ROI e Lucro ao Longo do Tempo</h2>
                          <InfoTooltip title="ROI e Lucro" text="Evolução diária do Lucro ($) e do ROI (%) desta plataforma." position="bottom" />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Tendência diária de performance</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <LegendDot color="#34d399" label="Lucro" />
                        <LegendDot color="#818cf8" label="ROI" />
                      </div>
                    </div>
                    <ROILineChart data={chartData} loading={loading || chartLoading} />
                  </div>

                  <div className="card p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <PieIcon size={13} className="text-brand-300 shrink-0" strokeWidth={2.5} />
                      <h2 className="text-sm font-semibold text-slate-100">
                        {hasRev ? 'Receita por Campanha' : 'Gasto por Campanha'}
                      </h2>
                      <InfoTooltip title="Distribuição" text="Distribuição percentual entre as campanhas com maior impacto." align="right" position="bottom" />
                    </div>
                    <p className="text-[11px] text-slate-500 mb-4 font-medium">
                      {hasRev ? 'Participação na receita total' : 'Distribuição do investimento'}
                    </p>
                    <CampaignPieChart campaigns={campaigns} loading={loading} />
                  </div>
                </div>

                <div className="card p-5 mt-4">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <BarChart3 size={13} className="text-brand-300 shrink-0" strokeWidth={2.5} />
                        <h2 className="text-sm font-semibold text-slate-100">Gasto vs Receita</h2>
                        <InfoTooltip title="Gasto vs Receita" text="Comparativo diário entre o valor investido e o retorno gerado." position="bottom" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Comparativo diário de custo e receita</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <LegendDot color="#60a5fa" label="Gasto" />
                      <LegendDot color="#34d399" label="Receita" />
                    </div>
                  </div>
                  <SpendRevenueChart data={chartData} loading={loading || chartLoading} />
                </div>
              </section>

              {/* Table */}
              <section>
                <SectionHeading
                  icon={Layers}
                  title="Campanhas ativas"
                  badge={!loading && campaigns.length > 0 ? (
                    <span className="text-[10px] font-bold text-brand-300 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-full tabular-nums">
                      {campaigns.length} total
                    </span>
                  ) : undefined}
                />
                <div className="card p-5">
                  {!loading && campaigns.length > 0 && (
                    <p className="text-[11px] text-slate-500 mb-4 font-medium">
                      Clique em uma campanha para ver o detalhamento completo
                    </p>
                  )}
                  <CampaignTable campaigns={campaigns} loading={loading} onSelect={setSelectedCampaign} />
                </div>
              </section>

              <footer className="text-center py-6">
                <p className="text-[11px] text-slate-700 font-medium">
                  RedTrack Analytics · {selected.name} · Dados em tempo real
                </p>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
