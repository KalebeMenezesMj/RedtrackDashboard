'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart2, Layers, LayoutDashboard, Settings, Zap,
  HelpCircle, Sparkles, TrendingUp, LogOut,
} from 'lucide-react'
import clsx from 'clsx'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface NavItem {
  icon:    typeof LayoutDashboard
  label:   string
  href:    string | null
  badge?:  'new' | 'soon'
  accent?: string   // Tailwind text-* class for the active icon color
}

interface NavGroup {
  label: string
  items: NavItem[]
}

/* ─── Navigation config ──────────────────────────────────────────────────── */

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Analytics',
    items: [
      { icon: LayoutDashboard, label: 'Painel',            href: '/',                  accent: 'text-brand-400' },
      { icon: BarChart2,       label: 'Campanhas',         href: '/campanhas',         accent: 'text-blue-400' },
      { icon: Layers,          label: 'Análise Criativos', href: '/analise-criativos', accent: 'text-violet-400' },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { icon: Zap,      label: 'Insights com IA', href: null, badge: 'soon' },
      { icon: Sparkles, label: 'Copy Generator',  href: null, badge: 'soon' },
    ],
  },
  {
    label: 'Conta',
    items: [
      { icon: Settings,   label: 'Configurações', href: null, badge: 'soon' },
      { icon: HelpCircle, label: 'Ajuda',          href: null, badge: 'soon' },
    ],
  },
]

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.replace('/login')
  }

  return (
    /* Clean zinc-gray surface — no gradient, no blur, no atmospheric effects.
     * The sidebar IS the darkest card-level surface; it doesn't need to float. */
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-surface-card border-r border-surface-border relative">

      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-5">
        <Link href="/" className="group flex items-center gap-3 px-2">

          {/* Logo — flat brand-600, ring on hover instead of glow bloom */}
          <div className={clsx(
            'relative w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shrink-0',
            'ring-1 ring-brand-500/30',                          // resting border ring
            'transition-all duration-150',
            'group-hover:bg-brand-500 group-hover:ring-brand-400/50', // brightens on hover
          )}>
            <TrendingUp size={15} className="text-white" strokeWidth={2.8} />

            {/* Status dot: ring uses bg-surface-card to "cut" a gap cleanly */}
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-card" />
          </div>

          <div className="min-w-0">
            <span className="block font-bold text-slate-50 text-sm tracking-tight leading-none">
              RedTrack
            </span>
            {/* Subdued descriptor — less weight and opacity than the product name */}
            <span className="block text-[10px] font-medium tracking-[0.16em] uppercase mt-0.5 text-slate-600">
              Analytics
            </span>
          </div>
        </Link>
      </div>

      {/* Brand divider — very subtle brand tint, not a full indigo bar */}
      <div className="mx-4 mb-5 divider-brand" />

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 space-y-5 overflow-y-auto pb-2">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {/* Group label: section-label class (10px, semibold, uppercase) */}
            <p className="section-label px-2 mb-1.5">{group.label}</p>

            <ul className="space-y-0.5">
              {group.items.map(item => {
                const active = item.href ? pathname === item.href : false

                if (item.href) {
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className={clsx(
                          'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl',
                          'text-sm font-medium transition-all duration-150',
                          active
                            ? 'text-slate-50'
                            : 'text-slate-500 hover:text-slate-200 hover:bg-surface-hover',
                        )}
                      >
                        {/* Active background — flat brand tint + thin border (nav-active class) */}
                        {active && (
                          <>
                            <span className="absolute inset-0 rounded-xl nav-active" />
                            {/* Left accent bar: 2px solid pill — directional active indicator */}
                            <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-brand-500" />
                          </>
                        )}

                        <item.icon
                          size={15}
                          strokeWidth={active ? 2.5 : 2}
                          className={clsx(
                            'relative z-10 shrink-0 transition-colors duration-150',
                            active
                              ? (item.accent ?? 'text-brand-400')
                              : 'text-slate-600 group-hover:text-slate-400',
                          )}
                        />

                        <span className="relative z-10 truncate flex-1">{item.label}</span>

                        {/* Presence dot — indicates "this page is live/active" */}
                        {active && (
                          <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-brand-500" />
                        )}
                      </Link>
                    </li>
                  )
                }

                /* Disabled "coming soon" items */
                return (
                  <li key={item.label}>
                    <button
                      disabled
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 text-sm font-medium text-slate-700 cursor-not-allowed select-none"
                    >
                      <item.icon size={15} className="text-slate-700 shrink-0" strokeWidth={2} />
                      <span className="truncate flex-1 text-left">{item.label}</span>

                      {item.badge === 'soon' && (
                        <span className="text-[9px] font-semibold uppercase tracking-[0.08em]
                                         text-slate-600 bg-surface-raised border border-surface-border
                                         px-1.5 py-0.5 rounded shrink-0">
                          Em breve
                        </span>
                      )}
                      {item.badge === 'new' && (
                        <span className="text-[9px] font-semibold uppercase tracking-[0.08em]
                                         text-emerald-500 bg-emerald-500/8 border border-emerald-500/20
                                         px-1.5 py-0.5 rounded shrink-0">
                          Novo
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Tip card ──────────────────────────────────────────────────────── */}
      {/* Simple surface-raised card — no gradient, no glow blob, no ::after */}
      <div className="px-3 pb-3">
        <div className="rounded-xl p-3.5 bg-surface-raised border border-surface-border">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={11} className="text-brand-400 shrink-0" />
            <p className="text-[11px] font-semibold text-slate-300">Pro Tip</p>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Use o período de{' '}
            <span className="text-slate-400 font-medium">30 dias</span>{' '}
            para métricas mais estáveis.
          </p>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-5">
        <div className="divider mb-3.5" />
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-slate-600 font-medium tracking-[0.10em] uppercase">
            v1.0.0
          </span>
          {/* Pulsing dot indicates live API connection */}
          <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-500 font-semibold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            Online
          </span>
        </div>

        {/* Botão de logout */}
        <button
          onClick={handleLogout}
          className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-red-400 hover:bg-red-500/8 transition-all"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </aside>
  )
}
