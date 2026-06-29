const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
const axios = require('axios');
require('dotenv').config();

const {
  findAllChats, findChatById, createChat,
  updateChatTitle, deleteChat,
  addMessage, getRecentMessages,
  createUser, findUserByUsername
} = require('./models/db');
const { startExecution, sendInput, killProcess } = require('./executor');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use('/temp', express.static(path.join(__dirname, '..', 'temp')));
app.use(cors());
app.use(express.json());

// Middleware de autenticación global
app.use((req, res, next) => {
  if (req.path === '/api/login' || req.path === '/api/register' || req.path.startsWith('/temp')) {
    return next();
  }

  const username = req.headers['x-user'] || req.query.user;
  const user = findUserByUsername(username);

  if (!user) {
    return res.status(401).json({ error: 'Acceso denegado. Inicia sesión primero.' });
  }

  req.currentUser = user;
  next();
});

// Registra un nuevo usuario en la base de datos
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });
    if (findUserByUsername(username)) return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = createUser(username, hashedPassword);
    
    res.json({ message: 'Usuario registrado exitosamente', username: newUser.username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Autentica un usuario existente
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = findUserByUsername(username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    res.json({ message: 'Login exitoso', username: user.username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Obtiene todos los chats del usuario autenticado
app.get('/api/chats', (req, res) => {
  try {
    res.json(findAllChats(req.currentUser.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Obtiene un chat específico con su historial de mensajes
app.get('/api/chats/:id', (req, res) => {
  try {
    const chat = findChatById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });
    res.json(chat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crea un nuevo chat inicializado
app.post('/api/chats', (req, res) => {
  try {
    res.json(createChat(req.currentUser.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Actualiza el título de un chat existente
app.put('/api/chats/:id', (req, res) => {
  try {
    res.json(updateChatTitle(req.params.id, req.body.title));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Elimina un chat de forma permanente
app.delete('/api/chats/:id', (req, res) => {
  try {
    deleteChat(req.params.id);
    res.json({ message: 'Eliminado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Inyecta un mensaje en la base de datos y opcionalmente solicita respuesta al LLM
app.post('/api/chats/:id/messages', async (req, res) => {
  const { role, content, isCompetitiveMode, estado_anterior } = req.body;
  const chatId = req.params.id;

  try {
    const { tituloActualizado } = addMessage(chatId, role, content);

    // Si no se provee estado_anterior, se procesa como inyección directa (ej. Tour Guiado)
    if (!estado_anterior) {
      return res.json({ success: true, titulo_actualizado: tituloActualizado });
    }

    const messagesLLM = getRecentMessages(chatId, 4);
    const IA_ENDPOINT = process.env.IA_URL || 'http://127.0.0.1:8000/generate';

    const iaRes = await axios.post(IA_ENDPOINT, {
      messages: messagesLLM,
      is_competitive_locked: isCompetitiveMode || false,
      estado_anterior: estado_anterior
    }, { timeout: 0 });

    const botContent = iaRes.data.response;
    const estadoDetectado = iaRes.data.estado_detectado;

    addMessage(chatId, 'assistant', botContent);

    res.json({
      role: 'assistant',
      content: botContent,
      estado_detectado: estadoDetectado,
      titulo_actualizado: tituloActualizado,
    });
  } catch (e) {
    console.error(`[ERROR LLM] ${e.message}`);
    res.status(500).json({
      role: 'assistant',
      content: 'Problema de conexión con el modelo.',
      titulo_actualizado: false,
    });
  }
});

// Gestiona las conexiones WebSockets para la ejecución de código en tiempo real
io.on('connection', (socket) => {
  socket.on('start_execution', ({ code, language }) => {
    startExecution(socket.id, socket, code, language);
  });

  socket.on('terminal_input', (input) => {
    sendInput(socket.id, input);
  });

  socket.on('stop_execution', () => {
    killProcess(socket.id);
    socket.emit('execution_finished', '\n[Ejecución detenida por el usuario]\n');
  });

  socket.on('disconnect', () => {
    killProcess(socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Servidor listo en http://localhost:${PORT}`);
  console.log(`📦 Base de datos: SQLite (tutor.db)`);
});