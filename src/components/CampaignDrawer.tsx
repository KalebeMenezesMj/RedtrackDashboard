'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  X, TrendingUp, TrendingDown, DollarSign, Activity, MousePointerClick,
  RefreshCw, ShoppingCart, CreditCard, AlertCircle, Sparkles,
} from 'lucide-react'
import clsx from 'clsx'
import ROILineChart      from './ROILineChart'
import SpendRevenueChart from './SpendRevenueChart'
import InfoTooltip       from './InfoTooltip'
import { formatCurrency, formatROI, formatNumber } from '@/lib/format'
import type { CampaignRow, ChartDataPoint, DateRange } from '@/lib/types'

interface Props {
  campaign:  CampaignRow | null
  dateRange: DateRange
  onClose:   () => void
}

export default function CampaignDrawer({ campaign, dateRange, onClose }: Props) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const fetchData = useCallback(async (id: string, range: DateRange) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to })
      const res  = await fetch(`/api/campaign/${id}?${params}`)
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Erro na requisição')
      setChartData(json.chartData ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!campaign) { setChartData([]); return }
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

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes da campanha"
        className={clsx(
          'fixed top-0 right-0 h-full w-full max-w-xl z-50 flex flex-col',
          'bg-surface-card border-l border-surface-border',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'shadow-drawer',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="shrink-0 px-5 pt-5 pb-5 border-b border-surface-border">

          {/* Row: title + actions */}
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
              </div>
              <h2 className="text-[15px] font-bold text-slate-100 leading-snug break-words pr-2">
                {campaign?.name ?? ''}
              </h2>
              {campaign?.id && (
                <p className="text-[10px] text-slate-700 mt-1 font-mono">
                  {campaign.id.slice(0, 20)}…
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => campaign && fetchData(campaign.id, dateRange)}
                disabled={loading}
                aria-label="Atualizar"
                className="btn-icon !w-8 !h-8"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="btn-icon !w-8 !h-8 hover:!border-rose-500/30 hover:!bg-rose-500/10 hover:!text-rose-300"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Hero metrics row */}
          {campaign && (
            <div className="relative flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em] mb-1">
                  Lucro no período
                </p>
                <p className={clsx(
                  'text-[2rem] font-black tabular-nums tracking-tight leading-none',
                  profitable ? 'gradient-text-emerald' : 'gradient-text-rose',
                )}>
                  {formatCurrency(profit)}
                </p>
                <p className="text-[10px] text-slate-600 mt-1.5 font-medium">
                  {dateRange.from} → {dateRange.to}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em] mb-1">
                  ROI
                </p>
                <p className={clsx(
                  'text-2xl font-black tabular-nums tracking-tight leading-none',
                  roi >= 0 ? 'text-brand-300' : 'text-amber-300',
                )}>
                  {formatROI(roi)}
                </p>
                <p className="text-[10px] text-slate-600 mt-1.5 font-medium">
                  Receita {formatCurrency(campaign.revenue)}
                </p>
              </div>
            </div>
          )}
        </header>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-6">

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

          {/* KPI Grid */}
          <section>
            <SectionHeading icon={Sparkles} title="Métricas da campanha" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <DrawerKpi label="Gasto"        value={formatCurrency(campaign?.cost ?? 0)}
                         icon={DollarSign}    color="blue"
                         tooltip="Total investido nesta campanha no período selecionado." />
              <DrawerKpi label="Cliques"      value={formatNumber(campaign?.clicks ?? 0)}
                         icon={MousePointerClick} color="amber"
                         tooltip="Total de cliques rastreados pelo RedTrack." />
              <DrawerKpi label="Conversões"   value={formatNumber(campaign?.conversions ?? 0)}
                         icon={Activity}      color="violet"
                         tooltip="Total de eventos de conversão registrados." />
              <DrawerKpi label="Compras"      value={formatNumber(campaign?.purchases ?? 0)}
                         icon={ShoppingCart}  color="emerald"
                         tooltip="Número de eventos do tipo Purchase." />
              <DrawerKpi label="Init. Check." value={formatNumber(campaign?.initiateCheckouts ?? 0)}
                         icon={CreditCard}    color="blue"
                         tooltip="Usuários que iniciaram o checkout." />
              <DrawerKpi label="CPA"
                         value={(campaign?.conversions ?? 0) > 0 ? formatCurrency(campaign?.cpa ?? 0) : '—'}
                         icon={DollarSign}    color="violet"
                         tooltip="Custo por Aquisição — gasto médio por conversão." />
              <DrawerKpi label="CR%"
                         value={`${(campaign?.cr ?? 0).toFixed(2)}%`}
                         icon={Activity}      color="cyan"
                         tooltip="Taxa de Conversão — cliques que resultaram em conversão." />
              <DrawerKpi label="ROI"          value={formatROI(roi)}
                         icon={TrendingUp}    color={roi >= 0 ? 'emerald' : 'amber'}
                         tooltip="Retorno sobre o investimento." />
            </div>
          </section>

          {/* Charts */}
          <section>
            <SectionHeading icon={TrendingUp} title="Performance diária" />
            <div className="space-y-3">
              <div className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-slate-200">ROI e Lucro Diário</h3>
                  <InfoTooltip
                    align="right"
                    title="ROI e Lucro Diário"
                    text="Evolução dia a dia do Lucro ($) e ROI (%) desta campanha."
                  />
                </div>
                <p className="text-[11px] text-slate-500 mb-3 font-medium">Evolução diária no período</p>
                <ROILineChart data={chartData} loading={loading} />
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-slate-200">Gasto vs Receita</h3>
                  <InfoTooltip
                    align="right"
                    title="Gasto vs Receita Diário"
                    text="Comparativo diário entre investimento e retorno."
                  />
                </div>
                <p className="text-[11px] text-slate-500 mb-3 font-medium">Comparativo por dia</p>
                <SpendRevenueChart data={chartData} loading={loading} />
              </div>
            </div>
          </section>

          {/* Footer hint */}
          <p className="text-center text-[10px] text-slate-600 font-medium pt-2">
            Pressione <kbd className="px-1.5 py-0.5 rounded-md bg-surface-border border border-surface-muted text-slate-400 font-mono text-[9px] mx-0.5">ESC</kbd> para fechar
          </p>
        </div>
      </aside>
    </>
  )
}

/* ─── Section heading ─────────────────────────────────────────────────── */
function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <div className="w-5 h-5 rounded-md bg-surface-raised border border-surface-muted flex items-center justify-center shrink-0">
        <Icon size={10} className="text-slate-400" strokeWidth={2.5} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <div className="flex-1 h-px bg-surface-border" />
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

function DrawerKpi({
  label, value, icon: Icon, color, tooltip,
}: {
  label: string; value: string
  icon: React.ElementType; color: keyof typeof drawerColorMap; tooltip?: string
}) {
  const c = drawerColorMap[color]
  return (
    <div className="relative group flex flex-col gap-2 p-3 rounded-xl border border-surface-border bg-surface-card2 cursor-default transition-colors duration-150 hover:border-surface-muted">
      {/* Icon — flat tinted, no glow ring */}
      <div className={clsx('w-6 h-6 rounded-md flex items-center justify-center border shrink-0', c.bg, c.border)}>
        <Icon size={11} className={c.icon} strokeWidth={2.2} />
      </div>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.10em]">{label}</p>
      <p className="text-sm font-bold text-slate-100 tabular-nums leading-none">{value}</p>

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
