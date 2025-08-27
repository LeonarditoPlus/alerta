import { useEffect, useRef, useState } from 'react'
import { API_BASE, getToken } from '../api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconAnchor: [12, 41]
})

export default function Reportar() {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [tipo, setTipo] = useState('robo')
  const [descripcion, setDescripcion] = useState('')
  const [latlng, setLatlng] = useState({ lat: -6.77, lng: -79.84 }) // fallback Chiclayo
  const [media, setMedia] = useState([])
  const [msg, setMsg] = useState('')
  const [estado, setEstado] = useState('pendiente')

  useEffect(() => {
    // Intentar usar GPS real
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatlng({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          if (mapRef.current) {
            mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15)
            markerRef.current.setLatLng([pos.coords.latitude, pos.coords.longitude])
          }
        },
        () => {}
      )
    }

    const map = L.map('map').setView([latlng.lat, latlng.lng], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map)

    const m = L.marker([latlng.lat, latlng.lng], { icon: markerIcon, draggable: true }).addTo(map)
    m.on('dragend', () => {
      const p = m.getLatLng()
      setLatlng({ lat: p.lat, lng: p.lng })
    })
    map.on('click', (e) => {
      setLatlng({ lat: e.latlng.lat, lng: e.latlng.lng })
      m.setLatLng(e.latlng)
    })

    mapRef.current = map
    markerRef.current = m

    return () => map.remove()
  }, [])

  function onFiles(e) {
    setMedia([...e.target.files])
  }

  async function enviar(e) {
    e.preventDefault()
    setMsg('')
    const fd = new FormData()
    fd.append('tipo', tipo)
    fd.append('descripcion', descripcion)
    fd.append('lat', String(latlng.lat))
    fd.append('lng', String(latlng.lng))
    for (const f of media) fd.append('media', f)

    const res = await fetch(`${API_BASE}/api/reports`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + getToken() },
      body: fd
    })
    if (!res.ok) {
      setMsg('❌ Error al enviar reporte')
      return
    }
    const data = await res.json()
    setEstado(data.estado)
    setMsg('✅ Reporte enviado con ID: ' + data.id)
    setDescripcion('')
    setMedia([])
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Nuevo reporte</h2>
        <form onSubmit={enviar} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Tipo</label>
            <select value={tipo} onChange={e=>setTipo(e.target.value)} className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2">
              <option value="robo">Robo</option>
              <option value="accidente">Accidente</option>
              <option value="incendio">Incendio</option>
              <option value="medica">Emergencia médica</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Descripción</label>
            <textarea value={descripcion} onChange={e=>setDescripcion(e.target.value)} rows="4" className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2" placeholder="Qué ocurrió..."></textarea>
          </div>
          <div>
            <label className="block text-sm mb-1">Fotos / Videos (máx 5)</label>
            <input type="file" multiple onChange={onFiles} accept="image/*,video/*" className="block w-full text-sm" />
            {media?.length>0 && (
              <p className="text-xs text-slate-400 mt-1">{media.length} archivo(s) seleccionados</p>
            )}
          </div>
          <button className="px-4 py-2 rounded-xl bg-emerald-500/90 hover:bg-emerald-400 text-slate-900 font-semibold">Enviar reporte</button>
          {msg && <div className="text-sm">{msg}</div>}
          <p className="mt-2 text-sm text-slate-400">Estado actual: {estado}</p>
        </form>
      </div>
      <div>
        <div id="map" className="h-[520px] w-full rounded-xl border border-white/10" />
      </div>
    </div>
  )
}
