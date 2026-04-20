'use client'

import { useState } from 'react'
import { Calendar, ChevronDown, Check, Clock } from 'lucide-react'
import clsx from 'clsx'
import type { DateRange } from '@/lib/types'

interface Props {
  value:    DateRange
  onChange: (range: DateRange) => void
}

const PRESETS = [
  { label: 'Hoje',            days: 0,  sub: 'O dia de hoje'        },
  { label: 'Últimos 7 dias',  days: 7,  sub: 'Semana anterior'      },
  { label: 'Últimos 30 dias', days: 30, sub: 'Recomendado'          },
  { label: 'Últimos 90 dias', days: 90, sub: 'Trimestre'            },
]

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}
function subDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() - n)
  return c
}
function fmtDisplay(s: string): string {
  try {
    const d = new Date(s + 'T12:00:00')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch { return s }
}
function daysBetween(from: string, to: string): number {
  try {
    const a = new Date(from + 'T00:00:00')
    const b = new Date(to   + 'T00:00:00')
    return Math.round((+b - +a) / 86400000) + 1
  } catch { return 0 }
}

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const today = formatDate(new Date())

  const applyPreset = (days: number) => {
    const to   = today
    const from = days === 0 ? to : formatDate(subDays(new Date(), days))
    onChange({ from, to })
    setOpen(false)
  }

  const activePreset = PRESETS.find(p => {
    const to   = today
    const from = p.days === 0 ? to : formatDate(subDays(new Date(), p.days))
    return value.from === from && value.to === to
  })

  const totalDays = daysBetween(value.from, value.to)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'group inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold',
          'bg-surface-card border border-surface-border text-slate-200',
          'hover:border-brand-500/40 hover:bg-surface-hover hover:text-white transition-all duration-150',
          open && 'border-brand-500/50 bg-surface-hover text-white',
        )}
      >
        <Calendar size={13} className="text-brand-300" strokeWidth={2.5} />
        <span className="tabular-nums">{fmtDisplay(value.from)}</span>
        <span className="text-slate-500">→</span>
        <span className="tabular-nums">{fmtDisplay(value.to)}</span>
        <span className="hidden sm:inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 text-[10px] font-bold text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-md">
          {totalDays}d
        </span>
        <ChevronDown
          size={12}
          className={clsx(
            'text-slate-500 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 w-72 z-50 animate-scale-in
                       rounded-xl border border-surface-muted bg-surface-card2 overflow-hidden shadow-card-raised"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-surface-border/60 flex items-center gap-2">
              <Clock size={12} className="text-brand-300" />
              <p className="section-label">Selecionar Período</p>
            </div>

            {/* Presets */}
            <div className="p-2">
              {PRESETS.map(p => {
                const isActive = activePreset?.days === p.days
                return (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.days)}
                    className={clsx(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm',
                      'transition-all duration-150 group',
                      isActive
                        ? 'bg-brand-500/15 text-white font-semibold border border-brand-500/30'
                        : 'text-slate-300 hover:bg-surface-hover hover:text-white border border-transparent',
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{p.label}</span>
                      <span className={clsx(
                        'text-[10px] font-medium',
                        isActive ? 'text-brand-300' : 'text-slate-500',
                      )}>
                        {p.sub}
                      </span>
                    </div>
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-brand-500/30 flex items-center justify-center">
                        <Check size={11} className="text-brand-200" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Custom */}
            <div className="border-t border-surface-border/60 p-3 space-y-2.5">
              <p className="section-label px-0.5">Período Personalizado</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-slate-500 mb-1 px-0.5 font-semibold uppercase tracking-wider">De</p>
                  <input
                    type="date"
                    value={value.from}
                    max={value.to}
                    onChange={e => onChange({ ...value, from: e.target.value })}
                    className="input text-xs py-1.5"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1 px-0.5 font-semibold uppercase tracking-wider">Até</p>
                  <input
                    type="date"
                    value={value.to}
                    min={value.from}
                    max={today}
                    onChange={e => onChange({ ...value, to: e.target.value })}
                    className="input text-xs py-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-surface-border/60 px-4 py-2.5 bg-surface-sunken/60">
              <p className="text-[10px] text-slate-500 font-medium text-center">
                <span className="text-brand-300 font-bold">{totalDays}</span> {totalDays === 1 ? 'dia selecionado' : 'dias selecionados'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
