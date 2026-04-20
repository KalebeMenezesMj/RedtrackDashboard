'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileSpreadsheet,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
  Zap,
  Star,
  TrendingUp,
  Activity,
  ShoppingCart,
} from 'lucide-react'
import clsx from 'clsx'
import {
  AdRow,
  AdScore,
  ClassifiedItem,
  Combination,
  CombinationResult,
  CTARecommendation,
  FullAnalysis,
  MetricAnalysis,
  PrioritizedCombination,
  TierName,
  buildAdScoreTable,
  formatAnalysisForClipboard,
  formatCombinationsForClipboard,
  generateCombinations,
  getCtaRecommendation,
  prioritizeCombinations,
  runFullAnalysis,
} from '@/lib/creativeAnalysis'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value: number): string {
  return value.toFixed(2).replace('.', ',') + '%'
}

function useClipboard(timeout = 1800) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), timeout)
      })
    },
    [timeout],
  )
  return { copied, copy }
}

function buildCopyText(metricLabel: string, a: MetricAnalysis): string {
  const r = (t: string, items: ClassifiedItem[]) =>
    `${t}:\n${items.length ? items.map(i => `${i.name} — ${fmt(i.value)}`).join('\n') : '—'}`
  return `${metricLabel}\n\n${r('TOP', a.top)}\n\n${r('FORTES', a.fortes)}\n\n${r('MÉDIOS', a.medios)}`
}

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const { copied, copy } = useClipboard()
  return (
    <button
      onClick={e => { e.stopPropagation(); copy(text) }}
      className={clsx(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all shrink-0',
        copied
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
          : 'border-slate-600 bg-surface-hover text-slate-400 hover:text-slate-200 hover:border-slate-500',
      )}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copiado!' : label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Tier item
// ---------------------------------------------------------------------------

const TIER_CONFIG = {
  TOP:    { border: 'border-l-yellow-400',  text: 'text-yellow-300',  badge: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/25' },
  FORTES: { border: 'border-l-emerald-400', text: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25' },
  MÉDIOS: { border: 'border-l-blue-400',    text: 'text-blue-400',    badge: 'bg-blue-400/10 text-blue-300 border-blue-400/25' },
}

function TierLabel({ tier }: { tier: keyof typeof TIER_CONFIG }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border', TIER_CONFIG[tier].badge)}>
      {tier}
    </span>
  )
}

function ItemRow({ item, rank, tier }: { item: ClassifiedItem; rank: number; tier: keyof typeof TIER_CONFIG }) {
  const cfg = TIER_CONFIG[tier]
  return (
    <div className={clsx(
      'flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-r-lg border border-l-2 border-surface-border bg-slate-900/50 transition-colors hover:bg-slate-800/60',
      cfg.border,
    )}>
      <span className="text-[10px] text-slate-600 tabular-nums w-4 shrink-0 text-right">{rank}</span>
      <span className="text-xs text-slate-300 font-mono truncate flex-1 min-w-0">{item.name}</span>
      <span className={clsx('text-xs font-bold tabular-nums shrink-0', cfg.text)}>{fmt(item.value)}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MetricSection
// ---------------------------------------------------------------------------

interface MetricSectionProps {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  subtitle: string
  analysis: MetricAnalysis
  copyText: string
}

function MetricSection({ icon: Icon, iconColor, iconBg, title, subtitle, analysis, copyText }: MetricSectionProps) {
  const [open, setOpen] = useState(true)
  const total = analysis.top.length + analysis.fortes.length + analysis.medios.length

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover transition-colors text-left w-full"
      >
        <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
          <Icon size={13} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 leading-tight">{title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* mini summary pills */}
          <div className="hidden sm:flex gap-1">
            {analysis.top.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-yellow-400/10 text-yellow-300 border-yellow-400/20 tabular-nums">
                {analysis.top.length}T
              </span>
            )}
            {analysis.fortes.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-400/10 text-emerald-300 border-emerald-400/20 tabular-nums">
                {analysis.fortes.length}F
              </span>
            )}
            {analysis.medios.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-400/10 text-blue-300 border-blue-400/20 tabular-nums">
                {analysis.medios.length}M
              </span>
            )}
          </div>
          <CopyButton text={copyText} />
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 border-t border-surface-border pt-3 space-y-4">
          {total === 0 && (
            <p className="text-xs text-slate-600 text-center py-3">Sem dados classificados</p>
          )}

          {(['TOP', 'FORTES', 'MÉDIOS'] as const).map(tier => {
            const items = tier === 'TOP' ? analysis.top : tier === 'FORTES' ? analysis.fortes : analysis.medios
            if (items.length === 0) return null
            let rankOffset = 0
            if (tier === 'FORTES') rankOffset = analysis.top.length
            if (tier === 'MÉDIOS') rankOffset = analysis.top.length + analysis.fortes.length
            return (
              <div key={tier}>
                <div className="flex items-center gap-2 mb-2">
                  <TierLabel tier={tier} />
                  <span className="text-[10px] text-slate-600">{items.length} anúncio{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-1">
                  {items.map((item, idx) => (
                    <ItemRow key={item.name} item={item} rank={rankOffset + idx + 1} tier={tier} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CombinationsSection — tabs por tipo + linhas compactas
// ---------------------------------------------------------------------------

interface ComboTab {
  key: string
  label: string
  short: string           // label curto para mobile
  combos: Combination[]
  hookColor: string
  bodyColor: string
  activeCls: string       // classes do tab ativo
  dotCls: string          // bolinha colorida
}

function buildTabClipboard(tab: ComboTab): string {
  return (
    `${tab.label}\n` +
    tab.combos.map((c, i) => `${i + 1}. Hook: ${c.hook} → Body: ${c.body}`).join('\n')
  )
}

/** Extrai o sufixo mais único do nome (últimos 4 segmentos separados por -) */
function shortAdName(name: string): string {
  const parts = name.split('-')
  if (parts.length <= 5) return name
  return '…' + parts.slice(-4).join('-')
}

interface ComboRowProps {
  combo: Combination
  idx: number
  hookColor: string
  bodyColor: string
}

function ComboRow({ combo, idx, hookColor, bodyColor }: ComboRowProps) {
  return (
    <div className="grid grid-cols-[2rem_1fr_1.5rem_1fr] items-start gap-x-2 px-4 py-2.5 hover:bg-slate-800/40 transition-colors even:bg-slate-900/20">
      {/* index */}
      <span className="text-[10px] text-slate-600 tabular-nums font-mono pt-3">{idx + 1}</span>

      {/* hook */}
      <div>
        <p className="text-[9px] text-slate-600 uppercase tracking-wider leading-none mb-0.5">Hook</p>
        <p className={clsx('text-[11px] font-mono break-all leading-snug', hookColor)}>
          {combo.hook}
        </p>
      </div>

      {/* arrow */}
      <ArrowRight size={12} className="text-slate-700 justify-self-center mt-3" />

      {/* body */}
      <div>
        <p className="text-[9px] text-slate-600 uppercase tracking-wider leading-none mb-0.5">Body</p>
        <p className={clsx('text-[11px] font-mono break-all leading-snug', bodyColor)}>
          {combo.body}
        </p>
      </div>
    </div>
  )
}

interface CombinationsSectionProps {
  combinations: CombinationResult
  clipboardAll: string
}

function CombinationsSection({ combinations, clipboardAll }: CombinationsSectionProps) {
  const blocks: ComboTab[] = [
    {
      key: 'TOP+TOP',
      label: 'TOP HOOK + TOP BODY',
      short: 'TOP+TOP',
      combos: combinations.topHookTopBody,
      hookColor: 'text-yellow-300',
      bodyColor: 'text-yellow-300',
      activeCls: '',
      dotCls: 'bg-yellow-400',
    },
    {
      key: 'TOP+FORTE',
      label: 'TOP HOOK + FORTE BODY',
      short: 'TOP+FORTE',
      combos: combinations.topHookForteBody,
      hookColor: 'text-yellow-300',
      bodyColor: 'text-emerald-400',
      activeCls: '',
      dotCls: 'bg-orange-400',
    },
    {
      key: 'FORTE+TOP',
      label: 'FORTE HOOK + TOP BODY',
      short: 'FORTE+TOP',
      combos: combinations.forteHookTopBody,
      hookColor: 'text-emerald-400',
      bodyColor: 'text-yellow-300',
      activeCls: '',
      dotCls: 'bg-emerald-400',
    },
    {
      key: 'FORTE+FORTE',
      label: 'FORTE HOOK + FORTE BODY',
      short: 'FORTE+FORTE',
      combos: combinations.forteHookForteBody,
      hookColor: 'text-emerald-400',
      bodyColor: 'text-emerald-400',
      activeCls: '',
      dotCls: 'bg-blue-400',
    },
  ].filter(t => t.combos.length > 0)

  const total = blocks.reduce((s, t) => s + t.combos.length, 0)

  if (blocks.length === 0) return null

  return (
    <div className="card overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Zap size={13} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Combinações Hook × Body</p>
            <p className="text-[11px] text-slate-500">{total} combinaç{total !== 1 ? 'ões' : 'ão'} no total</p>
          </div>
        </div>
        <CopyButton text={clipboardAll} label="Copiar tudo" />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2rem_1fr_1.5rem_1fr] gap-x-2 px-4 py-1.5 bg-slate-900/40 border-b border-surface-border sticky top-0 z-10">
        <span />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Hook</span>
        <span />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Body</span>
      </div>

      {/* All blocks */}
      {blocks.map((block, bIdx) => (
        <div key={block.key}>
          {/* Block divider */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border-y border-surface-border">
            <span className={clsx('w-2 h-2 rounded-full shrink-0', block.dotCls)} />
            <span className="text-[11px] font-semibold text-slate-400">{block.label}</span>
            <span className="text-[10px] text-slate-600 ml-auto">{block.combos.length} combo{block.combos.length !== 1 ? 's' : ''}</span>
            <CopyButton text={buildTabClipboard(block)} label="Copiar" />
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-800/30">
            {block.combos.map((combo, idx) => (
              <ComboRow
                key={idx}
                combo={combo}
                idx={idx}
                hookColor={block.hookColor}
                bodyColor={block.bodyColor}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div className="px-4 py-2 border-t border-surface-border bg-slate-900/20">
        <p className="text-[10px] text-slate-600">{total} combinaç{total !== 1 ? 'ões' : 'ão'} gerada{total !== 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tier display helpers
// ---------------------------------------------------------------------------

const TIER_PILL: Record<NonNullable<TierName>, string> = {
  TOP:   'bg-yellow-400/15 text-yellow-300 border-yellow-400/30',
  FORTE: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  MÉDIO: 'bg-blue-400/15 text-blue-300 border-blue-400/30',
}

function TierPill({ tier }: { tier: TierName }) {
  if (!tier) return <span className="text-slate-700 text-[10px]">—</span>
  return (
    <span className={clsx('inline-block px-1.5 py-px rounded text-[10px] font-bold border', TIER_PILL[tier])}>
      {tier}
    </span>
  )
}

function ScoreBar({ score, max = 12 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100)
  const color = score >= 10 ? 'bg-yellow-400' : score >= 7 ? 'bg-emerald-400' : score >= 4 ? 'bg-blue-400' : 'bg-slate-600'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-800 overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-500 tabular-nums">{score}/12</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OverviewTable — visão multi-métrica cruzada
// ---------------------------------------------------------------------------

function OverviewTable({ scores }: { scores: AdScore[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-700/60 border border-slate-600 flex items-center justify-center shrink-0">
            <Star size={13} className="text-slate-300" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-200">Visão Geral — Score por Anúncio</p>
            <p className="text-[11px] text-slate-500">Cruzamento das 4 métricas · ordenado por score total (0–12)</p>
          </div>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-500 shrink-0" /> : <ChevronDown size={14} className="text-slate-500 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-surface-border overflow-x-auto">
          {/* Header */}
          <div className="grid grid-cols-[1fr_5rem_5rem_5rem_5rem_6rem] gap-x-3 px-4 py-2 bg-slate-900/50 border-b border-surface-border text-[10px] text-slate-500 uppercase tracking-wider font-semibold min-w-[600px]">
            <span>Anúncio</span>
            <span className="text-center">Play Rate</span>
            <span className="text-center">Hook Ret.</span>
            <span className="text-center">Body Ret.</span>
            <span className="text-center">Body Conv.</span>
            <span>Score</span>
          </div>
          {/* Rows */}
          <div className="divide-y divide-slate-800/40 min-w-[600px]">
            {scores.map((row, idx) => (
              <div
                key={row.name}
                className={clsx(
                  'grid grid-cols-[1fr_5rem_5rem_5rem_5rem_6rem] gap-x-3 px-4 py-2.5 items-center transition-colors hover:bg-slate-800/30',
                  idx === 0 && 'bg-yellow-400/5',
                )}
              >
                <span title={row.name} className="text-[11px] font-mono text-slate-300 truncate">{row.name}</span>
                <span className="flex justify-center"><TierPill tier={row.playRateTier} /></span>
                <span className="flex justify-center"><TierPill tier={row.hookRetentionTier} /></span>
                <span className="flex justify-center"><TierPill tier={row.bodyRetentionTier} /></span>
                <span className="flex justify-center"><TierPill tier={row.bodyConversionTier} /></span>
                <ScoreBar score={row.score} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CTACard — recomendação matemática de CTA
// ---------------------------------------------------------------------------

function CTACard({ rec }: { rec: CTARecommendation }) {
  const { copied, copy } = useClipboard()
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5">
      <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
        <ShoppingCart size={13} className="text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-300">CTA Recomendada — Stage 1 e 2</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Use a CTA do anúncio com maior Conversão do Body:
          {' '}<span title={rec.name} className="font-mono text-slate-200">{rec.name}</span>
          {' '}<span className="text-amber-400 font-semibold">({rec.bodyConversionPct.toFixed(2).replace('.', ',')}%)</span>
        </p>
      </div>
      <button
        onClick={() => copy(rec.name)}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all shrink-0',
          copied
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
            : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10',
        )}
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? 'Copiado!' : 'Copiar nome'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stage2Section — prioridade cruzada (matemática, sem IA)
// ---------------------------------------------------------------------------

const PRIORITY_STYLE = {
  ALTA:  { badge: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30', dot: 'bg-yellow-400' },
  MÉDIA: { badge: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30', dot: 'bg-emerald-400' },
  BAIXA: { badge: 'bg-slate-700 text-slate-400 border-slate-600', dot: 'bg-slate-500' },
}

function Stage2Section({ items }: { items: PrioritizedCombination[] }) {
  const [open, setOpen] = useState(true)
  const [filter, setFilter] = useState<'TODAS' | 'ALTA' | 'MÉDIA' | 'BAIXA'>('TODAS')

  const alta  = items.filter(i => i.priority === 'ALTA').length
  const media = items.filter(i => i.priority === 'MÉDIA').length
  const visible = filter === 'TODAS' ? items : items.filter(i => i.priority === filter)

  const clipText =
    'STAGE 2 — PRIORIDADE CRUZADA\n\n' +
    visible.map((c, i) =>
      `${i + 1}. [${c.priority}] Hook: ${c.hook} → Body: ${c.body} (score ${c.score}/12)`
    ).join('\n')

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center shrink-0">
            <Zap size={13} className="text-yellow-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-200">Stage 2 — Prioridade Cruzada</p>
            <p className="text-[11px] text-slate-500">
              Combinações ranqueadas por Play Rate + Hook Ret. + Body Conv. + Body Ret. · {alta} alta · {media} média
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyButton text={clipText} label="Copiar" />
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-surface-border">
          {/* Filter bar */}
          <div className="flex gap-1.5 px-4 py-2.5 border-b border-surface-border bg-slate-900/30">
            {(['TODAS', 'ALTA', 'MÉDIA', 'BAIXA'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all',
                  filter === f
                    ? f === 'TODAS'
                      ? 'bg-slate-700 text-slate-200 border-slate-600'
                      : PRIORITY_STYLE[f === 'BAIXA' ? 'BAIXA' : f].badge
                    : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600',
                )}
              >
                {f}
                {f !== 'TODAS' && (
                  <span className="ml-1 opacity-70">{items.filter(i => i.priority === f).length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1.5rem_auto_1fr_1.5rem_1fr_5rem_5rem] gap-x-3 px-4 py-1.5 bg-slate-900/50 border-b border-surface-border text-[10px] text-slate-500 uppercase tracking-wider font-semibold min-w-[640px] overflow-x-auto">
            <span>#</span>
            <span>Prior.</span>
            <span>Hook</span>
            <span />
            <span>Body</span>
            <span className="text-center">Métricas</span>
            <span>Score</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-800/30 overflow-x-auto">
            {visible.map((row, idx) => {
              const ps = PRIORITY_STYLE[row.priority]
              return (
                <div
                  key={idx}
                  className="grid grid-cols-[1.5rem_auto_1fr_1.5rem_1fr_5rem_5rem] gap-x-3 px-4 py-2.5 items-center hover:bg-slate-800/30 transition-colors min-w-[640px]"
                >
                  <span className="text-[10px] text-slate-600 tabular-nums">{idx + 1}</span>
                  <span className={clsx('text-[10px] font-bold px-1.5 py-px rounded border whitespace-nowrap', ps.badge)}>
                    {row.priority}
                  </span>
                  <span title={row.hook} className="text-[11px] font-mono text-emerald-400 truncate">{row.hook}</span>
                  <ArrowRight size={11} className="text-slate-700 justify-self-center" />
                  <span title={row.body} className="text-[11px] font-mono text-yellow-300 truncate">{row.body}</span>
                  {/* Mini tier grid */}
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    <TierPill tier={row.hookPlayRateTier} />
                    <TierPill tier={row.hookRetentionTier} />
                    <TierPill tier={row.bodyConversionTier} />
                    <TierPill tier={row.bodyRetentionTier} />
                  </div>
                  <ScoreBar score={row.score} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AIStreamBlock — renderiza markdown simples em streaming
// ---------------------------------------------------------------------------

function AIStreamBlock({ markdown }: { markdown: string }) {
  if (!markdown) return null

  // Render básico: headers, bold, bullet points
  const lines = markdown.split('\n')
  return (
    <div className="space-y-1 text-[13px] text-slate-300 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <p key={i} className="text-sm font-bold text-slate-100 mt-4 mb-1 first:mt-0">
              {line.slice(3)}
            </p>
          )
        }
        if (line.startsWith('### ')) {
          return (
            <p key={i} className="text-xs font-semibold text-slate-200 mt-3 mb-1">
              {line.slice(4)}
            </p>
          )
        }
        if (line.startsWith('- **') || line.startsWith('- ')) {
          const content = line.slice(2)
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-slate-600 mt-0.5 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-200">$1</strong>').replace(/\*(.*?)\*/g, '<em class="text-slate-400">$1</em>') }} />
            </div>
          )
        }
        if (line.match(/^\d+\. /)) {
          const [num, ...rest] = line.split('. ')
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-slate-600 tabular-nums shrink-0 w-5 text-right">{num}.</span>
              <span dangerouslySetInnerHTML={{ __html: rest.join('. ').replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-200">$1</strong>').replace(/\*(.*?)\*/g, '<em class="text-slate-400 not-italic">$1</em>') }} />
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} className="h-1" />
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-200">$1</strong>').replace(/\*(.*?)\*/g, '<em class="text-slate-400 not-italic">$1</em>') }} />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AISection — componente base para Stage 3 e Stage 4
// ---------------------------------------------------------------------------

interface AISectionProps {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  badge: string
  buttonLabel: string
  buttonBg: string
  onGenerate: () => void
  status: 'idle' | 'loading' | 'done' | 'error'
  content: string
  errorMsg: string
}

function AISection({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  badge,
  buttonLabel,
  buttonBg,
  onGenerate,
  status,
  content,
  errorMsg,
}: AISectionProps) {
  const [open, setOpen] = useState(true)
  const { copied, copy } = useClipboard()

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-border">
        <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
          <Icon size={13} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-200">{title}</p>
            <span className="text-[10px] px-1.5 py-px rounded border border-violet-500/30 bg-violet-500/10 text-violet-400 font-semibold">
              {badge}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status === 'done' && content && (
            <>
              <button
                onClick={() => copy(content)}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all',
                  copied
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-600 bg-surface-hover text-slate-400 hover:text-slate-200',
                )}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={() => setOpen(o => !o)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        {status === 'idle' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center', iconBg)}>
              <Icon size={22} className={iconColor} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-300">{title}</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">{subtitle}</p>
            </div>
            <button
              onClick={onGenerate}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                buttonBg,
              )}
            >
              <Sparkles size={14} />
              {buttonLabel}
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={24} className={clsx('animate-spin', iconColor)} />
            <p className="text-sm text-slate-400">Claude está pensando…</p>
            <p className="text-xs text-slate-600">Isso pode levar 15–30 segundos</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-red-400">{errorMsg}</p>
            <button
              onClick={onGenerate}
              className="text-xs text-slate-500 underline hover:text-slate-300 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {status === 'done' && content && open && (
          <div className="pt-1">
            <AIStreamBlock markdown={content} />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AIStepCard — card de um passo dentro de um stage
// ---------------------------------------------------------------------------

interface StepCardEntry {
  name: string
  tier: string   // 'TOP' | 'FORTE' | etc.
  value: string
  onChange: (v: string) => void
}

interface StepCardProps {
  stepNum: number
  title: string
  description: string
  hint?: string[]         // nomes TOP / FORTE para ajudar o usuário
  hintLabel?: string
  textarea?: {
    value: string
    onChange: (v: string) => void
    placeholder: string
  }
  // Nova opção: campo individual por anúncio (substitui hint + textarea)
  entries?: StepCardEntry[]
  buttonLabel: string
  buttonDisabled?: boolean
  status: AIStatus
  content: string
  errorMsg: string
  onRun: () => void
}

function AIStepCard({
  stepNum, title, description, hint, hintLabel,
  textarea, entries, buttonLabel, buttonDisabled = false,
  status, content, errorMsg, onRun,
}: StepCardProps) {
  const [open, setOpen] = useState(true)
  const { copied, copy } = useClipboard()

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden">
      {/* Step header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/40 border-b border-surface-border">
        <span className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[11px] font-bold flex items-center justify-center shrink-0">
          {stepNum}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200">{title}</p>
          <p className="text-[11px] text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status === 'done' && content && (
            <button
              onClick={() => copy(content)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all',
                copied
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-600 bg-surface-hover text-slate-400 hover:text-slate-200',
              )}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          )}
          {status !== 'idle' && (
            <button onClick={() => setOpen(o => !o)} className="text-slate-500 hover:text-slate-300 transition-colors">
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="px-4 py-4 space-y-3">
          {/* Hint: nomes TOP/FORTE da análise (modo legado) */}
          {hint && hint.length > 0 && !entries && (
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
                {hintLabel ?? 'Identificados pela análise'}
              </p>
              <div className="flex flex-wrap gap-1">
                {hint.map(n => (
                  <span key={n} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {n}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-600 mt-1.5">Cole o texto copy desses anúncios abaixo</p>
            </div>
          )}

          {/* Textarea input (modo legado) */}
          {textarea && !entries && (status === 'idle' || status === 'error') && (
            <textarea
              value={textarea.value}
              onChange={e => textarea.onChange(e.target.value)}
              placeholder={textarea.placeholder}
              rows={6}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-xs text-slate-300 font-mono placeholder:text-slate-600 focus:outline-none focus:border-violet-500/60 resize-y"
            />
          )}

          {/* Entries: campo individual por anúncio */}
          {entries && entries.length > 0 && (status === 'idle' || status === 'error') && (
            <div className="space-y-3">
              {entries.map(entry => (
                <div key={entry.name}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={clsx(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border',
                      entry.tier === 'TOP'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-violet-500/15 text-violet-400 border-violet-500/30',
                    )}>
                      {entry.tier}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono truncate max-w-[260px]">{entry.name}</span>
                  </div>
                  <textarea
                    value={entry.value}
                    onChange={e => entry.onChange(e.target.value)}
                    placeholder={`Cole aqui o copy do anúncio "${entry.name}"…`}
                    rows={3}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-xs text-slate-300 font-mono placeholder:text-slate-600 focus:outline-none focus:border-violet-500/60 resize-y"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Button */}
          {(status === 'idle' || status === 'error') && (
            <button
              onClick={onRun}
              disabled={
                buttonDisabled ||
                (!!textarea && !entries && !textarea.value.trim()) ||
                (!!entries && entries.every(e => !e.value.trim()))
              }
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                (buttonDisabled ||
                  (!!textarea && !entries && !textarea.value.trim()) ||
                  (!!entries && entries.every(e => !e.value.trim())))
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-500 text-white',
              )}
            >
              <Sparkles size={14} />
              {buttonLabel}
            </button>
          )}

          {/* Error */}
          {status === 'error' && errorMsg && (
            <p className="text-xs text-red-400">{errorMsg}</p>
          )}

          {/* Loading */}
          {status === 'loading' && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 size={18} className="animate-spin text-violet-400" />
              <p className="text-sm text-slate-400">Claude está gerando…</p>
            </div>
          )}

          {/* Output */}
          {status === 'done' && content && (
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3 max-h-96 overflow-y-auto">
              <AIStreamBlock markdown={content} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stage3Section
// ---------------------------------------------------------------------------

interface Stage3Props {
  topBodyNames: string[];  forteBodyNames: string[]
  topHookNames: string[];  forteHookNames: string[]
  bodyInputs: Record<string, string>;  onBodyInputChange: (name: string, v: string) => void
  step1Status: AIStatus;   step1Content: string;  step1Error: string;  onRunStep1: () => void
  hookInputs: Record<string, string>;  onHookInputChange: (name: string, v: string) => void
  step2Status: AIStatus;   step2Content: string;  step2Error: string;  onRunStep2: () => void
  step3Status: AIStatus;   step3Content: string;  step3Error: string;  onRunStep3: () => void
}

function Stage3Section({
  topBodyNames, forteBodyNames, topHookNames, forteHookNames,
  bodyInputs, onBodyInputChange,
  step1Status, step1Content, step1Error, onRunStep1,
  hookInputs, onHookInputChange,
  step2Status, step2Content, step2Error, onRunStep2,
  step3Status, step3Content, step3Error, onRunStep3,
}: Stage3Props) {
  // Monta arrays de entradas individuais por anúncio
  const bodyEntries: StepCardEntry[] = [
    ...topBodyNames.map(name => ({
      name, tier: 'TOP',
      value: bodyInputs[name] ?? '',
      onChange: (v: string) => onBodyInputChange(name, v),
    })),
    ...forteBodyNames.map(name => ({
      name, tier: 'FORTE',
      value: bodyInputs[name] ?? '',
      onChange: (v: string) => onBodyInputChange(name, v),
    })),
  ]

  const hookEntries: StepCardEntry[] = [
    ...topHookNames.map(name => ({
      name, tier: 'TOP',
      value: hookInputs[name] ?? '',
      onChange: (v: string) => onHookInputChange(name, v),
    })),
    ...forteHookNames.map(name => ({
      name, tier: 'FORTE',
      value: hookInputs[name] ?? '',
      onChange: (v: string) => onHookInputChange(name, v),
    })),
  ]

  const hasAnyBody = Object.values(bodyInputs).some(v => v.trim())
  const hasAnyHook = Object.values(hookInputs).some(v => v.trim())
  const canCombine =
    (step1Status === 'done' || hasAnyBody) &&
    (step2Status === 'done' || hasAnyHook)

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-border">
        <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
          <Sparkles size={13} className="text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-200">Stage 3 — Bater Controle de Body + Hook</p>
            <span className="text-[10px] px-1.5 py-px rounded border border-violet-500/30 bg-violet-500/10 text-violet-400 font-semibold">IA</span>
          </div>
          <p className="text-[11px] text-slate-500">Cole o copy dos top performers → gera variações → combina em criativos prontos</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Step 1 — Bodies */}
        <AIStepCard
          stepNum={1}
          title="Mix dos Melhores Bodies"
          description="Gera variações dos bodies de maior conversão"
          entries={bodyEntries}
          buttonLabel="Gerar variações de Body"
          status={step1Status}
          content={step1Content}
          errorMsg={step1Error}
          onRun={onRunStep1}
        />

        {/* Step 2 — Hooks */}
        <AIStepCard
          stepNum={2}
          title="Mix dos Melhores Hooks"
          description="Gera variações dos hooks com maior retenção"
          entries={hookEntries}
          buttonLabel="Gerar variações de Hook"
          status={step2Status}
          content={step2Content}
          errorMsg={step2Error}
          onRun={onRunStep2}
        />

        {/* Step 3 — Combine */}
        <AIStepCard
          stepNum={3}
          title="Junção — Criativos Prontos"
          description="Combina hooks e bodies em criativos completos com transições"
          buttonLabel="Combinar em Criativos"
          buttonDisabled={!canCombine}
          status={step3Status}
          content={step3Content}
          errorMsg={step3Error}
          onRun={onRunStep3}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stage4Section
// ---------------------------------------------------------------------------

interface Stage4Props {
  nicho: string;           onNichoChange: (v: string) => void
  researchStatus: AIStatus; researchContent: string; researchError: string; onRunResearch: () => void
  creative: string;        onCreativeChange: (v: string) => void
  slices: string[];        onSliceChange: (idx: number, v: string) => void
  multiplyStatus: AIStatus; multiplyContent: string; multiplyError: string; onRunMultiply: () => void
}

function Stage4Section({
  nicho, onNichoChange,
  researchStatus, researchContent, researchError, onRunResearch,
  creative, onCreativeChange,
  slices, onSliceChange,
  multiplyStatus, multiplyContent, multiplyError, onRunMultiply,
}: Stage4Props) {
  const [multiplyOpen, setMultiplyOpen] = useState(false)
  const { copied: copiedResearch, copy: copyResearch } = useClipboard()
  const { copied: copiedMultiply, copy: copyMultiply } = useClipboard()

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-border">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <Users size={13} className="text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-200">Stage 4 — Fatias de Público</p>
            <span className="text-[10px] px-1.5 py-px rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-semibold">IA</span>
          </div>
          <p className="text-[11px] text-slate-500">Pesquisa 30 fatias de público do nicho · depois multiplica criativo validado</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Part A: Research ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-700/60 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/40 border-b border-surface-border">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold flex items-center justify-center shrink-0">A</span>
            <p className="text-xs font-semibold text-slate-300">Pesquisa de Mercado — 30 Fatias de Público</p>
            {researchStatus === 'done' && researchContent && (
              <button
                onClick={() => copyResearch(researchContent)}
                className={clsx(
                  'ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all',
                  copiedResearch
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-600 bg-surface-hover text-slate-400 hover:text-slate-200',
                )}
              >
                {copiedResearch ? <Check size={11} /> : <Copy size={11} />}
                {copiedResearch ? 'Copiado!' : 'Copiar'}
              </button>
            )}
          </div>

          <div className="px-4 py-3 space-y-3">
            {(researchStatus === 'idle' || researchStatus === 'error') && (
              <>
                <div className="flex gap-2">
                  <input
                    value={nicho}
                    onChange={e => onNichoChange(e.target.value)}
                    placeholder="Ex: emagrecimento, marketing digital, desenvolvimento pessoal..."
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
                  />
                  <button
                    onClick={onRunResearch}
                    disabled={!nicho.trim()}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
                      !nicho.trim()
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-700 hover:bg-cyan-600 text-white',
                    )}
                  >
                    <Sparkles size={13} />
                    Encontrar 30 Fatias
                  </button>
                </div>
                {researchStatus === 'error' && researchError && (
                  <p className="text-xs text-red-400">{researchError}</p>
                )}
              </>
            )}

            {researchStatus === 'loading' && (
              <div className="flex items-center gap-3 py-4">
                <Loader2 size={18} className="animate-spin text-cyan-400" />
                <p className="text-sm text-slate-400">Claude está pesquisando o mercado… pode levar 30–60s</p>
              </div>
            )}

            {researchStatus === 'done' && researchContent && (
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3 max-h-96 overflow-y-auto">
                <AIStreamBlock markdown={researchContent} />
              </div>
            )}
          </div>
        </div>

        {/* ── Part B: Multiply ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-700/60 overflow-hidden">
          <button
            onClick={() => setMultiplyOpen(o => !o)}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-900/40 border-b border-surface-border hover:bg-surface-hover transition-colors"
          >
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold flex items-center justify-center shrink-0">B</span>
            <p className="text-xs font-semibold text-slate-300 flex-1 text-left">Multiplicar Criativo Validado para 5 Públicos</p>
            {multiplyOpen ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
          </button>

          {multiplyOpen && (
            <div className="px-4 py-3 space-y-3">
              {/* Creative input */}
              <div>
                <p className="text-[11px] text-slate-500 mb-1.5">Criativo validado (Hook + Body + CTA)</p>
                <textarea
                  value={creative}
                  onChange={e => onCreativeChange(e.target.value)}
                  placeholder="Cole aqui o criativo completo que já foi validado e que quer multiplicar..."
                  rows={5}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 resize-y"
                />
              </div>

              {/* 5 slice inputs */}
              <div>
                <p className="text-[11px] text-slate-500 mb-1.5">Fatias de público (uma por campo)</p>
                <div className="space-y-1.5">
                  {slices.map((s, i) => (
                    <input
                      key={i}
                      value={s}
                      onChange={e => onSliceChange(i, e.target.value)}
                      placeholder={`Fatia ${i + 1} — ex: "Mãe de 30-45 anos com filho pequeno"`}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
                    />
                  ))}
                </div>
              </div>

              {(multiplyStatus === 'idle' || multiplyStatus === 'error') && (
                <>
                  <button
                    onClick={onRunMultiply}
                    disabled={!creative.trim() || slices.every(s => !s.trim())}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                      !creative.trim() || slices.every(s => !s.trim())
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-700 hover:bg-cyan-600 text-white',
                    )}
                  >
                    <Sparkles size={14} />
                    Multiplicar para 5 Públicos
                  </button>
                  {multiplyStatus === 'error' && multiplyError && (
                    <p className="text-xs text-red-400">{multiplyError}</p>
                  )}
                </>
              )}

              {multiplyStatus === 'loading' && (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 size={18} className="animate-spin text-cyan-400" />
                  <p className="text-sm text-slate-400">Adaptando criativo para cada público…</p>
                </div>
              )}

              {multiplyStatus === 'done' && multiplyContent && (
                <>
                  <button
                    onClick={() => copyMultiply(multiplyContent)}
                    className={clsx(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all',
                      copiedMultiply
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-600 bg-surface-hover text-slate-400 hover:text-slate-200',
                    )}
                  >
                    {copiedMultiply ? <Check size={11} /> : <Copy size={11} />}
                    {copiedMultiply ? 'Copiado!' : 'Copiar criativos'}
                  </button>
                  <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3 max-h-96 overflow-y-auto">
                    <AIStreamBlock markdown={multiplyContent} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type PageState = 'idle' | 'analyzed'
type AIStatus = 'idle' | 'loading' | 'done' | 'error'

export default function AnaliseCriativosPage() {
  const [state, setState] = useState<PageState>('idle')
  const [adCount, setAdCount] = useState(0)
  const [fileName, setFileName] = useState('')
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null)
  const [combinations, setCombinations] = useState<CombinationResult | null>(null)
  const [adScores, setAdScores] = useState<AdScore[] | null>(null)
  const [ctaRec, setCtaRec] = useState<CTARecommendation | null>(null)
  const [prioritized, setPrioritized] = useState<PrioritizedCombination[] | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Stage 3 — 3 passos sequenciais
  const [s3BodyInputs,     setS3BodyInputs]     = useState<Record<string, string>>({})
  const [s3Step1Status,    setS3Step1Status]    = useState<AIStatus>('idle')
  const [s3Step1Content,   setS3Step1Content]   = useState('')
  const [s3Step1Error,     setS3Step1Error]     = useState('')
  const [s3HookInputs,     setS3HookInputs]     = useState<Record<string, string>>({})
  const [s3Step2Status,    setS3Step2Status]    = useState<AIStatus>('idle')
  const [s3Step2Content,   setS3Step2Content]   = useState('')
  const [s3Step2Error,     setS3Step2Error]     = useState('')
  const [s3Step3Status,    setS3Step3Status]    = useState<AIStatus>('idle')
  const [s3Step3Content,   setS3Step3Content]   = useState('')
  const [s3Step3Error,     setS3Step3Error]     = useState('')

  // Stage 4 — pesquisa de fatias + multiplicação
  const [s4Nicho,          setS4Nicho]          = useState('')
  const [s4ResearchStatus, setS4ResearchStatus] = useState<AIStatus>('idle')
  const [s4ResearchContent,setS4ResearchContent]= useState('')
  const [s4ResearchError,  setS4ResearchError]  = useState('')
  const [s4Creative,       setS4Creative]       = useState('')
  const [s4Slices,         setS4Slices]         = useState(['', '', '', '', ''])
  const [s4MultiplyStatus, setS4MultiplyStatus] = useState<AIStatus>('idle')
  const [s4MultiplyContent,setS4MultiplyContent]= useState('')
  const [s4MultiplyError,  setS4MultiplyError]  = useState('')

  const totalCombinations = combinations
    ? combinations.topHookTopBody.length +
      combinations.topHookForteBody.length +
      combinations.forteHookTopBody.length +
      combinations.forteHookForteBody.length
    : 0

  // -------------------------------------------------------------------------
  // File parsing
  // -------------------------------------------------------------------------

  async function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Envie um arquivo .xlsx ou .xls')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]

      let dataStartRow = 1
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i] as string[]
        if (row.some(cell => typeof cell === 'string' && cell.includes('Nome do Anúncio'))) {
          dataStartRow = i + 1
          break
        }
      }

      const parsed: AdRow[] = []
      for (let i = dataStartRow; i < rows.length; i++) {
        const row = rows[i] as unknown[]
        const name = String(row[2] ?? '').trim()
        if (!name) continue

        const toNum = (v: unknown) => {
          if (typeof v === 'number') return v
          if (typeof v === 'string') return parseFloat(v.replace(',', '.').replace('%', '')) / 100
          return 0
        }

        parsed.push({
          name,
          playRate: toNum(row[4]),
          hookRetention: toNum(row[5]),
          bodyConversion: toNum(row[6]),
          bodyRetention: toNum(row[7]),
        })
      }

      if (parsed.length === 0) {
        setError('Nenhum anúncio encontrado. Verifique se o arquivo segue o padrão correto.')
        setLoading(false)
        return
      }

      const result = runFullAnalysis(parsed)
      const combos = generateCombinations(result.hookRetention, result.bodyConversion)

      setAnalysis(result)
      setCombinations(combos)
      setAdScores(buildAdScoreTable(parsed, result))
      setCtaRec(getCtaRecommendation(parsed))
      setPrioritized(prioritizeCombinations(combos, result))
      setAdCount(parsed.length)
      setFileName(file.name)
      setState('analyzed')
    } catch (e) {
      console.error(e)
      setError('Erro ao processar o arquivo. Verifique o formato.')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const reset = () => {
    setState('idle')
    setAnalysis(null)
    setCombinations(null)
    setAdScores(null)
    setCtaRec(null)
    setPrioritized(null)
    setError(null)
    setFileName('')
    setS3BodyInputs({}); setS3Step1Status('idle'); setS3Step1Content(''); setS3Step1Error('')
    setS3HookInputs({}); setS3Step2Status('idle'); setS3Step2Content(''); setS3Step2Error('')
    setS3Step3Status('idle'); setS3Step3Content(''); setS3Step3Error('')
    setS4Nicho(''); setS4ResearchStatus('idle'); setS4ResearchContent(''); setS4ResearchError('')
    setS4Creative(''); setS4Slices(['', '', '', '', ''])
    setS4MultiplyStatus('idle'); setS4MultiplyContent(''); setS4MultiplyError('')
  }

  // -------------------------------------------------------------------------
  // AI streaming helpers
  // -------------------------------------------------------------------------

  async function streamAI(
    endpoint: string,
    body: Record<string, unknown>,
    setStatus: (s: AIStatus) => void,
    setContent: (c: string | ((prev: string) => string)) => void,
    setErrMsg: (m: string) => void,
  ) {
    setStatus('loading')
    setContent('')
    setErrMsg('')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `Erro ${res.status}`)
      }
      const reader = res.body?.getReader()
      if (!reader) throw new Error('Resposta sem body')
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (line === '[DONE]') { setStatus('done'); return }
          if (!line) continue
          try {
            const obj = JSON.parse(line)
            if (obj.error) throw new Error(obj.error)
            if (obj.text) setContent((prev: string) => prev + obj.text)
          } catch {
            // linha malformada — ignora
          }
        }
      }
      setStatus('done')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      setErrMsg(msg)
      setStatus('error')
    }
  }

  // Stage 3 runners
  function runS3Step1() {
    const bodyCopy = Object.values(s3BodyInputs).filter(v => v.trim()).join('\n---\n')
    streamAI('/api/ai/stage3', { step: 1, bodyCopy },
      setS3Step1Status, setS3Step1Content, setS3Step1Error)
  }
  function runS3Step2() {
    const hookCopy = Object.values(s3HookInputs).filter(v => v.trim()).join('\n---\n')
    streamAI('/api/ai/stage3', { step: 2, hookCopy },
      setS3Step2Status, setS3Step2Content, setS3Step2Error)
  }
  function runS3Step3() {
    const bodyCopy = Object.values(s3BodyInputs).filter(v => v.trim()).join('\n---\n')
    const hookCopy = Object.values(s3HookInputs).filter(v => v.trim()).join('\n---\n')
    streamAI('/api/ai/stage3', {
      step: 3,
      bodiesOutput: s3Step1Content || bodyCopy,
      hooksOutput:  s3Step2Content || hookCopy,
    }, setS3Step3Status, setS3Step3Content, setS3Step3Error)
  }

  // Stage 4 runners
  function runS4Research() {
    streamAI('/api/ai/stage4', { mode: 'research', nicho: s4Nicho },
      setS4ResearchStatus, setS4ResearchContent, setS4ResearchError)
  }
  function runS4Multiply() {
    streamAI('/api/ai/stage4', { mode: 'multiply', creative: s4Creative, slices: s4Slices },
      setS4MultiplyStatus, setS4MultiplyContent, setS4MultiplyError)
  }

  const clipboardAll = analysis ? formatAnalysisForClipboard(analysis) : ''
  const clipboardCombos = combinations ? formatCombinationsForClipboard(combinations) : ''

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                               */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-10 bg-surface-card/90 backdrop-blur border-b border-surface-border px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">

          {/* Back to dashboard */}
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors border border-slate-700 hover:border-slate-600 px-2.5 py-1.5 rounded-lg shrink-0"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Painel</span>
          </Link>

          <div className="w-px h-5 bg-slate-700 shrink-0" />

          {/* Title */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Layers size={13} className="text-purple-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-slate-100 font-bold text-sm leading-tight">Análise de Criativos</h1>
              <p className="text-slate-500 text-[11px] hidden sm:block">Classificação matemática + Stage 3 & 4 com IA</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {state === 'analyzed' && (
              <>
                <CopyButton text={clipboardAll} label="Copiar análise" />
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
                >
                  <RefreshCw size={12} />
                  <span className="hidden sm:inline">Nova análise</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">

        {/* ------------------------------------------------------------------ */}
        {/* IDLE — Upload                                                        */}
        {/* ------------------------------------------------------------------ */}
        {state === 'idle' && (
          <div className="max-w-xl mx-auto space-y-4">

            {/* Steps */}
            <div className="card p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Como funciona</p>
              <div className="space-y-3">
                {[
                  { n: '1', text: 'Exporte a planilha no padrão', highlight: 'Agente — Padrão para mandar dados' },
                  { n: '2', text: 'Faça o upload do arquivo', highlight: '.xlsx abaixo' },
                  { n: '3', text: 'Copie o resultado e cole no chat com seu agente de IA', highlight: null },
                ].map(step => (
                  <div key={step.n} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step.n}
                    </span>
                    <p className="text-sm text-slate-400">
                      {step.text}{' '}
                      {step.highlight && <span className="text-slate-300 font-medium">{step.highlight}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={clsx(
                'flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all min-h-[200px] select-none',
                dragOver
                  ? 'border-purple-400 bg-purple-400/10 scale-[1.01]'
                  : 'border-slate-700 bg-surface-hover hover:border-slate-500 hover:bg-slate-800/60',
              )}
            >
              {loading ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center animate-pulse">
                    <FileSpreadsheet size={22} className="text-purple-400" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">Processando…</p>
                </>
              ) : (
                <>
                  <div className={clsx(
                    'w-14 h-14 rounded-2xl flex items-center justify-center transition-all',
                    dragOver
                      ? 'bg-purple-500/20 border-2 border-purple-500/40 scale-110'
                      : 'bg-slate-800 border border-slate-600',
                  )}>
                    <FileSpreadsheet size={24} className={dragOver ? 'text-purple-400' : 'text-slate-400'} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-300">
                      {dragOver ? 'Solte para analisar' : 'Arraste o arquivo aqui'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">ou clique para selecionar · .xlsx / .xls</p>
                  </div>
                </>
              )}
              <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleChange} className="hidden" />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* ANALYZED — Results                                                   */}
        {/* ------------------------------------------------------------------ */}
        {state === 'analyzed' && analysis && combinations && adScores && (
          <>
            {/* Summary strip */}
            <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-surface-card border border-surface-border">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={13} className="text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{fileName}</p>
                  <p className="text-[11px] text-slate-500">{adCount} anúncios · {totalCombinations} combinações geradas</p>
                </div>
              </div>
              {/* Per-tier totals across all metrics */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { label: 'TOP',    count: [analysis.playRate, analysis.hookRetention, analysis.bodyRetention, analysis.bodyConversion].reduce((s, a) => s + a.top.length, 0),    cls: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/25' },
                  { label: 'FORTES', count: [analysis.playRate, analysis.hookRetention, analysis.bodyRetention, analysis.bodyConversion].reduce((s, a) => s + a.fortes.length, 0), cls: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25' },
                  { label: 'MÉDIOS', count: [analysis.playRate, analysis.hookRetention, analysis.bodyRetention, analysis.bodyConversion].reduce((s, a) => s + a.medios.length, 0), cls: 'bg-blue-400/10 text-blue-300 border-blue-400/25' },
                ].map(t => (
                  <span key={t.label} className={clsx('text-[10px] font-bold px-2 py-0.5 rounded border', t.cls)}>
                    {t.count} {t.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Visão Geral */}
            <OverviewTable scores={adScores} />

            {/* 2-column metric grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MetricSection
                icon={TrendingUp}
                iconColor="text-sky-400"
                iconBg="bg-sky-500/15 border border-sky-500/30"
                title="Play Rate do Hook"
                subtitle="Capacidade de iniciar a reprodução · quebra ≥ 4×"
                analysis={analysis.playRate}
                copyText={buildCopyText('PLAY RATE DO HOOK', analysis.playRate)}
              />
              <MetricSection
                icon={Activity}
                iconColor="text-emerald-400"
                iconBg="bg-emerald-500/15 border border-emerald-500/30"
                title="Retenção do Hook"
                subtitle="Retenção nos primeiros segundos · quebra ≥ 6×"
                analysis={analysis.hookRetention}
                copyText={buildCopyText('RETENÇÃO DO HOOK', analysis.hookRetention)}
              />
              <MetricSection
                icon={Star}
                iconColor="text-purple-400"
                iconBg="bg-purple-500/15 border border-purple-500/30"
                title="Retenção do Body"
                subtitle="Retenção no corpo do vídeo · faixas 30% / 40%"
                analysis={analysis.bodyRetention}
                copyText={buildCopyText('RETENÇÃO DO BODY', analysis.bodyRetention)}
              />
              <MetricSection
                icon={ShoppingCart}
                iconColor="text-yellow-400"
                iconBg="bg-yellow-500/15 border border-yellow-500/30"
                title="Conversão do Body"
                subtitle="Taxa de conversão no corpo · quebra ≥ 3×"
                analysis={analysis.bodyConversion}
                copyText={buildCopyText('CONVERSÃO DO BODY', analysis.bodyConversion)}
              />
            </div>

            {/* CTA Recomendada */}
            {ctaRec && <CTACard rec={ctaRec} />}

            {/* Combination matrix */}
            {totalCombinations === 0 ? (
              <div className="card px-4 py-10 text-center">
                <p className="text-sm text-slate-500">
                  Sem combinações. Verifique se há itens TOP / FORTES nas métricas de Hook e Body.
                </p>
              </div>
            ) : (
              <CombinationsSection combinations={combinations} clipboardAll={clipboardCombos} />
            )}

            {/* Stage 2 — Prioridade Cruzada */}
            {prioritized && prioritized.length > 0 && (
              <Stage2Section items={prioritized} />
            )}

            {/* AI divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/5">
                <Bot size={12} className="text-violet-400" />
                <span className="text-[11px] font-semibold text-violet-400">Análise com IA</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            </div>

            {/* Stage 3 — Bater controle de Body + Hook */}
            <Stage3Section
              topBodyNames={analysis.bodyConversion.top.map(i => i.name)}
              forteBodyNames={analysis.bodyConversion.fortes.map(i => i.name)}
              topHookNames={analysis.hookRetention.top.map(i => i.name)}
              forteHookNames={analysis.hookRetention.fortes.map(i => i.name)}
              bodyInputs={s3BodyInputs}
              onBodyInputChange={(name, v) => setS3BodyInputs(prev => ({ ...prev, [name]: v }))}
              step1Status={s3Step1Status}   step1Content={s3Step1Content}  step1Error={s3Step1Error}  onRunStep1={runS3Step1}
              hookInputs={s3HookInputs}
              onHookInputChange={(name, v) => setS3HookInputs(prev => ({ ...prev, [name]: v }))}
              step2Status={s3Step2Status}   step2Content={s3Step2Content}  step2Error={s3Step2Error}  onRunStep2={runS3Step2}
              step3Status={s3Step3Status}   step3Content={s3Step3Content}  step3Error={s3Step3Error}  onRunStep3={runS3Step3}
            />

            {/* Stage 4 — Fatias de público */}
            <Stage4Section
              nicho={s4Nicho}              onNichoChange={setS4Nicho}
              researchStatus={s4ResearchStatus} researchContent={s4ResearchContent} researchError={s4ResearchError} onRunResearch={runS4Research}
              creative={s4Creative}        onCreativeChange={setS4Creative}
              slices={s4Slices}            onSliceChange={(idx, v) => setS4Slices(prev => { const n = [...prev]; n[idx] = v; return n })}
              multiplyStatus={s4MultiplyStatus} multiplyContent={s4MultiplyContent} multiplyError={s4MultiplyError} onRunMultiply={runS4Multiply}
            />
          </>
        )}
      </div>
    </div>
  )
}
