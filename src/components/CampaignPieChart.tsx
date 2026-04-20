'use client'

import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from 'recharts'
import { TooltipShell, TooltipRow } from './ChartTooltip'
import { formatCurrency } from '@/lib/format'
import type { CampaignRow } from '@/lib/types'

interface Props {
  campaigns: CampaignRow[]
  loading:   boolean
  metric?:   'revenue' | 'cost'
}

/* ── Palette (visually distinct; good for colorblind users) ───────────────── */
const COLORS = [
  '#818cf8', // indigo
  '#34d399', // emerald
  '#60a5fa', // blue
  '#fbbf24', // amber
  '#f472b6', // pink
  '#22d3ee', // cyan
  '#a78bfa', // violet
  '#fb923c', // orange
  '#a3e635', // lime
  '#fb7185', // rose
]

/* ── Tooltip ──────────────────────────────────────────────────────────────── */
interface PieTooltipPayload {
  name: string
  value: number
  payload: { metric: string; share: string }
}
const CustomTooltip = ({
  active, payload,
}: { active?: boolean; payload?: PieTooltipPayload[] }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <TooltipShell title={d.name}>
      <TooltipRow
        label={d.payload.metric === 'cost' ? 'Gasto' : 'Receita'}
        value={formatCurrency(Number(d.value))}
        emphasis={d.payload.metric === 'cost' ? 'default' : 'positive'}
      />
      <TooltipRow
        divider
        label="Participação"
        value={`${d.payload.share}%`}
        emphasis="brand"
      />
    </TooltipShell>
  )
}

/* ── Inner label ──────────────────────────────────────────────────────────── */
interface CustomLabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}
const CustomLabel = (props: CustomLabelProps) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
  if (percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.58
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={800}
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

/* ── Component ────────────────────────────────────────────────────────────── */
export default function CampaignPieChart({ campaigns, loading, metric }: Props) {
  if (loading) return <div className="skeleton h-72 w-full rounded-xl" />

  const hasRevenue   = campaigns.some(c => c.revenue > 0)
  const activeMetric = metric ?? (hasRevenue ? 'revenue' : 'cost')
  const getValue     = (c: CampaignRow) => activeMetric === 'revenue' ? c.revenue : c.cost

  const total = campaigns.reduce((s, c) => s + getValue(c), 0)
  const data  = campaigns
    .filter(c => getValue(c) > 0)
    .sort((a, b) => getValue(b) - getValue(a))
    .slice(0, 8)
    .map(c => ({
      name:   c.name.length > 28 ? c.name.slice(0, 26) + '…' : c.name,
      value:  getValue(c),
      share:  total ? ((getValue(c) / total) * 100).toFixed(1) : '0',
      metric: activeMetric,
    }))

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        Sem dados disponíveis
      </div>
    )
  }

  const isFew  = data.length <= 2
  const innerR = isFew ? 48 : 58
  const outerR = isFew ? 78 : 92

  return (
    <div className="flex flex-col gap-4">
      {/* Ring + center label */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerR}
              outerRadius={outerR}
              paddingAngle={data.length === 1 ? 0 : 3}
              dataKey="value"
              labelLine={false}
              label={CustomLabel as unknown as React.FC}
              strokeWidth={2}
              stroke="#0d1526"
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  opacity={0.92}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label (total) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.14em]">
            Total
          </p>
          <p className="text-sm font-extrabold text-slate-100 tabular-nums mt-0.5">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      {/* Legend — ranked list with bars */}
      <div className="space-y-1">
        {data.map((d, i) => {
          const color = COLORS[i % COLORS.length]
          const width = Math.max(4, (Number(d.share) / Number(data[0].share)) * 100)
          return (
            <div
              key={i}
              className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-hover/60 transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 ring-2 ring-surface-card"
                style={{ background: color, boxShadow: `0 0 8px ${color}55` }}
              />
              <span className="text-[11px] text-slate-300 font-medium flex-1 truncate min-w-0">
                {d.name}
              </span>
              {/* Mini bar */}
              <div className="hidden sm:block relative w-14 h-1 bg-surface-border rounded-full overflow-hidden shrink-0">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ width: `${width}%`, background: color, opacity: 0.6 }}
                />
              </div>
              <span className="text-[11px] text-slate-400 font-bold tabular-nums shrink-0 w-10 text-right">
                {d.share}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
