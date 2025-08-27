require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// --- Socket.io ---
const io = new Server(server, {
  cors: { origin: process.env.ALLOWED_ORIGIN || "*" }
});

// Usuarios conectados
io.on('connection', (socket) => {
  console.log('🟢 Cliente conectado:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado:', socket.id);
  });
});

app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecreto';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: ALLOWED_ORIGIN }));

// Carpeta de uploads
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
app.use('/uploads', express.static(UPLOAD_DIR));

// Usuarios en memoria (demo + registrados)
const users = [
  { id: 'u_admin', email: 'admin@alerta.pe', phone: '+51911111111', dni: '00000000', role: 'admin', passHash: bcrypt.hashSync('admin123', 10), nombre: 'Administrador' },
  { id: 'u_ciudadano', email: 'demo@alerta.pe', phone: '+51999999999', dni: '11111111', role: 'ciudadano', passHash: bcrypt.hashSync('12345678', 10), nombre: 'Ciudadano Demo' },
];

// Reportes en memoria
const reports = [];

// --- Middlewares de auth ---
function auth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).send('Token requerido');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { sub, role }
    next();
  } catch (e) { return res.status(401).send('Token inválido'); }
}
function isAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).send('Solo administrador');
  next();
}

// --- Salud / raíz ---
app.get('/api/health', (_, res) => res.json({ ok: true }));
app.get('/', (_, res) => res.json({ status: "API Alerta Buonarroti corriendo" }));

// --- LOGIN ---
app.post('/api/auth/login', (req, res) => {
  const { credential, type, password } = req.body || {};
  if (!credential || !password || !['email','phone'].includes(type)) {
    return res.status(400).send('Faltan datos');
  }
  const user = users.find(u =>
    (type === 'email'
      ? u.email.toLowerCase() === String(credential).toLowerCase()
      : u.phone === credential)
  );
  if (!user || !bcrypt.compareSync(password, user.passHash)) {
    return res.status(401).send('Credenciales inválidas');
  }
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
  return res.json({ token, user: { id: user.id, nombre: user.nombre, role: user.role } });
});

// --- REGISTRO ---
app.post('/api/auth/register', (req, res) => {
  const { nombre, apellidos, dni, phone, email, password } = req.body || {};
  if (!nombre || !apellidos || !dni || !phone || !email || !password) {
    return res.status(400).send('Faltan campos obligatorios');
  }
  if (users.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(400).send('Correo ya registrado');
  }
  if (users.some(u => u.phone === phone)) {
    return res.status(400).send('Teléfono ya registrado');
  }
  if (users.some(u => u.dni === dni)) {
    return res.status(400).send('DNI ya registrado');
  }
  const newUser = {
    id: uuidv4(),
    email,
    phone,
    dni,
    nombre: `${nombre} ${apellidos}`,
    role: 'ciudadano',
    passHash: bcrypt.hashSync(password, 10),
  };
  users.push(newUser);
  const token = jwt.sign({ sub: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '2h' });
  return res.json({ token, user: { id: newUser.id, nombre: newUser.nombre, role: newUser.role } });
});

// --- Subida de imágenes y videos ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// --- Crear reporte (con notificación en tiempo real) ---
app.post('/api/reports', auth, upload.array('media', 5), (req, res) => {
  const { tipo, descripcion, lat, lng } = req.body;
  const files = (req.files || []).map(f => '/uploads/' + path.basename(f.path));
  const report = {
    id: uuidv4(),
    userId: req.user.sub,
    tipo,
    descripcion,
    lat: lat !== undefined ? parseFloat(lat) : null,
    lng: lng !== undefined ? parseFloat(lng) : null,
    media: files,
    estado: 'pendiente',
    fecha: new Date()
  };
  reports.push(report);

  // 🚨 Notificar en tiempo real a los admins
  io.emit('nuevo-reporte', report);

  res.json(report);
});

// --- Listar todos (admin) ---
app.get('/api/reports', auth, isAdmin, (req, res) => {
  const enriched = reports.map(r => ({
    ...r,
    usuario: users.find(u => u.id === r.userId)?.nombre || 'Desconocido',
  }));
  res.json(enriched);
});

// --- Listar mis reportes (usuario) ---
app.get('/api/myreports', auth, (req, res) => {
  const myReports = reports.filter(r => r.userId === req.user.sub);
  res.json(myReports);
});

// --- Actualizar estado (admin) ---
app.put('/api/reports/:id/estado', auth, isAdmin, (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  const validStates = ['pendiente','atendiendo','atendida'];
  if (!validStates.includes(estado)) {
    return res.status(400).send('Estado no válido');
  }
  const rep = reports.find(r => r.id === id);
  if (!rep) return res.status(404).send('Reporte no encontrado');
  rep.estado = estado;

  // notificar actualización al frontend
  io.emit('estado-actualizado', { id, estado });

  res.json(rep);
});

// --- Eliminar reporte (admin) ---
app.delete('/api/reports/:id', auth, isAdmin, (req, res) => {
  const { id } = req.params;
  const idx = reports.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).send('Reporte no encontrado');
  reports.splice(idx, 1);

  // notificar eliminación
  io.emit('reporte-eliminado', { id });

  res.json({ success: true, id });
});

server.listen(PORT, () => {
  console.log(`✅ API + Socket corriendo en http://localhost:${PORT}`);
});
