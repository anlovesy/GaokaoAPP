import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const storageDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(projectRoot, "server", "storage");
const dbPath = path.join(storageDir, "app.db");

fs.mkdirSync(storageDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    province TEXT,
    score INTEGER,
    rank_value INTEGER,
    ai_provider TEXT,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    provider TEXT,
    messages_json TEXT NOT NULL,
    reply_text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    dataset_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

ensureDefaultAdmin();

export function authenticateUser(username, password) {
  const user = db
    .prepare("SELECT id, username, password_hash, created_at FROM users WHERE username = ?")
    .get(username);

  if (!user) {
    return null;
  }

  if (!verifyPassword(password, user.password_hash)) {
    return null;
  }

  const token = crypto.randomUUID();
  db.prepare("INSERT INTO auth_tokens (token, user_id, created_at) VALUES (?, ?, ?)")
    .run(token, user.id, new Date().toISOString());

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.created_at
    }
  };
}

export function getUserFromToken(token) {
  if (!token) {
    return null;
  }

  const record = db
    .prepare(`
      SELECT users.id, users.username, users.created_at
      FROM auth_tokens
      JOIN users ON users.id = auth_tokens.user_id
      WHERE auth_tokens.token = ?
    `)
    .get(token);

  return record
    ? {
        id: record.id,
        username: record.username,
        createdAt: record.created_at
      }
    : null;
}

export function savePlanHistory({ userId, profile, result }) {
  db.prepare(`
    INSERT INTO plans (user_id, province, score, rank_value, ai_provider, result_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId || null,
    profile.province,
    profile.score,
    profile.rank,
    profile.aiProvider || "auto",
    JSON.stringify(result),
    new Date().toISOString()
  );
}

export function saveChatHistory({ userId, provider, messages, replyText }) {
  db.prepare(`
    INSERT INTO chat_history (user_id, provider, messages_json, reply_text, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    userId || null,
    provider,
    JSON.stringify(messages),
    replyText,
    new Date().toISOString()
  );
}

export function saveImportHistory({ userId, datasetType, fileName, rowCount }) {
  db.prepare(`
    INSERT INTO imports (user_id, dataset_type, file_name, row_count, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId || null, datasetType, fileName, rowCount, new Date().toISOString());
}

export function getPlanHistory(limit = 20) {
  return db
    .prepare(`
      SELECT id, province, score, rank_value, ai_provider, created_at, result_json
      FROM plans
      ORDER BY id DESC
      LIMIT ?
    `)
    .all(limit)
    .map((item) => ({
      id: item.id,
      province: item.province,
      score: item.score,
      rank: item.rank_value,
      aiProvider: item.ai_provider,
      createdAt: item.created_at,
      result: JSON.parse(item.result_json)
    }));
}

export function getChatHistory(limit = 20) {
  return db
    .prepare(`
      SELECT id, provider, messages_json, reply_text, created_at
      FROM chat_history
      ORDER BY id DESC
      LIMIT ?
    `)
    .all(limit)
    .map((item) => ({
      id: item.id,
      provider: item.provider,
      messages: JSON.parse(item.messages_json),
      replyText: item.reply_text,
      createdAt: item.created_at
    }));
}

export function getImportHistory(limit = 20) {
  return db
    .prepare(`
      SELECT id, dataset_type, file_name, row_count, created_at
      FROM imports
      ORDER BY id DESC
      LIMIT ?
    `)
    .all(limit)
    .map((item) => ({
      id: item.id,
      datasetType: item.dataset_type,
      fileName: item.file_name,
      rowCount: item.row_count,
      createdAt: item.created_at
    }));
}

function ensureDefaultAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123456";
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);

  if (!existing) {
    db.prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)")
      .run(username, hashPassword(password), new Date().toISOString());
  }
}

function hashPassword(password) {
  return crypto.scryptSync(password, "gaokao-app-salt", 64).toString("hex");
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}
