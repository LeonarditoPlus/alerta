import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE, setAuth } from '../api'

export default function Register() {
  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    dni: '',
    phone: '',
    email: '',
    password: ''
  })
  const [msg, setMsg] = useState('')
  const navigate = useNavigate()

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function submit(e) {
    e.preventDefault()
    setMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setAuth(data.token, data.user)
      // Redirige automáticamente a /reportar
      navigate('/reportar')
    } catch (err) {
      setMsg('❌ ' + err.message)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-bold mb-4">Registro de usuario</h2>
        <form onSubmit={submit} className="space-y-3">
          <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} required className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2"/>
          <input name="apellidos" placeholder="Apellidos" value={form.apellidos} onChange={handleChange} required className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2"/>
          <input name="dni" placeholder="DNI" value={form.dni} onChange={handleChange} required className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2"/>
          <input name="phone" placeholder="Teléfono" value={form.phone} onChange={handleChange} required className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2"/>
          <input name="email" type="email" placeholder="Correo" value={form.email} onChange={handleChange} required className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2"/>
          <input name="password" type="password" placeholder="Contraseña" value={form.password} onChange={handleChange} required className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2"/>
          <button className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold">Registrarse</button>
          {msg && <div className="text-sm mt-2">{msg}</div>}
        </form>
      </div>
    </div>
  )
}
