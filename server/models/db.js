const Database = require('better-sqlite3');
const path     = require('path');

const DB_DIR  = path.join(__dirname, '..');
const DB_PATH = path.join(DB_DIR, 'tutor.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL, 
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chats (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    title      TEXT    NOT NULL DEFAULT 'Nuevo Chat',
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id   INTEGER NOT NULL,
    role      TEXT    NOT NULL CHECK(role IN ('user','assistant','system')),
    content   TEXT    NOT NULL,
    timestamp TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
  );
`);

function createUser(username, hashedPassword) {
  const insert = db.prepare(`INSERT INTO users (username, password) VALUES (?, ?)`);
  const { lastInsertRowid } = insert.run(username, hashedPassword);
  return db.prepare(`SELECT id, username FROM users WHERE id = ?`).get(lastInsertRowid);
}

function findUserByUsername(username) {
  return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
}

function findAllChats(userId) {
  return db.prepare(`SELECT id as _id, title, created_at as createdAt FROM chats WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
}

function findChatById(chatId) {
  const chat = db.prepare(`SELECT id as _id, user_id, title, created_at as createdAt FROM chats WHERE id = ?`).get(chatId);
  if (!chat) return null;
  chat.messages = db.prepare(`SELECT id as _id, chat_id, role, content, timestamp FROM messages WHERE chat_id = ? ORDER BY timestamp ASC`).all(chatId);
  return chat;
}

function createChat(userId) {
  const insert = db.prepare(`INSERT INTO chats (user_id, title) VALUES (?, 'Nuevo Chat')`);
  const { lastInsertRowid } = insert.run(userId);
  db.prepare(`INSERT INTO messages (chat_id, role, content) VALUES (?, 'assistant', '¡Hola! Soy tu tutor de programación. ¿En qué código estás trabajando hoy?')`).run(lastInsertRowid);
  return findChatById(lastInsertRowid);
}

function updateChatTitle(chatId, title) {
  db.prepare(`UPDATE chats SET title = ? WHERE id = ?`).run(title, chatId);
  return findChatById(chatId);
}

function deleteChat(chatId) {
  db.prepare(`DELETE FROM chats WHERE id = ?`).run(chatId);
}

function addMessage(chatId, role, content) {
  const chat = findChatById(chatId);
  if (!chat) throw new Error(`Chat ${chatId} no encontrado`);
  let tituloActualizado = false;
  if (chat.messages.length === 1 && role === 'user') {
    const limpio = content.replace(/\n/g, ' ').replace(/\*\*.*?\*\*/g, '').trim();
    if (limpio) {
      const nuevoTitulo = limpio.substring(0, 26) + (limpio.length > 26 ? '...' : '');
      db.prepare(`UPDATE chats SET title = ? WHERE id = ?`).run(nuevoTitulo, chatId);
      tituloActualizado = true;
    }
  }
  db.prepare(`INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)`).run(chatId, role, content);
  return { tituloActualizado };
}

function getRecentMessages(chatId, n = 4) {
  return db.prepare(`SELECT role, content FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?`).all(chatId, n).reverse();
}

module.exports = {
  db, findAllChats, findChatById, createChat, updateChatTitle, deleteChat, addMessage, getRecentMessages, 
  createUser, findUserByUsername
};