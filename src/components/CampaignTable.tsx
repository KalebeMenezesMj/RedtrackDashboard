'use client'

import { useState, useMemo } from 'react'
import {
  ArrowUpDown, ArrowUp, ArrowDown, Search,
  ChevronRight, Inbox, X,
} from 'lucide-react'
import clsx from 'clsx'
import { formatCurrency, formatPercent, formatNumber, profitColor } from '@/lib/format'
import type { CampaignRow, SortField, SortDir } from '@/lib/types'

interface Props {
  campaigns: CampaignRow[]
  loading:   boolean
  onSelect?: (campaign: CampaignRow) => void
}

interface Column {
  key:    SortField
  label:  string
  align:  'left' | 'right'
  width?: string
  render: (row: CampaignRow) => React.ReactNode
}

/* ── Columns ──────────────────────────────────────────────────────────────── */
const COLUMNS: Column[] = [
  {
    key: 'name', label: 'Campanha', align: 'left',
    render: r => (
      <div className="flex flex-col min-w-0 gap-0.5 max-w-[360px]">
        <span className="font-semibold text-slate-100 text-sm leading-tight line-clamp-1">
          {r.name}
        </span>
        <span className="text-[10px] text-slate-500 font-mono truncate">
          ID: {r.id.slice(0, 12)}…
        </span>
      </div>
    ),
  },
  {
    key: 'clicks', label: 'Cliques', align: 'right',
    render: r => <span className="tabular-nums text-slate-300 font-medium">{formatNumber(r.clicks)}</span>,
  },
  {
    key: 'conversions', label: 'Conv.', align: 'right',
    render: r => <span className="tabular-nums text-slate-300 font-medium">{formatNumber(r.conversions)}</span>,
  },
  {
    key: 'purchases', label: 'Compras', align: 'right',
    render: r => (
      <span className="tabular-nums text-emerald-400 font-bold">
        {formatNumber(r.purchases)}
      </span>
    ),
  },
  {
    key: 'initiateCheckouts', label: 'Checkout', align: 'right',
    render: r => <span className="tabular-nums text-blue-300 font-medium">{formatNumber(r.initiateCheckouts)}</span>,
  },
  {
    key: 'cr', label: 'CR%', align: 'right',
    render: r => (
      <span className={clsx(
        'tabular-nums text-xs font-semibold',
        r.cr >= 5 ? 'text-emerald-400' : r.cr >= 2 ? 'text-amber-400' : 'text-slate-400',
      )}>
        {r.cr.toFixed(2)}%
      </span>
    ),
  },
  {
    key: 'cost', label: 'Gasto', align: 'right',
    render: r => <span className="tabular-nums text-slate-300 font-medium">{formatCurrency(r.cost)}</span>,
  },
  {
    key: 'revenue', label: 'Receita', align: 'right',
    render: r => (
      <span className="tabular-nums text-emerald-400 font-bold">
        {formatCurrency(r.revenue)}
      </span>
    ),
  },
  {
    key: 'profit', label: 'Lucro', align: 'right',
    render: r => (
      <span className={clsx('tabular-nums font-bold', profitColor(r.profit))}>
        {formatCurrency(r.profit)}
      </span>
    ),
  },
  {
    key: 'cpa', label: 'CPA', align: 'right',
    render: r => r.conversions > 0
      ? <span className="tabular-nums text-slate-300 font-medium">{formatCurrency(r.cpa)}</span>
      : <span className="text-slate-600">—</span>,
  },
  {
    key: 'roi', label: 'ROI', align: 'right',
    render: r => <RoiChip roi={r.roi} />,
  },
]

/* ── ROI chip ─────────────────────────────────────────────────────────────── */
function RoiChip({ roi }: { roi: number }) {
  const tier =
    roi >= 100 ? 'gold' :
    roi >= 50  ? 'high' :
    roi >= 0   ? 'ok'   :
    roi >= -50 ? 'low'  : 'bad'

  const styles = {
    gold: 'bg-amber-500/15  text-amber-300   border-amber-500/30',
    high: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    ok:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    low:  'bg-rose-500/10    text-rose-400    border-rose-500/25',
    bad:  'bg-rose-500/15    text-rose-300    border-rose-500/30',
  }[tier]

  return (
    <span className={clsx('badge tabular-nums', styles)}>
      {formatPercent(roi)}
    </span>
  )
}

/* ── Skeleton rows ────────────────────────────────────────────────────────── */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => (
        <tr key={i} className="border-b border-surface-border/40">
          <td className="table-cell">
            <div className="flex flex-col gap-1.5">
              <div className="skeleton h-4 rounded-lg w-52" />
              <div className="skeleton h-2.5 rounded-md w-24" />
            </div>
          </td>
          {COLUMNS.slice(1).map(c => (
            <td key={c.key} className="table-cell text-right">
              <div className="skeleton h-4 rounded-lg w-16 ml-auto" />
            </td>
          ))}
          <td className="w-8" />
        </tr>
      ))}
    </>
  )
}

/* ── Table ────────────────────────────────────────────────────────────────── */
export default function CampaignTable({ campaigns, loading, onSelect }: Props) {
  const [sortField, setSortField] = useState<SortField>('revenue')
  const [sortDir,   setSortDir]   = useState<SortDir>('desc')
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)
  const PAGE_SIZE = 10

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return campaigns.filter(c => !q || c.name.toLowerCase().includes(q))
  }, [campaigns, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortField] as number | string
      const bv = b[sortField] as number | string
      const dir = sortDir === 'asc' ? 1 : -1
      if (typeof av === 'string') return av.localeCompare(bv as string) * dir
      return ((av as number) - (bv as number)) * dir
    })
  }, [filtered, sortField, sortDir])

  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))

  const SortIcon = ({ field }: { field: SortField }) => {
    if (field !== sortField) return <ArrowUpDown size={10} className="ml-1 opacity-30" />
    return sortDir === 'asc'
      ? <ArrowUp   size={10} className="ml-1 text-brand-300" />
      : <ArrowDown size={10} className="ml-1 text-brand-300" />
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full sm:max-w-sm">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Buscar campanha por nome…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input pl-9 pr-9 w-full text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {!loading && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {filtered.length} {filtered.length === 1 ? 'campanha' : 'campanhas'}
            </span>
          </div>
        )}
      </div>

      {/* ── Table wrapper ──────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-surface-border bg-surface-card2">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={clsx('table-header', col.align === 'right' ? 'text-right' : 'text-left')}
                  onClick={() => handleSort(col.key)}
                >
                  <span className={clsx(
                    'inline-flex items-center transition-colors duration-100',
                    sortField === col.key && 'text-brand-300',
                  )}>
                    {col.label}
                    <SortIcon field={col.key} />
                  </span>
                </th>
              ))}
              {onSelect && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length + (onSelect ? 1 : 0)}
                  className="py-20"
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-surface-hover border border-surface-border flex items-center justify-center">
                      <Inbox size={22} className="text-slate-500" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-300">
                        {search ? 'Nenhum resultado' : 'Sem campanhas no período'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                        {search
                          ? <>Não encontramos &quot;<span className="text-slate-300 font-medium">{search}</span>&quot;. Tente outro termo.</>
                          : 'Tente ajustar o período ou verificar sua conexão.'}
                      </p>
                    </div>
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="text-[11px] font-bold text-brand-300 hover:text-brand-200 transition-colors"
                      >
                        Limpar busca →
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => onSelect?.(row)}
                  className={clsx(
                    'border-b border-surface-border/30 transition-all duration-150 group',
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-surface-card/25',
                    onSelect
                      ? 'cursor-pointer hover:bg-brand-500/[0.06]'
                      : 'hover:bg-surface-hover/30',
                  )}
                >
                  {COLUMNS.map(col => (
                    <td
                      key={col.key}
                      className={clsx(
                        'table-cell',
                        col.align === 'right' ? 'text-right' : 'text-left',
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                  {onSelect && (
                    <td className="pr-3">
                      <ChevronRight
                        size={14}
                        className="text-slate-600 group-hover:text-brand-300 group-hover:translate-x-0.5 transition-all ml-auto"
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-[11px] text-slate-500 font-semibold">
            Página <span className="text-slate-300 font-bold">{page}</span> de <span className="text-slate-300 font-bold">{totalPages}</span> · {filtered.length} campanhas
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-icon w-8 h-8"
            >
              <ArrowUp size={12} className="-rotate-90" strokeWidth={2.5} />
            </button>
            <div className="flex items-center gap-0.5 px-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number
                if (totalPages <= 5)              p = i + 1
                else if (page <= 3)               p = i + 1
                else if (page >= totalPages - 2)  p = totalPages - 4 + i
                else                              p = page - 2 + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={clsx(
                      'w-8 h-8 rounded-lg text-xs font-bold tabular-nums transition-all duration-150',
                      p === page
                        ? 'bg-brand-500/20 text-brand-200 border border-brand-500/40'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-surface-hover border border-transparent',
                    )}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-icon w-8 h-8"
            >
              <ArrowUp size={12} className="rotate-90" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
