'use client'

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'

/* ────────────────────────────────────────────────────────────────────────── */

interface Props {
  title:     string
  value:     string
  delta?:    string
  positive?: boolean
  icon:      LucideIcon
  color:     'blue' | 'emerald' | 'violet' | 'amber' | 'red' | 'cyan'
  loading?:  boolean
  tooltip?:  string
}

// Color map: only semantic values — no glow, no gradient, no bloom.
// Icon color + bg tint is enough to distinguish metric categories.
const colorMap = {
  blue:    { icon: 'text-blue-400',    bg: 'bg-blue-500/8',    border: 'border-blue-500/15' },
  emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15' },
  violet:  { icon: 'text-violet-400',  bg: 'bg-violet-500/8',  border: 'border-violet-500/15' },
  amber:   { icon: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/15' },
  red:     { icon: 'text-rose-400',    bg: 'bg-rose-500/8',    border: 'border-rose-500/15' },
  cyan:    { icon: 'text-cyan-400',    bg: 'bg-cyan-500/8',    border: 'border-cyan-500/15' },
}

/* ────────────────────────────────────────────────────────────────────────── */

export default function KPICard({
  title, value, delta, positive, icon: Icon, color, loading, tooltip,
}: Props) {
  const c = colorMap[color]

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="kpi-card gap-0">
        <div className="flex items-center justify-between mb-4">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton h-5 w-14 rounded-lg" />
        </div>
        <div className="skeleton h-3 w-20 rounded mb-3" />
        <div className="skeleton h-8 w-28 rounded-lg mb-1" />
      </div>
    )
  }

  /* ── Delta indicator ──────────────────────────────────────────────────── */
  const DeltaIcon = positive === undefined ? Minus : positive ? TrendingUp : TrendingDown
  const deltaClasses = clsx(
    'inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-lg border tabular-nums',
    positive === undefined && 'bg-surface-raised border-surface-muted text-slate-500',
    positive === true      && 'bg-emerald-500/8 border-emerald-500/18 text-emerald-400',
    positive === false     && 'bg-rose-500/8 border-rose-500/18 text-rose-400',
  )

  /* ── Card ─────────────────────────────────────────────────────────────── */
  return (
    // Standard card border — no per-color border, keeps the grid uniform
    <div className="kpi-card group">

      {/* Row 1: Icon + Delta */}
      <div className="flex items-start justify-between mb-4">

        {/* Icon — flat tinted square, no glow ring, no shadow */}
        <div className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
          c.bg, c.border,
        )}>
          <Icon size={17} className={c.icon} strokeWidth={2} />
        </div>

        {/* Delta chip */}
        {delta && (
          <span className={deltaClasses}>
            <DeltaIcon size={10} strokeWidth={2.5} />
            <span className="leading-none">{delta.replace(/^[▲▼]\s?/, '')}</span>
          </span>
        )}
      </div>

      {/* Label */}
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-500 mb-1.5">
        {title}
      </p>

      {/* Value */}
      <p className="text-[1.85rem] font-bold text-slate-50 leading-none tabular-nums tracking-tight break-all">
        {value}
      </p>

      {/* Tooltip — appears on hover, clean card style */}
      {tooltip && (
        <div className={clsx(
          'pointer-events-none absolute bottom-full left-0 mb-2 z-50',
          'w-60 rounded-xl px-4 py-3',
          'border border-surface-muted bg-surface-card2',
          'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0',
          'transition-all duration-150',
          'shadow-card-raised',
        )}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className={clsx('w-4 h-4 rounded-md flex items-center justify-center border shrink-0', c.bg, c.border)}>
              <Icon size={9} className={c.icon} strokeWidth={2.5} />
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.08em]">{title}</p>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{tooltip}</p>
          {/* Arrow */}
          <div className="absolute top-full left-5 border-[5px] border-transparent border-t-surface-muted" />
        </div>
      )}
    </div>
  )
}
