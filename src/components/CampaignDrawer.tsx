'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  X, TrendingUp, TrendingDown, DollarSign, Activity, MousePointerClick,
  RefreshCw, ShoppingCart, CreditCard, AlertCircle, Sparkles, Megaphone,
  Image as ImageIcon, ArrowUpDown, ChevronUp, ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'
import ROILineChart      from './ROILineChart'
import SpendRevenueChart from './SpendRevenueChart'
import InfoTooltip       from './InfoTooltip'
import { formatCurrency, formatROI, formatNumber } from '@/lib/format'
import type { CampaignRow, ChartDataPoint, DateRange, AdRow } from '@/lib/types'

interface Props {
  campaign:  CampaignRow | null
  dateRange: DateRange
  onClose:   () => void
}

type AdSortField = 'cost' | 'revenue' | 'profit' | 'roi' | 'clicks' | 'purchases' | 'purchaseRate' | 'checkoutRate'

export default function CampaignDrawer({ campaign, dateRange, onClose }: Props) {
  const [chartData,   setChartData]   = useState<ChartDataPoint[]>([])
  const [ads,         setAds]         = useState<AdRow[] | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [adsError,    setAdsError]    = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [adSort,      setAdSort]      = useState<{ field: AdSortField; dir: 'asc' | 'desc' }>({ field: 'cost', dir: 'desc' })

  // Carga única — gráficos + anúncios na mesma chamada (?ads=1)
  const fetchData = useCallback(async (id: string, range: DateRange) => {
    setLoading(true)
    setError(null)
    setAds(null)
    setAdsError(null)
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to, ads: '1' })
      const res  = await fetch(`/api/campaign/${id}?${params}`)
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Erro na requisição')
      setChartData(json.chartData ?? [])
      setAds(json.ads ?? [])
      if (json.adsError) setAdsError(json.adsError)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!campaign) { setChartData([]); setAds(null); return }
    fetchData(campaign.id, dateRange)
  }, [campaign, dateRange, fetchData])

  /* ESC to close + body scroll lock */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (!campaign) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [campaign])

  const open       = !!campaign
  const profit     = campaign?.profit ?? 0
  const roi        = campaign?.roi    ?? 0
  const profitable = profit >= 0

  // ── Taxas de funil ──────────────────────────────────────────────────────────
  const camClicks    = campaign?.clicks            ?? 0
  const camCheckouts = campaign?.initiateCheckouts ?? 0
  const camPurchases = campaign?.purchases         ?? 0
  const camCheckoutRate = camClicks    > 0 ? (camCheckouts / camClicks)    * 100 : 0
  const camPurchaseRate = camCheckouts > 0 ? (camPurchases / camCheckouts) * 100 : 0

  function fmtPct(v: number) {
    return v === 0 ? '—' : `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  }

  // ── Ordenação de anúncios ───────────────────────────────────────────────────
  const sortedAds = [...(ads ?? [])].sort((a, b) => {
    const mul = adSort.dir === 'desc' ? -1 : 1
    return (a[adSort.field] - b[adSort.field]) * mul
  })

  function toggleSort(field: AdSortField) {
    setAdSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { field, dir: 'desc' }
    )
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={clsx(
          'fixed inset-0 bg-black/65 backdrop-blur-sm z-40 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Drawer — wider to fit ads table */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes da campanha"
        className={clsx(
          'fixed top-0 right-0 h-full w-full max-w-[960px] z-50 flex flex-col',
          'bg-surface-card border-l border-surface-border',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'shadow-drawer',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="shrink-0 px-4 sm:px-5 pt-4 sm:pt-5 pb-4 sm:pb-5 border-b border-surface-border">

          <div className="relative flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-600">
                  Campanha
                </span>
                {campaign && (
                  <span className={clsx(
                    'inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                    profitable
                      ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/28'
                      : 'bg-rose-500/12 text-rose-400 border-rose-500/28',
                  )}>
                    {profitable
                      ? <><TrendingUp size={8} strokeWidth={3} /> Lucrativa</>
                      : <><TrendingDown size={8} strokeWidth={3} /> Prejuízo</>}
                  </span>
                )}
                {ads !== null && ads.length > 0 && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-brand-500/10 text-brand-300 border-brand-500/20 uppercase tracking-wider">
                    {ads.length} {ads.length === 1 ? 'anúncio' : 'anúncios'}
                  </span>
                )}
              </div>
              <h2 className="text-[15px] font-bold text-slate-100 leading-snug break-words pr-2">
                {campaign?.name ?? ''}
              </h2>
              {campaign?.id && (
                <p className="text-[10px] text-slate-700 mt-1 font-mono">
                  {campaign.id.slice(0, 24)}…
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => campaign && fetchData(campaign.id, dateRange)}
                disabled={loading}
                aria-label="Atualizar"
                className="btn-icon !w-10 !h-10 sm:!w-8 sm:!h-8"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="btn-icon !w-10 !h-10 sm:!w-8 sm:!h-8 hover:!border-rose-500/30 hover:!bg-rose-500/10 hover:!text-rose-300"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Hero metrics */}
          {campaign && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em] mb-1">Lucro no período</p>
                <p className={clsx(
                  'text-2xl sm:text-[1.75rem] font-black tabular-nums tracking-tight leading-none',
                  profitable ? 'gradient-text-emerald' : 'gradient-text-rose',
                )}>
                  {formatCurrency(profit)}
                </p>
                <p className="text-[10px] text-slate-600 mt-1.5 font-medium">{dateRange.from} → {dateRange.to}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em] mb-1">ROI</p>
                <p className={clsx(
                  'text-2xl font-black tabular-nums tracking-tight leading-none',
                  roi >= 0 ? 'text-brand-300' : 'text-amber-300',
                )}>
                  {formatROI(roi)}
                </p>
                <p className="text-[10px] text-slate-600 mt-1.5 font-medium">Receita {formatCurrency(campaign.revenue)}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em] mb-1">Gasto total</p>
                <p className="text-2xl font-black tabular-nums tracking-tight leading-none text-blue-400">
                  {formatCurrency(campaign.cost)}
                </p>
                <p className="text-[10px] text-slate-600 mt-1.5 font-medium">{formatNumber(campaign.clicks)} cliques</p>
              </div>
            </div>
          )}
        </header>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 sm:py-5 space-y-6">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold mb-0.5">Falha ao carregar detalhes</p>
                <p className="text-rose-400/80 font-medium break-words">{error}</p>
              </div>
            </div>
          )}

          {/* ── KPI Grid ───────────────────────────────────────────────── */}
          <section>
            <SectionHeading icon={Sparkles} title="Métricas da campanha" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <DrawerKpi label="Gasto"       value={formatCurrency(campaign?.cost ?? 0)}
                icon={DollarSign}        color="blue"
                tooltip="Total investido nesta campanha no período selecionado." />
              <DrawerKpi label="Receita"     value={formatCurrency(campaign?.revenue ?? 0)}
                icon={TrendingUp}        color="emerald"
                tooltip="Receita total gerada por esta campanha no período." />
              <DrawerKpi label="Cliques"     value={formatNumber(campaign?.clicks ?? 0)}
                icon={MousePointerClick} color="amber"
                tooltip="Total de cliques rastreados pelo RedTrack." />
              <DrawerKpi label="Conversões"  value={formatNumber(campaign?.conversions ?? 0)}
                icon={Activity}          color="violet"
                tooltip="Total de eventos de conversão registrados." />
              <DrawerKpi label="Compras"     value={formatNumber(campaign?.purchases ?? 0)}
                icon={ShoppingCart}      color="emerald"
                tooltip="Número de eventos do tipo Purchase."
                funnel={{
                  pct:   fmtPct(camPurchaseRate),
                  label: 'de checkouts',
                  tone:  camPurchaseRate >= 20 ? 'good' : camPurchaseRate >= 10 ? 'warn' : 'neutral',
                }} />
              <DrawerKpi label="Init. Check." value={formatNumber(campaign?.initiateCheckouts ?? 0)}
                icon={CreditCard}        color="cyan"
                tooltip="Usuários que iniciaram o checkout."
                funnel={{
                  pct:   fmtPct(camCheckoutRate),
                  label: 'dos cliques',
                  tone:  camCheckoutRate >= 1 ? 'good' : camCheckoutRate >= 0.3 ? 'warn' : 'neutral',
                }} />
              <DrawerKpi label="CPA"
                value={(campaign?.conversions ?? 0) > 0 ? formatCurrency(campaign?.cpa ?? 0) : '—'}
                icon={DollarSign}        color="violet"
                tooltip="Custo por Aquisição — gasto médio por conversão." />
              <DrawerKpi label="CR%"
                value={`${(campaign?.cr ?? 0).toFixed(2)}%`}
                icon={Activity}          color="cyan"
                tooltip="Taxa de Conversão — cliques que resultaram em conversão." />
            </div>
          </section>

          {/* ── Ads Breakdown ──────────────────────────────────────────── */}
          <section>
            <SectionHeading
              icon={ImageIcon}
              title="Anúncios"
              badge={
                ads !== null && ads.length > 0 ? (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 tabular-nums">
                    {ads.length} ads
                  </span>
                ) : null
              }
            />

            {/* Loading skeleton (durante carregamento inicial) */}
            {loading && (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton h-14 w-full rounded-xl" />
                ))}
              </div>
            )}

            {/* Erro ao carregar anúncios */}
            {adsError && !loading && (
              <div className="flex flex-col gap-2 px-3 py-3 rounded-xl border border-amber-500/25 bg-amber-500/8 text-[11px] text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Erro ao carregar anúncios</p>
                    <p className="text-amber-400/80 font-mono text-[10px] mt-0.5 break-all">{adsError}</p>
                  </div>
                  <button
                    onClick={() => campaign && fetchData(campaign.id, dateRange)}
                    className="shrink-0 text-[10px] font-semibold underline underline-offset-2 hover:text-amber-200 whitespace-nowrap"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            )}

            {/* Tabela de anúncios */}
            {!loading && ads !== null && ads.length > 0 && (
              <div className="rounded-xl border border-surface-border overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[580px]">
                    {/* Header */}
                    <div className="flex items-center px-3 py-2 bg-surface-raised border-b border-surface-border text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 gap-2">
                      <span className="w-7 shrink-0" />
                      <span className="flex-1 min-w-0">Anúncio</span>
                      <SortBtn field="cost"         label="Gasto"   active={adSort} onSort={toggleSort} className="w-[82px] justify-end" />
                      <SortBtn field="revenue"      label="Receita" active={adSort} onSort={toggleSort} className="w-[82px] justify-end" />
                      <SortBtn field="roi"          label="ROI"     active={adSort} onSort={toggleSort} className="w-[72px] justify-end" />
                      <SortBtn field="purchases"    label="Compras" active={adSort} onSort={toggleSort} className="w-[68px] justify-end" />
                      <SortBtn field="purchaseRate" label="Conv%"   active={adSort} onSort={toggleSort} className="w-[68px] justify-end" />
                      <SortBtn field="checkoutRate" label="CK%"     active={adSort} onSort={toggleSort} className="w-[60px] justify-end" />
                    </div>
                    {/* Rows */}
                    <div className="divide-y divide-surface-border/60">
                      {sortedAds.map((ad, idx) => (
                        <AdTableRow key={ad.id} ad={ad} rank={idx + 1} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vazio */}
            {!loading && ads !== null && ads.length === 0 && !adsError && (
              <div className="flex flex-col items-center justify-center py-8 text-slate-600 text-xs gap-2">
                <Megaphone size={20} strokeWidth={1.5} className="text-slate-700" />
                <span>Nenhum anúncio encontrado para este período</span>
              </div>
            )}
          </section>

          {/* ── Charts ─────────────────────────────────────────────────── */}
          <section>
            <SectionHeading icon={TrendingUp} title="Performance diária" />
            <div className="space-y-3">
              <div className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-slate-200">ROI e Lucro Diário</h3>
                  <InfoTooltip align="right" title="ROI e Lucro Diário"
                    text="Evolução dia a dia do Lucro ($) e ROI (%) desta campanha." />
                </div>
                <p className="text-[11px] text-slate-500 mb-3 font-medium">Evolução diária no período</p>
                <ROILineChart data={chartData} loading={loading} />
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-slate-200">Gasto vs Receita</h3>
                  <InfoTooltip align="right" title="Gasto vs Receita Diário"
                    text="Comparativo diário entre investimento e retorno." />
                </div>
                <p className="text-[11px] text-slate-500 mb-3 font-medium">Comparativo por dia</p>
                <SpendRevenueChart data={chartData} loading={loading} />
              </div>
            </div>
          </section>

          {/* Footer hint */}
          <p className="text-center text-[10px] text-slate-600 font-medium pt-2 pb-4">
            <span className="hidden sm:inline">
              Pressione{' '}
              <kbd className="px-1.5 py-0.5 rounded-md bg-surface-border border border-surface-muted text-slate-400 font-mono text-[9px] mx-0.5">
                ESC
              </kbd>{' '}
              para fechar
            </span>
            <span className="sm:hidden">Toque fora para fechar</span>
          </p>
        </div>
      </aside>
    </>
  )
}

/* ─── Ad table row ────────────────────────────────────────────────────── */
function AdTableRow({ ad, rank }: { ad: AdRow; rank: number }) {
  const profitable = ad.profit >= 0
  const hasRev     = ad.revenue > 0

  return (
    <div className="flex items-center px-3 py-2.5 gap-2 hover:bg-surface-raised/40 transition-colors">
      {/* Rank badge */}
      <span className={clsx(
        'shrink-0 w-7 h-5 rounded-md flex items-center justify-center text-[9px] font-black border',
        rank === 1 && 'bg-amber-500/15 border-amber-500/25 text-amber-400',
        rank === 2 && 'bg-slate-500/10 border-slate-500/20 text-slate-400',
        rank === 3 && 'bg-orange-500/10 border-orange-500/20 text-orange-400',
        rank  > 3  && 'bg-surface-raised border-surface-muted text-slate-600',
      )}>
        {rank}
      </span>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-slate-200 truncate" title={ad.name}>
          {ad.name || `Ad ${rank}`}
        </p>
        <p className="text-[9px] text-slate-600 font-mono truncate">{ad.id.slice(0, 20)}…</p>
      </div>

      {/* Gasto */}
      <span className="w-[82px] text-[11px] font-semibold text-blue-400 tabular-nums text-right whitespace-nowrap shrink-0">
        {formatCurrency(ad.cost)}
      </span>

      {/* Receita */}
      <span className={clsx(
        'w-[82px] text-[11px] font-semibold tabular-nums text-right whitespace-nowrap shrink-0',
        hasRev ? 'text-emerald-400' : 'text-slate-600',
      )}>
        {hasRev ? formatCurrency(ad.revenue) : '—'}
      </span>

      {/* ROI */}
      <span className={clsx(
        'w-[72px] text-[11px] font-bold tabular-nums text-right whitespace-nowrap shrink-0',
        profitable ? 'text-brand-300' : 'text-rose-400',
      )}>
        {hasRev ? formatROI(ad.roi) : '—'}
      </span>

      {/* Compras */}
      <span className={clsx(
        'w-[68px] text-[11px] font-semibold tabular-nums text-right whitespace-nowrap shrink-0',
        ad.purchases > 0 ? 'text-emerald-400' : 'text-slate-600',
      )}>
        {ad.purchases > 0 ? formatNumber(ad.purchases) : '—'}
      </span>

      {/* Conv% (purchase rate) */}
      <div className="w-[68px] flex justify-end shrink-0">
        <FunnelBadge value={ad.purchaseRate} thresholds={[20, 10]} />
      </div>

      {/* CK% (checkout rate) */}
      <div className="w-[60px] flex justify-end shrink-0">
        <FunnelBadge value={ad.checkoutRate} thresholds={[1, 0.3]} />
      </div>
    </div>
  )
}

/* ─── Small funnel badge ──────────────────────────────────────────────── */
function FunnelBadge({ value, thresholds }: { value: number; thresholds: [number, number] }) {
  if (value === 0) return <span className="text-[10px] text-slate-600 text-right">—</span>
  const tone = value >= thresholds[0] ? 'good' : value >= thresholds[1] ? 'warn' : 'low'
  return (
    <span className={clsx(
      'inline-flex justify-center px-1.5 py-0.5 rounded-md border text-[9px] font-bold tabular-nums whitespace-nowrap',
      tone === 'good' && 'bg-emerald-500/8 border-emerald-500/18 text-emerald-400',
      tone === 'warn' && 'bg-amber-500/8  border-amber-500/18  text-amber-400',
      tone === 'low'  && 'bg-rose-500/8   border-rose-500/18   text-rose-400',
    )}>
      {value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
    </span>
  )
}

/* ─── Sort button ─────────────────────────────────────────────────────── */
function SortBtn({
  field, label, active, onSort, className,
}: {
  field: AdSortField
  label: string
  active: { field: AdSortField; dir: 'asc' | 'desc' }
  onSort: (f: AdSortField) => void
  className?: string
}) {
  const isActive = active.field === field
  return (
    <button
      onClick={() => onSort(field)}
      className={clsx(
        'inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors whitespace-nowrap shrink-0',
        isActive ? 'text-brand-300' : 'text-slate-500 hover:text-slate-300',
        className,
      )}
    >
      {label}
      {isActive
        ? active.dir === 'desc'
          ? <ChevronDown size={9} strokeWidth={3} />
          : <ChevronUp   size={9} strokeWidth={3} />
        : <ArrowUpDown   size={9} strokeWidth={2} className="opacity-40" />}
    </button>
  )
}

/* ─── Section heading ─────────────────────────────────────────────────── */
function SectionHeading({
  icon: Icon, title, badge,
}: {
  icon: React.ElementType; title: string; badge?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <div className="w-5 h-5 rounded-md bg-surface-raised border border-surface-muted flex items-center justify-center shrink-0">
        <Icon size={10} className="text-slate-400" strokeWidth={2.5} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <div className="flex-1 h-px bg-surface-border" />
      {badge}
    </div>
  )
}

/* ─── KPI mini-card ───────────────────────────────────────────────────── */
const drawerColorMap = {
  blue:    { icon: 'text-blue-400',    bg: 'bg-blue-500/8',    border: 'border-blue-500/15' },
  emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15' },
  violet:  { icon: 'text-violet-400',  bg: 'bg-violet-500/8',  border: 'border-violet-500/15' },
  amber:   { icon: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/15' },
  rose:    { icon: 'text-rose-400',    bg: 'bg-rose-500/8',    border: 'border-rose-500/15' },
  cyan:    { icon: 'text-cyan-400',    bg: 'bg-cyan-500/8',    border: 'border-cyan-500/15' },
}

interface DrawerFunnel {
  pct:   string
  label: string
  tone:  'good' | 'warn' | 'neutral'
}

function DrawerKpi({
  label, value, icon: Icon, color, tooltip, funnel,
}: {
  label: string; value: string
  icon: React.ElementType; color: keyof typeof drawerColorMap
  tooltip?: string; funnel?: DrawerFunnel
}) {
  const c = drawerColorMap[color]
  return (
    <div className="relative group flex flex-col gap-2 p-3 rounded-xl border border-surface-border bg-surface-card2 cursor-default transition-colors duration-150 hover:border-surface-muted">
      <div className={clsx('w-6 h-6 rounded-md flex items-center justify-center border shrink-0', c.bg, c.border)}>
        <Icon size={11} className={c.icon} strokeWidth={2.2} />
      </div>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.10em]">{label}</p>
      <div className="flex items-end justify-between gap-1">
        <p className="text-sm font-bold text-slate-100 tabular-nums leading-none">{value}</p>
        {funnel && (
          <span className={clsx(
            'inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-md border text-[9px] font-bold tabular-nums',
            funnel.tone === 'good'    && 'bg-emerald-500/8 border-emerald-500/18 text-emerald-400',
            funnel.tone === 'warn'    && 'bg-amber-500/8  border-amber-500/18  text-amber-400',
            funnel.tone === 'neutral' && 'bg-surface-raised border-surface-muted text-slate-400',
          )}>
            {funnel.pct}
          </span>
        )}
      </div>
      {funnel && <p className="text-[9px] text-slate-600 font-medium -mt-1">{funnel.label}</p>}

      {tooltip && (
        <div className={clsx(
          'pointer-events-none absolute bottom-full left-0 mb-2 z-50',
          'w-48 rounded-xl border border-surface-muted bg-surface-card2 px-3 py-2.5',
          'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0',
          'transition-all duration-150 shadow-card-raised',
        )}>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.10em] mb-1">{label}</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">{tooltip}</p>
        </div>
      )}
    </div>
  )
}
