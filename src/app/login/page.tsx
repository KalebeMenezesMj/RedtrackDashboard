'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      })
      const data = await res.json() as { ok: boolean; error?: string }
      if (data.ok) {
        router.replace('/')
      } else {
        setError(data.error ?? 'Usuário ou senha inválidos.')
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
            <BarChart3 size={22} className="text-purple-400" />
          </div>
          <div className="text-center">
            <h1 className="text-slate-100 font-bold text-xl">
              {process.env.NEXT_PUBLIC_APP_NAME ?? 'RedTrack Dashboard'}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">Entre para continuar</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Usuário
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              autoFocus
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/60 transition-colors"
              placeholder="seu usuário"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 pr-10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/60 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold transition-all"
          >
            {loading
              ? <Loader2 size={16} className="animate-spin" />
              : <BarChart3 size={16} />}
            {loading ? 'Verificando…' : 'Entrar'}
          </button>
        </form>

      </div>
    </div>
  )
}
