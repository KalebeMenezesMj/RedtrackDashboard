'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { TooltipShell, TooltipRow } from './ChartTooltip'
import { formatCurrency } from '@/lib/format'
import type { ChartDataPoint } from '@/lib/types'

interface Props {
  data:    ChartDataPoint[]
  loading: boolean
}

function formatDate(d: string) {
  const parts = d.split('-')
  if (parts.length < 3) return d
  return `${parts[2]}/${parts[1]}`
}
function formatYAxis(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1000)      return `$${(v / 1000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

type TooltipPayloadItem = { dataKey: string; value: number }
const CustomTooltip = ({
  active, payload, label,
}: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) => {
  if (!active || !payload?.length) return null
  const spend   = Number(payload.find(p => p.dataKey === 'spend')?.value   ?? 0)
  const revenue = Number(payload.find(p => p.dataKey === 'revenue')?.value ?? 0)
  const profit  = revenue - spend
  return (
    <TooltipShell title={formatDate(label as string)}>
      <TooltipRow color="#60a5fa" label="Gasto"    value={formatCurrency(spend)} />
      <TooltipRow color="#34d399" label="Receita"  value={formatCurrency(revenue)} emphasis="positive" />
      <TooltipRow
        divider
        label={profit >= 0 ? '▲ Lucro' : '▼ Prejuízo'}
        value={formatCurrency(profit)}
        emphasis={profit >= 0 ? 'positive' : 'negative'}
      />
    </TooltipShell>
  )
}

export default function SpendRevenueChart({ data, loading }: Props) {
  if (loading) return <div className="skeleton h-64 w-full rounded-xl" />

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
            <p className="section-label mb-2">Gasto</p>
            <p className="text-blue-400 font-extrabold text-3xl tabular-nums">{formatCurrency(d.spend)}</p>
          </div>
          <div className="w-px bg-surface-border" />
          <div className="text-center">
            <p className="section-label mb-2">Receita</p>
            <p className="gradient-text-emerald text-3xl tabular-nums">{formatCurrency(d.revenue)}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        Sem dados para o período selecionado
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 14, left: 0, bottom: 0 }} barGap={3} barCategoryGap="28%">
        <defs>
          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#60a5fa" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.55} />
          </linearGradient>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#34d399" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#047857" stopOpacity={0.55} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="2 6" stroke="#1e3050" strokeOpacity={0.5} vertical={false} />

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
          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatYAxis}
          width={50}
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(99,102,241,0.05)', radius: 6 }}
        />

        <Bar dataKey="spend"   name="Gasto"   fill="url(#spendGrad)"   radius={[5, 5, 0, 0]} maxBarSize={22} />
        <Bar dataKey="revenue" name="Receita" fill="url(#revenueGrad)" radius={[5, 5, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  )
}
