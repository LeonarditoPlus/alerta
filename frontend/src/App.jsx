import { Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './components/Login'
import Register from './components/Register'
import Reportar from './components/Reportar'
import Admin from './components/Admin'
import MisReportes from './components/MisReportes'
import { getUser, logout } from './api'

export default function App() {
  const user = getUser()
  const logged = !!user?.id || !!localStorage.getItem('ab_token')

  if (!logged) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-9 w-9 rounded-xl" />
            <div>
              <div className="font-bold leading-tight">Alerta Buonarroti</div>
              <div className="text-xs text-slate-400">Seguridad ciudadana</div>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              to="/reportar"
              className="px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:bg-white/5"
            >
              Reportar
            </Link>
            <Link
              to="/misreportes"
              className="px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:bg-white/5"
            >
              Mis reportes
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:bg-white/5"
              >
                Panel
              </Link>
            )}
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg text-sm bg-rose-500 hover:bg-rose-400 text-slate-900 font-semibold"
            >
              Salir
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/reportar" element={<Reportar />} />
          <Route path="/misreportes" element={<MisReportes />} />
          <Route
            path="/admin"
            element={user?.role === 'admin' ? <Admin /> : <Navigate to="/reportar" />}
          />
          <Route path="*" element={<Navigate to="/reportar" />} />
        </Routes>
      </main>
    </div>
  )
}
