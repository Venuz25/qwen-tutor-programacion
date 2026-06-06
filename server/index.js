const express  = require('express');
const path = require('path');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');
require('dotenv').config();

const {
  findAllChats, findChatById, createChat,
  updateChatTitle, deleteChat,
  addMessage, getRecentMessages,
  findOrCreateUser,
} = require('./models/db');

const { startExecution, sendInput, killProcess } = require('./executor');
const axios = require('axios');
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use('/temp', express.static(path.join(__dirname, 'temp')));
app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  const username = req.headers['x-user'] || req.query.user || 'default';
  req.currentUser = findOrCreateUser(username);
  next();
});

/** GET /api/chats — lista de chats del usuario */
app.get('/api/chats', (req, res) => {
  try {
    const chats = findAllChats(req.currentUser.id);
    res.json(chats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/chats/:id — chat con mensajes */
app.get('/api/chats/:id', (req, res) => {
  try {
    const chat = findChatById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });
    res.json(chat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/chats — nuevo chat */
app.post('/api/chats', (req, res) => {
  try {
    const chat = createChat(req.currentUser.id);
    res.json(chat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** PUT /api/chats/:id — renombrar */
app.put('/api/chats/:id', (req, res) => {
  try {
    const chat = updateChatTitle(req.params.id, req.body.title);
    res.json(chat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** DELETE /api/chats/:id */
app.delete('/api/chats/:id', (req, res) => {
  try {
    deleteChat(req.params.id);
    res.json({ message: 'Eliminado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/chats/:id/messages — enviar mensaje y obtener respuesta del LLM */
app.post('/api/chats/:id/messages', async (req, res) => {
  const { role, content, isCompetitiveMode, estado_anterior } = req.body;
  const chatId = req.params.id;

  try {
    const { tituloActualizado } = addMessage(chatId, role, content);
    const messagesLLM = getRecentMessages(chatId, 4);

    console.log(`\n[INFO] Chat ${String(chatId).slice(-4)}`);
    console.log(`[INFO] Estado anterior: ${estado_anterior || 'TUTOR_BASE'}`);

    const t0 = Date.now();
    const IA_ENDPOINT = process.env.IA_URL || 'http://127.0.0.1:8000/generate';

    const iaRes = await axios.post(IA_ENDPOINT, {
      messages: messagesLLM,
      is_competitive_locked: isCompetitiveMode || false,
      estado_anterior: estado_anterior || 'TUTOR_BASE'
    }, { timeout: 0 });

    const botContent = iaRes.data.response;
    const estadoDetectado = iaRes.data.estado_detectado;

    console.log(`[OK] LLM respondió en ${((Date.now() - t0) / 1000).toFixed(2)}s | Nuevo Estado: ${estadoDetectado}`);

    addMessage(chatId, 'assistant', botContent);

    res.json({
      role: 'assistant',
      content: botContent,
      estado_detectado: estadoDetectado,
      titulo_actualizado: tituloActualizado,
    });

  } catch (e) {
    console.error(`[ERROR] ${e.message}`);
    res.status(500).json({
      role: 'assistant',
      content: 'Problema de conexión con el modelo.',
      titulo_actualizado: false,
    });
  }
});

// ────────────────────────────────────────────────────────────────
//  SOCKET.IO — Compilador interactivo
// ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`⚡ Socket conectado: ${socket.id}`);

  socket.on('start_execution', ({ code, language }) => {
    startExecution(socket.id, socket, code, language);
  });

  socket.on('terminal_input', (input) => {
    sendInput(socket.id, input);
  });

  // Botón "Detener" del frontend
  socket.on('stop_execution', () => {
    killProcess(socket.id);
    socket.emit('execution_finished', '\n[Ejecución detenida por el usuario]\n');
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket desconectado: ${socket.id}`);
    killProcess(socket.id);
  });
});

// ────────────────────────────────────────────────────────────────
//  INICIO
// ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Servidor listo en http://localhost:${PORT}`);
  console.log(`📦 Base de datos: SQLite (tutor.db)`);
  console.log(`🔧 Compilador: procesos nativos\n`);
});