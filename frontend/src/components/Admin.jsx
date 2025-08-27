import { useEffect, useState, useRef } from 'react'
import { API_BASE, getToken } from '../api'
import { io } from 'socket.io-client'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconAnchor: [12, 41]
})

export default function Admin() {
  const [reportes, setReportes] = useState([])
  const [sonidoListo, setSonidoListo] = useState(false)
  const audioRef = useRef(null)
  const mapRef = useRef(null)
  const socketRef = useRef(null)

  // --- cargar inicial ---
  async function cargarReportes() {
    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        headers: { Authorization: 'Bearer ' + getToken() }
      })
      if (!res.ok) throw new Error(await res.text())
      setReportes(await res.json())
    } catch (err) {
      console.error("❌ Error al cargar reportes:", err.message)
    }
  }

  // --- controlar sirena ---
  function activarSonido() {
    audioRef.current.play()
    audioRef.current.pause()
    setSonidoListo(true)
  }

  function stopSirenaIfClear(lista) {
    const pendientes = lista.filter(r => r.estado === 'pendiente').length
    if (pendientes === 0) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  // --- conectar sockets ---
  useEffect(() => {
    cargarReportes()

    const socket = io(API_BASE, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('nuevo-reporte', (reporte) => {
      setReportes(prev => {
        const nuevos = [...prev, reporte]
        if (sonidoListo) audioRef.current.play()
        return nuevos
      })
    })

    socket.on('estado-actualizado', ({ id, estado }) => {
      setReportes(prev => {
        const nuevos = prev.map(r => r.id === id ? { ...r, estado } : r)
        stopSirenaIfClear(nuevos)
        return nuevos
      })
    })

    socket.on('reporte-eliminado', ({ id }) => {
      setReportes(prev => {
        const nuevos = prev.filter(r => r.id !== id)
        stopSirenaIfClear(nuevos)
        return nuevos
      })
    })

    return () => { socket.disconnect() }
  }, [sonidoListo])

  // --- mapa ---
  useEffect(() => {
    if (mapRef.current) return
    const map = L.map('map-admin').setView([-6.77, -79.84], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map)
    mapRef.current = map
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer)
    })
    reportes.forEach(r => {
      if (r.lat && r.lng) {
        L.marker([r.lat, r.lng], { icon: markerIcon }).addTo(map)
          .bindPopup(`<b>${r.tipo}</b><br/>${r.descripcion}<br/><i>${r.estado}</i>`)
      }
    })
  }, [reportes])

  // --- acciones admin ---
  async function updateEstado(id, estado) {
    await fetch(`${API_BASE}/api/reports/${id}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken()
      },
      body: JSON.stringify({ estado })
    })
  }

  async function eliminarReporte(id) {
    await fetch(`${API_BASE}/api/reports/${id}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + getToken() }
    })
  }

  return (
    <div className="space-y-6">
      {/* audio con loop */}
      <audio ref={audioRef} src="/siren.mp3" loop />

      {!sonidoListo && (
        <button
          onClick={activarSonido}
          className="px-3 py-1 bg-emerald-500 rounded-lg text-slate-900 font-semibold"
        >
          Activar sonido de alertas
        </button>
      )}

      <h2 className="text-xl font-semibold">Panel de reportes (Tiempo real)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-white/10 rounded-xl overflow-hidden">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Usuario</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Multimedia</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reportes.map(r => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="px-3 py-2">{r.usuario}</td>
                <td className="px-3 py-2">{r.tipo}</td>
                <td className="px-3 py-2">{r.descripcion}</td>
                <td className="px-3 py-2">{new Date(r.fecha).toLocaleString()}</td>
                <td className="px-3 py-2">{r.estado}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {r.media?.map((m, i) =>
                      m.match(/\.(mp4|webm|ogg)$/i) ? (
                        <video key={i} src={`${API_BASE}${m}`} controls className="w-32 h-20 rounded-lg border border-white/10" />
                      ) : (
                        <img key={i} src={`${API_BASE}${m}`} alt="" className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                      )
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => updateEstado(r.id, 'atendiendo')}
                      className="px-2 py-1 bg-amber-400 text-slate-900 rounded"
                    >
                      Atender
                    </button>
                    <button
                      onClick={() => updateEstado(r.id, 'atendida')}
                      className="px-2 py-1 bg-green-500 text-slate-900 rounded"
                    >
                      Atendida
                    </button>
                    <button
                      onClick={() => eliminarReporte(r.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {reportes.length === 0 && (
              <tr>
                <td colSpan="7" className="px-3 py-4 text-center text-slate-400">
                  No hay reportes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <div id="map-admin" className="h-[400px] w-full rounded-xl border border-white/10" />
      </div>
    </div>
  )
}
