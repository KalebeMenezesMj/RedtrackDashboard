import type { Metadata, Viewport } from 'next'
import './tokens.css'    // design tokens — CSS custom properties (:root vars)
import './globals.css'   // component styles, Tailwind layers, keyframes

export const metadata: Metadata = {
  title:       'RedTrack Dashboard',
  description: 'Campaign analytics and performance metrics',
}

export const viewport: Viewport = {
  // zinc-950 — matches --color-surface; browser chrome blends with app bg
  themeColor: '#09090B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
