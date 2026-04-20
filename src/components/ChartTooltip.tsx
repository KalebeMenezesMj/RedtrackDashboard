'use client'

/**
 * Shared Chart Tooltip primitives.
 * Use these to keep all Recharts tooltips visually consistent with the app theme.
 */

import clsx from 'clsx'

interface TooltipShellProps {
  title: string
  children: React.ReactNode
}

export function TooltipShell({ title, children }: TooltipShellProps) {
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{title}</p>
      {children}
    </div>
  )
}

interface TooltipRowProps {
  color?: string           // dot color (hex or tailwind var)
  label: string
  value: string
  emphasis?: 'default' | 'positive' | 'negative' | 'brand'
  divider?: boolean        // show a thin top divider before this row (for summaries)
}

export function TooltipRow({ color, label, value, emphasis = 'default', divider }: TooltipRowProps) {
  return (
    <>
      {divider && (
        <div className="h-px my-2" style={{ background: 'rgba(99,102,241,0.15)' }} />
      )}
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-label">
          {color && <span className="chart-tooltip-dot" style={{ background: color }} />}
          {label}
        </span>
        <span
          className={clsx(
            'chart-tooltip-value',
            emphasis === 'positive' && 'text-emerald-400',
            emphasis === 'negative' && 'text-rose-400',
            emphasis === 'brand'    && 'text-brand-300',
          )}
        >
          {value}
        </span>
      </div>
    </>
  )
}
