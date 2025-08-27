import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, setAuth } from '../api'

export default function Login() {
  const [mode, setMode] = useState('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const credential = mode === 'email' ? email.trim() : phone.trim()
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, type: mode, password }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setAuth(data.token, data.user)
      // Recargamos para que la app detecte el login automáticamente
      window.location.reload()
    } catch (err) {
      setError(err.message || 'Error de inicio de sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-5">
          <img src="/logo.png" className="h-10 w-10 rounded-xl" />
          <div>
            <h1 className="text-xl font-bold">Alerta Buonarroti</h1>
            <p className="text-xs text-slate-400">Ingresa para reportar o gestionar</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('email')}
            className={
              "px-3 py-1.5 rounded-full text-sm border " +
              (mode === 'email'
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                : 'border-white/10 text-slate-300 hover:bg-white/5')
            }
          >
            Correo
          </button>
          <button
            type="button"
            onClick={() => setMode('phone')}
            className={
              "px-3 py-1.5 rounded-full text-sm border " +
              (mode === 'phone'
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                : 'border-white/10 text-slate-300 hover:bg-white/5')
            }
          >
            Celular
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'email' ? (
            <div>
              <label className="block text-sm mb-1">Correo</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2 outline-none focus:border-emerald-400/50"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm mb-1">Celular</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2 outline-none focus:border-emerald-400/50"
                placeholder="+51 9XX XXX XXX"
              />
            </div>
          )}

          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2 outline-none focus:border-emerald-400/50"
            />
          </div>

          {error && (
            <div className="text-sm text-red-300 bg-red-900/30 border border-red-700/40 rounded-xl p-2">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full py-2 rounded-xl bg-emerald-500/90 hover:bg-emerald-400 text-slate-900 font-semibold disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-400">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-emerald-400 hover:underline">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  )
}
