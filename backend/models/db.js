const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'tutor.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, 
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT 'Nuevo Chat',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
  );
`);

const stmts = {
  insertUser: db.prepare(`INSERT INTO users (username, password) VALUES (?, ?)`),
  getUserById: db.prepare(`SELECT id, username FROM users WHERE id = ?`),
  getUserByUsername: db.prepare(`SELECT * FROM users WHERE username = ?`),
  getAllChats: db.prepare(`SELECT id as _id, title, created_at as createdAt FROM chats WHERE user_id = ? ORDER BY created_at DESC`),
  getChatById: db.prepare(`SELECT id as _id, user_id, title, created_at as createdAt FROM chats WHERE id = ?`),
  getMessagesByChatId: db.prepare(`SELECT id as _id, chat_id, role, content, timestamp FROM messages WHERE chat_id = ? ORDER BY timestamp ASC`),
  insertChat: db.prepare(`INSERT INTO chats (user_id, title) VALUES (?, 'Nuevo Chat')`),
  updateTitle: db.prepare(`UPDATE chats SET title = ? WHERE id = ?`),
  deleteChatById: db.prepare(`DELETE FROM chats WHERE id = ?`),
  insertMessage: db.prepare(`INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)`),
  getRecentMsgs: db.prepare(`SELECT role, content FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?`)
};

// Crea un nuevo usuario y devuelve sus datos básicos
function createUser(username, hashedPassword) {
  const { lastInsertRowid } = stmts.insertUser.run(username, hashedPassword);
  return stmts.getUserById.get(lastInsertRowid);
}

// Busca un usuario por su nombre de usuario
function findUserByUsername(username) {
  return stmts.getUserByUsername.get(username);
}

// Obtiene todos los chats asociados a un usuario
function findAllChats(userId) {
  return stmts.getAllChats.all(userId);
}

// Obtiene un chat específico junto con su historial completo de mensajes
function findChatById(chatId) {
  const chat = stmts.getChatById.get(chatId);
  if (!chat) return null;
  
  chat.messages = stmts.getMessagesByChatId.all(chatId);
  return chat;
}

// Crea un nuevo chat inicializado con un mensaje de bienvenida del asistente
function createChat(userId) {
  const { lastInsertRowid } = stmts.insertChat.run(userId);
  const welcomeMessage = `¡Hola! Soy tu asistente de programación. Puedes escribirme preguntas sobre código, algoritmos, estructuras de datos, depuración y más. Estoy aquí para ayudarte a aprender y resolver problemas de programación. ¡Comencemos!`;
  
  stmts.insertMessage.run(lastInsertRowid, 'assistant', welcomeMessage);
  return findChatById(lastInsertRowid);
}

// Actualiza el título de un chat existente
function updateChatTitle(chatId, title) {
  stmts.updateTitle.run(title, chatId);
  return findChatById(chatId);
}

// Elimina un chat y sus mensajes en cascada
function deleteChat(chatId) {
  stmts.deleteChatById.run(chatId);
}

// Añade un mensaje al chat y auto-genera un título si es el primer mensaje del usuario
function addMessage(chatId, role, content) {
  const chat = findChatById(chatId);
  if (!chat) throw new Error(`Chat ${chatId} no encontrado`);
  
  let tituloActualizado = false;

  if (chat.messages.length === 1 && role === 'user') {
    const limpio = content.replace(/\n/g, ' ').replace(/\*\*.*?\*\*/g, '').trim();
    if (limpio) {
      const nuevoTitulo = limpio.length > 26 ? `${limpio.substring(0, 26)}...` : limpio;
      stmts.updateTitle.run(nuevoTitulo, chatId);
      tituloActualizado = true;
    }
  }

  stmts.insertMessage.run(chatId, role, content);
  return { tituloActualizado };
}

// Obtiene los mensajes más recientes de un chat (por defecto los últimos 4)
function getRecentMessages(chatId, limit = 4) {
  return stmts.getRecentMsgs.all(chatId, limit).reverse();
}

module.exports = {
  db,
  findAllChats,
  findChatById,
  createChat,
  updateChatTitle,
  deleteChat,
  addMessage,
  getRecentMessages,
  createUser,
  findUserByUsername
};