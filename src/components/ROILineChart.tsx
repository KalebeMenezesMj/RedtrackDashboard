'use client'

import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { TooltipShell, TooltipRow } from './ChartTooltip'
import { Sparkles } from 'lucide-react'
import type { ChartDataPoint } from '@/lib/types'

interface Props {
  data:    ChartDataPoint[]
  loading: boolean
}

/* ── Date helpers ─────────────────────────────────────────────────────────── */
function formatDate(d: string) {
  const parts = d.split('-')
  if (parts.length < 3) return d
  return `${parts[2]}/${parts[1]}`
}
function formatCurr(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1000)      return `$${(v / 1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

/* ── Tooltip ──────────────────────────────────────────────────────────────── */
type TooltipPayloadItem = { dataKey: string; value: number; name: string }
const CustomTooltip = ({
  active, payload, label,
}: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) => {
  if (!active || !payload?.length) return null
  const profit = payload.find(p => p.dataKey === 'profit')?.value ?? 0
  const roi    = payload.find(p => p.dataKey === 'roi')?.value    ?? 0
  return (
    <TooltipShell title={formatDate(label as string)}>
      <TooltipRow
        color="#10b981"
        label="Lucro"
        value={`${profit >= 0 ? '' : '−'}$${Math.abs(profit).toFixed(2)}`}
        emphasis={profit >= 0 ? 'positive' : 'negative'}
      />
      <TooltipRow
        color="#818cf8"
        label="ROI"
        value={`${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`}
        emphasis={roi >= 0 ? 'brand' : 'negative'}
      />
    </TooltipShell>
  )
}

/* ── Component ────────────────────────────────────────────────────────────── */
export default function ROILineChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="h-64 w-full rounded-xl relative overflow-hidden skeleton">
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles size={20} className="text-brand-400/40 animate-pulse-slow" />
        </div>
      </div>
    )
  }

  /* Single data point: show a centered stat view */
  if (data.length === 1) {
    const d = data[0]
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-5 text-center">
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Apenas 1 dia de dados no período
        </div>
        <div className="flex gap-10">
          <div className="text-center">
            <p className="section-label mb-2">Lucro</p>
            <p className={`gradient-text-${d.profit >= 0 ? 'emerald' : 'rose'} text-3xl tabular-nums`}>
              {d.profit >= 0 ? '' : '−'}${Math.abs(d.profit).toFixed(2)}
            </p>
          </div>
          <div className="w-px bg-surface-border" />
          <div className="text-center">
            <p className="section-label mb-2">ROI</p>
            <p className={`gradient-text-${d.roi >= 0 ? 'brand' : 'amber'} text-3xl tabular-nums`}>
              {d.roi >= 0 ? '+' : ''}{d.roi.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (data.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        Sem dados para o período selecionado
      </div>
    )
  }

  const showDots = data.length <= 14

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
        <defs>
          {/* Gradient fill for the profit area */}
          <linearGradient id="profitArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0}    />
          </linearGradient>
          {/* Gradient stroke for the ROI line */}
          <linearGradient id="roiStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="profitStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#10b981" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="2 6"
          stroke="#1e3050"
          strokeOpacity={0.5}
          vertical={false}
        />

        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
          axisLine={{ stroke: '#1e3050' }}
          tickLine={false}
          dy={6}
          minTickGap={28}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v.toFixed(0)}%`}
          width={42}
        />
        <YAxis
          yAxisId="usd"
          orientation="left"
          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatCurr}
          width={50}
        />

        <ReferenceLine
          yAxisId="pct"
          y={0}
          stroke="#334463"
          strokeDasharray="4 4"
          strokeWidth={1}
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: 'rgba(99,102,241,0.35)', strokeWidth: 1, strokeDasharray: '4 4' }}
        />

        {/* Profit area (shaded) */}
        <Area
          yAxisId="usd"
          type="monotone"
          dataKey="profit"
          name="Lucro"
          stroke="none"
          fill="url(#profitArea)"
          isAnimationActive
        />

        {/* Profit line */}
        <Line
          yAxisId="usd"
          type="monotone"
          dataKey="profit"
          name="Lucro"
          stroke="url(#profitStroke)"
          strokeWidth={2.5}
          dot={showDots ? { r: 3.5, fill: '#10b981', strokeWidth: 0 } : false}
          activeDot={{ r: 6, fill: '#10b981', strokeWidth: 3, stroke: '#0d1526' }}
          isAnimationActive
        />

        {/* ROI line */}
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="roi"
          name="ROI"
          stroke="url(#roiStroke)"
          strokeWidth={2.5}
          dot={showDots ? { r: 3.5, fill: '#818cf8', strokeWidth: 0 } : false}
          activeDot={{ r: 6, fill: '#818cf8', strokeWidth: 3, stroke: '#0d1526' }}
          isAnimationActive
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
