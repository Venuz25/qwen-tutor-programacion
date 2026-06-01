/**
 * db.js — Capa de base de datos con better-sqlite3
 *
 * Reemplaza completamente a Mongoose + MongoDB.
 * Un solo archivo .db sin servidor, sin Docker.
 *
 * Tablas:
 *   users    — multi-usuario básico (id, username, created_at)
 *   chats    — conversaciones (id, user_id, title, created_at)
 *   messages — mensajes (id, chat_id, role, content, timestamp)
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// Guardar la DB en la carpeta del servidor
const DB_DIR  = path.join(__dirname, '..');
const DB_PATH = path.join(DB_DIR, 'tutor.db');

const db = new Database(DB_PATH);

// ── Rendimiento: WAL mode permite lecturas concurrentes ──
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Crear tablas si no existen ──
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chats (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL DEFAULT 1,
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

// ── Usuario por defecto (para cuando no hay login aún) ──
const ensureDefaultUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, username) VALUES (1, 'default')
`);
ensureDefaultUser.run();

// ──────────────────────────────────────────────────────────────
//  HELPERS — API idéntica a la que usabas con Mongoose
// ──────────────────────────────────────────────────────────────

/** Devuelve todos los chats (solo id + title + created_at) */
function findAllChats(userId = 1) {
  return db.prepare(`
    SELECT id as _id, title, created_at as createdAt
    FROM chats
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);
}

/** Devuelve un chat con todos sus mensajes */
function findChatById(chatId) {
  const chat = db.prepare(`
    SELECT id as _id, user_id, title, created_at as createdAt
    FROM chats WHERE id = ?
  `).get(chatId);

  if (!chat) return null;

  chat.messages = db.prepare(`
    SELECT id as _id, chat_id, role, content, timestamp
    FROM messages WHERE chat_id = ?
    ORDER BY timestamp ASC
  `).all(chatId);

  return chat;
}

/** Crea un chat nuevo con el mensaje de bienvenida del asistente */
function createChat(userId = 1) {
  const insert = db.prepare(`
    INSERT INTO chats (user_id, title) VALUES (?, 'Nuevo Chat')
  `);
  const { lastInsertRowid } = insert.run(userId);

  // Mensaje inicial del tutor
  db.prepare(`
    INSERT INTO messages (chat_id, role, content)
    VALUES (?, 'assistant', '¡Hola! Soy tu tutor socrático. ¿En qué código estás trabajando hoy?')
  `).run(lastInsertRowid);

  return findChatById(lastInsertRowid);
}

/** Actualiza el título de un chat */
function updateChatTitle(chatId, title) {
  db.prepare(`UPDATE chats SET title = ? WHERE id = ?`).run(title, chatId);
  return findChatById(chatId);
}

/** Borra un chat y sus mensajes (CASCADE) */
function deleteChat(chatId) {
  db.prepare(`DELETE FROM chats WHERE id = ?`).run(chatId);
}

/**
 * Agrega un mensaje a un chat.
 * Devuelve { updatedTitle } si el título fue actualizado automáticamente.
 */
function addMessage(chatId, role, content) {
  const chat = findChatById(chatId);
  if (!chat) throw new Error(`Chat ${chatId} no encontrado`);

  let tituloActualizado = false;

  // Auto-título con el primer mensaje del usuario
  if (chat.messages.length === 1 && role === 'user') {
    const limpio = content.replace(/\n/g, ' ').replace(/\*\*.*?\*\*/g, '').trim();
    if (limpio) {
      const nuevoTitulo = limpio.substring(0, 26) + (limpio.length > 26 ? '...' : '');
      db.prepare(`UPDATE chats SET title = ? WHERE id = ?`).run(nuevoTitulo, chatId);
      tituloActualizado = true;
    }
  }

  db.prepare(`
    INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)
  `).run(chatId, role, content);

  return { tituloActualizado };
}

/**
 * Devuelve los últimos N mensajes de un chat (para el contexto del LLM).
 */
function getRecentMessages(chatId, n = 4) {
  return db.prepare(`
    SELECT role, content FROM messages
    WHERE chat_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(chatId, n).reverse();
}

// ── Usuarios (base para multi-usuario) ──

function findOrCreateUser(username) {
  let user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
  if (!user) {
    const { lastInsertRowid } = db.prepare(`INSERT INTO users (username) VALUES (?)`).run(username);
    user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(lastInsertRowid);
  }
  return user;
}

function getAllUsers() {
  return db.prepare(`SELECT id, username, created_at FROM users ORDER BY id`).all();
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
  findOrCreateUser,
  getAllUsers,
};