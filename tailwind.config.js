/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─── Brand ─────────────────────────────────────────────────────────────
      // Single primary accent: Indigo. Clean, professional, readable on dark.
      // DO NOT add a second brand color — restraint is the point.
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',   // hover / lighter emphasis
          500: '#6366f1',   // default accent
          600: '#4f46e5',   // primary CTA fill
          700: '#4338ca',   // active / pressed
          800: '#3730a3',
          900: '#1e1b4b',
        },

        // ─── Surface hierarchy (zinc-based neutral dark) ─────────────────────
        // Replaces the old blue-navy palette (#050915 → #09090B).
        // Zinc reads as a professional tool; navy reads as a space game.
        // Five surface levels create depth without colored ambient light.
        surface: {
          DEFAULT: '#09090B',   // zinc-950  — body background
          sunken:  '#050506',   // near-black — recessed (behind cards)
          card:    '#111113',   // card / panel background
          card2:   '#18181B',   // zinc-900  — elevated (drawer, popovers)
          raised:  '#27272A',   // zinc-800  — raised / active surface
          hover:   '#1E1E23',   // zinc-850± — interactive hover
          border:  '#27272A',   // zinc-800  — standard border
          muted:   '#3F3F46',   // zinc-700  — emphasis border / focus ring
          divider: '#1C1C1F',   // zinc-850± — hairline dividers
        },

        // ─── Semantic accents ────────────────────────────────────────────────
        // Each maps to a fixed meaning — never reassign.
        // Used sparingly for data semantics and status indicators.
        accent: {
          blue:    '#3b82f6',   // spend / information
          indigo:  '#6366f1',   // ← same as brand-500; convenience alias
          violet:  '#8b5cf6',   // conversions / secondary
          emerald: '#10b981',   // profit / success / uptime
          amber:   '#f59e0b',   // caution / warning
          rose:    '#f43f5e',   // loss / error / danger
          cyan:    '#06b6d4',   // checkout / tertiary
          pink:    '#ec4899',   // reserved
        },
      },

      // ─── Typography ──────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Cascadia Code', 'monospace'],
      },
      fontSize: {
        // Dashboard-optimised scale — tighter than Tailwind defaults.
        // Values mirror tokens.css --text-* vars for cross-system consistency.
        '2xs':  ['0.625rem',  { lineHeight: '0.875rem', letterSpacing: '0.04em' }], // 10px
        'xs':   ['0.75rem',   { lineHeight: '1rem' }],                              // 12px
        'sm':   ['0.8125rem', { lineHeight: '1.25rem' }],                           // 13px
        'base': ['0.9375rem', { lineHeight: '1.5rem' }],                            // 15px
        'lg':   ['1.0625rem', { lineHeight: '1.6rem' }],                            // 17px
        'xl':   ['1.1875rem', { lineHeight: '1.65rem' }],                           // 19px
        '2xl':  ['1.4375rem', { lineHeight: '1.8rem',  letterSpacing: '-0.01em' }], // 23px
        '3xl':  ['1.75rem',   { lineHeight: '2.1rem',  letterSpacing: '-0.015em' }],// 28px
        '4xl':  ['2.125rem',  { lineHeight: '2.4rem',  letterSpacing: '-0.02em' }], // 34px
        '5xl':  ['2.75rem',   { lineHeight: '3rem',    letterSpacing: '-0.025em' }],// 44px
      },

      // ─── Backgrounds ────────────────────────────────────────────────────────
      // Gradient definitions are kept as utilities; they should only be used
      // for semantic data display (charts, KPI accents) — NOT for decorative UI.
      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':   'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'card-gradient':    'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, transparent 100%)',
        'brand-gradient':   'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        'success-gradient': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'danger-gradient':  'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
        'glow-indigo':      'radial-gradient(ellipse at center, rgba(99,102,241,0.10) 0%, transparent 70%)',
        'glow-emerald':     'radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 70%)',
      },

      // ─── Shadows ────────────────────────────────────────────────────────────
      // Pure-black shadows with opacity — no colored neon glows.
      // "glow-*" names are kept for backward compatibility but now use a
      // crisp border-ring approach instead of bloom effects.
      boxShadow: {
        // Clean depth — used on cards, panels, drawers
        'card':          '0 1px 2px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.22)',
        'card-hover':    '0 2px 8px rgba(0,0,0,0.22), 0 8px 28px rgba(0,0,0,0.30)',
        'card-raised':   '0 4px 16px rgba(0,0,0,0.26), 0 16px 48px rgba(0,0,0,0.36)',
        'drawer':        '-8px 0 40px rgba(0,0,0,0.44)',
        'focus-ring':    '0 0 0 3px rgba(99,102,241,0.22)',
        'inner-light':   'inset 0 1px 0 rgba(255,255,255,0.06)',

        // Ring-based "glow" — replaces bloom with a crisp 1px border accent
        // More legible on dark backgrounds, closer to Linear/Stripe behavior
        'glow-sm':       '0 0 0 1px rgba(99,102,241,0.16), 0 2px 8px rgba(0,0,0,0.24)',
        'glow':          '0 0 0 1px rgba(99,102,241,0.22), 0 4px 16px rgba(0,0,0,0.32)',
        'glow-lg':       '0 0 0 1px rgba(99,102,241,0.28), 0 8px 32px rgba(0,0,0,0.44)',
        'glow-emerald':  '0 0 0 1px rgba(16,185,129,0.18), 0 4px 16px rgba(0,0,0,0.24)',
        'glow-rose':     '0 0 0 1px rgba(244,63,94,0.18), 0 4px 16px rgba(0,0,0,0.24)',
      },

      // ─── Animations ─────────────────────────────────────────────────────────
      // Purposeful motion only. Entrances are smooth; exits are quicker.
      // Reduced from previous values to feel less "demo-y".
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':     'fadeIn 0.20s cubic-bezier(0.16,1,0.3,1)',
        'fade-in-up':  'fadeInUp 0.28s cubic-bezier(0.16,1,0.3,1)',
        'slide-up':    'slideUp 0.28s cubic-bezier(0.16,1,0.3,1)',
        'slide-right': 'slideRight 0.32s cubic-bezier(0.32,0.72,0,1)',
        'slide-down':  'slideDown 0.22s cubic-bezier(0.16,1,0.3,1)',
        'shimmer':     'shimmer 1.8s ease-in-out infinite',
        'glow-pulse':  'glowPulse 2.5s ease-in-out infinite',
        'spin-slow':   'spin 3s linear infinite',
        'scale-in':    'scaleIn 0.18s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        fadeIn:     { '0%': { opacity: '0' },                                        '100%': { opacity: '1' } },
        fadeInUp:   { '0%': { opacity: '0', transform: 'translateY(6px)' },          '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp:    { '0%': { opacity: '0', transform: 'translateY(12px)' },         '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown:  { '0%': { opacity: '0', transform: 'translateY(-6px)' },         '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideRight: { '0%': { transform: 'translateX(100%)' },                       '100%': { transform: 'translateX(0)' } },
        shimmer:    { '0%': { backgroundPosition: '-250% center' },                  '100%': { backgroundPosition: '250% center' } },
        glowPulse:  { '0%, 100%': { opacity: '0.6' },                                '50%': { opacity: '1' } },
        scaleIn:    { '0%': { opacity: '0', transform: 'scale(0.97)' },              '100%': { opacity: '1', transform: 'scale(1)' } },
      },

      // ─── Easing ──────────────────────────────────────────────────────────────
      transitionTimingFunction: {
        'smooth':   'cubic-bezier(0.16, 1, 0.3, 1)',    // content entrance
        'snappy':   'cubic-bezier(0.32, 0.72, 0, 1)',   // drawer / panel slide
        'back':     'cubic-bezier(0.34, 1.56, 0.64, 1)',// micro-bounce (buttons)
      },

      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
