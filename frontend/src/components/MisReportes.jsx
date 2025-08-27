import { useEffect, useState } from 'react'
import { API_BASE, getToken, getUser } from '../api'
import { io } from 'socket.io-client'

export default function MisReportes() {
  const [reportes, setReportes] = useState([])
  const user = getUser()
  const socket = io(API_BASE, { transports: ['websocket'] })

  // Cargar mis reportes al inicio
  async function cargar() {
    const res = await fetch(`${API_BASE}/api/myreports`, {
      headers: { Authorization: 'Bearer ' + getToken() }
    })
    setReportes(await res.json())
  }

  useEffect(() => {
    cargar()

    // --- Suscribirse a eventos en tiempo real ---
    socket.on('nuevo-reporte', (reporte) => {
      // si el reporte es mío → lo agrego
      if (reporte.userId === user.id) {
        setReportes(prev => [...prev, reporte])
      }
    })

    socket.on('estado-actualizado', ({ id, estado }) => {
      setReportes(prev =>
        prev.map(r => r.id === id ? { ...r, estado } : r)
      )
    })

    socket.on('reporte-eliminado', ({ id }) => {
      setReportes(prev => prev.filter(r => r.id !== id))
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Mis reportes (Tiempo real)</h2>
      {reportes.length === 0 && <p className="text-slate-400">No tienes reportes aún</p>}
      <div className="space-y-4">
        {reportes.map(r => (
          <div key={r.id} className="p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold">{r.tipo}</span>
              <span className="text-sm italic text-slate-300">{r.estado}</span>
            </div>
            <p className="text-sm text-slate-200">{r.descripcion}</p>
            <p className="text-xs text-slate-400 mt-1">{new Date(r.fecha).toLocaleString()}</p>
            {r.media?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {r.media.map((m, i) =>
                  m.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video key={i} src={`${API_BASE}${m}`} controls className="w-32 h-20 rounded-lg border border-white/10" />
                  ) : (
                    <img key={i} src={`${API_BASE}${m}`} alt="" className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
