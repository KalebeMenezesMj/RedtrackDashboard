// ─── Number Formatting Utilities ─────────────────────────────────────────────

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatROI(roi: number): string {
  return `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`
}

export function roiColor(roi: number): string {
  if (roi > 30)  return 'text-emerald-400'
  if (roi > 0)   return 'text-green-400'
  if (roi === 0) return 'text-slate-400'
  if (roi > -20) return 'text-amber-400'
  return 'text-red-400'
}

export function profitColor(profit: number): string {
  if (profit > 0)  return 'text-emerald-400'
  if (profit === 0) return 'text-slate-400'
  return 'text-red-400'
}

export function roiBgColor(roi: number): string {
  if (roi > 30)  return 'bg-emerald-500/10 text-emerald-400'
  if (roi > 0)   return 'bg-green-500/10 text-green-400'
  if (roi === 0) return 'bg-slate-500/10 text-slate-400'
  if (roi > -20) return 'bg-amber-500/10 text-amber-400'
  return 'bg-red-500/10 text-red-400'
}
