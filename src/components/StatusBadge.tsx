'use client'

import clsx from 'clsx'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

interface Props {
  status: 'connected' | 'error' | 'loading'
  label?: string
}

export default function StatusBadge({ status, label }: Props) {
  const config = {
    connected: {
      wrapper: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/22',
      dot:     'bg-emerald-400',
      icon:    Wifi,
      text:    'Conectado',
    },
    error: {
      wrapper: 'bg-rose-500/10 text-rose-400 border-rose-500/22',
      dot:     'bg-rose-400',
      icon:    WifiOff,
      text:    'Falha na API',
    },
    loading: {
      wrapper: 'bg-slate-800/60 text-slate-400 border-slate-700/50',
      dot:     'bg-slate-500',
      icon:    Loader2,
      text:    'Conectando…',
    },
  }[status]

  const text = label ?? config.text
  const Icon = config.icon

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full',
        'text-[10px] font-bold tracking-wider border',
        config.wrapper,
      )}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
    >
      {/* Indicator dot with optional pulse */}
      <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
        {status === 'connected' && (
          <span className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping" />
        )}
        {status === 'loading' ? (
          <Icon size={10} className="animate-spin" strokeWidth={2.5} />
        ) : (
          <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
        )}
      </span>
      {text}
    </span>
  )
}
