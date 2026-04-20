'use client'

import { Info } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  title:     string
  text:      string
  align?:    'left' | 'right'
  position?: 'top' | 'bottom'
}

export default function InfoTooltip({
  title, text, align = 'left', position = 'top',
}: Props) {
  const isBottom = position === 'bottom'
  const isRight  = align === 'right'

  return (
    <span className="relative group inline-flex items-center ml-1.5">
      <Info
        size={12}
        className="text-slate-500 group-hover:text-brand-300 transition-colors duration-150 cursor-help"
        strokeWidth={2.5}
      />

      <div
        className={clsx(
          'pointer-events-none absolute z-[60] w-64',
          'rounded-xl px-3.5 py-3',
          'border border-brand-500/25 bg-surface-card2/95 backdrop-blur-xl',
          'opacity-0 group-hover:opacity-100',
          isBottom ? 'translate-y-1' : '-translate-y-1',
          isBottom ? 'group-hover:translate-y-0' : 'group-hover:-translate-y-0',
          'transition-all duration-200',
        )}
        style={{
          ...(isBottom ? { top: 'calc(100% + 8px)' } : { bottom: 'calc(100% + 8px)' }),
          ...(isRight  ? { right: 0 }                : { left: 0 }),
          boxShadow: '0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <p className="text-[10px] font-bold text-brand-300 uppercase tracking-[0.12em] mb-1.5">
          {title}
        </p>
        <p className="text-[11px] text-slate-300 leading-relaxed">{text}</p>

        {/* Arrow */}
        <div
          className="absolute w-3 h-3 rotate-45 border bg-surface-card2/95"
          style={{
            ...(isBottom
              ? { bottom: '100%', borderRight: 'none', borderBottom: 'none', marginBottom: '-6px' }
              : { top:    '100%', borderTop:  'none', borderLeft:   'none', marginTop:    '-6px' }),
            ...(isRight ? { right: '12px' } : { left: '12px' }),
            borderColor: 'rgba(99,102,241,0.25)',
          }}
        />
      </div>
    </span>
  )
}
