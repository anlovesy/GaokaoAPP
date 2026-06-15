import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const USER_ROLES = ["admin", "advisor"];

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
    role TEXT NOT NULL DEFAULT 'advisor',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT
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
    session_id TEXT,
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

  CREATE TABLE IF NOT EXISTS trial_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trial_token TEXT NOT NULL,
    action_type TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

ensureUsersRoleColumn();
ensureChatSessionColumn();
ensureUsersLastLoginColumn();
ensureDefaultAdmin();

export function getUsageStatsForIdentity({ userId, trialToken }) {
  const planCount = userId
    ? Number(
        db.prepare("SELECT COUNT(*) AS total FROM plans WHERE user_id = ?").get(userId)?.total || 0
      )
    : 0;
  const chatCount = userId
    ? Number(
        db.prepare("SELECT COUNT(*) AS total FROM chat_history WHERE user_id = ?").get(userId)?.total || 0
      )
    : 0;

  const trialUsageCount = trialToken
    ? Number(
        db.prepare("SELECT COUNT(*) AS total FROM trial_usage WHERE trial_token = ?")
          .get(trialToken)?.total || 0
      )
    : 0;

  return {
    planCount,
    chatCount,
    trialUsageCount
  };
}

export function registerTrialUsage({ trialToken, actionType }) {
  if (!trialToken) {
    return;
  }

  db.prepare(`
    INSERT INTO trial_usage (trial_token, action_type, created_at)
    VALUES (?, ?, ?)
  `).run(trialToken, actionType, new Date().toISOString());
}

export function authenticateUser(username, password) {
  const user = db
    .prepare(`
      SELECT id, username, role, password_hash, created_at, last_login_at
      FROM users
      WHERE username = ?
    `)
    .get(username);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  const lastLoginAt = new Date().toISOString();
  const token = crypto.randomUUID();
  db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(lastLoginAt, user.id);
  db.prepare("INSERT INTO auth_tokens (token, user_id, created_at) VALUES (?, ?, ?)")
    .run(token, user.id, new Date().toISOString());

  return {
    token,
    user: normalizeUser({
      ...user,
      last_login_at: lastLoginAt
    })
  };
}

export function revokeToken(token) {
  if (!token) {
    return;
  }

  db.prepare("DELETE FROM auth_tokens WHERE token = ?").run(token);
}

export function getUserFromToken(token) {
  if (!token) {
    return null;
  }

  const record = db
    .prepare(`
      SELECT users.id, users.username, users.role, users.created_at
        , users.last_login_at
      FROM auth_tokens
      JOIN users ON users.id = auth_tokens.user_id
      WHERE auth_tokens.token = ?
    `)
    .get(token);

  return record ? normalizeUser(record) : null;
}

export function listUsers() {
  return db
    .prepare(`
      SELECT id, username, role, created_at
        , last_login_at
      FROM users
      ORDER BY
        CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
        id ASC
    `)
    .all()
    .map((user) => ({
      ...normalizeUser(user),
      isBootstrapAdmin: user.username === getBootstrapAdminUsername()
    }));
}

export function createUser({ username, password, role = "advisor" }) {
  assertValidRole(role);

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    throw new Error("该用户名已存在");
  }

  db.prepare(`
    INSERT INTO users (username, role, password_hash, created_at)
    VALUES (?, ?, ?, ?)
  `).run(username, role, hashPassword(password), new Date().toISOString());

  return getUserByUsername(username);
}

export function updateUserPassword(userId, password) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error("用户不存在");
  }

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(hashPassword(password), userId);

  db.prepare("DELETE FROM auth_tokens WHERE user_id = ?").run(userId);

  return getUserById(userId);
}

export function updateUserRole(userId, role) {
  assertValidRole(role);

  const user = getUserById(userId);
  if (!user) {
    throw new Error("用户不存在");
  }

  if (user.username === getBootstrapAdminUsername() && role !== "admin") {
    throw new Error("默认管理员账号必须保留管理员权限");
  }

  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  return getUserById(userId);
}

export function deleteUser(userId) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error("用户不存在");
  }

  if (user.username === getBootstrapAdminUsername()) {
    throw new Error("默认管理员账号不能删除");
  }

  db.prepare("UPDATE plans SET user_id = NULL WHERE user_id = ?").run(userId);
  db.prepare("UPDATE chat_history SET user_id = NULL WHERE user_id = ?").run(userId);
  db.prepare("UPDATE imports SET user_id = NULL WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM auth_tokens WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
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
    INSERT INTO chat_history (user_id, session_id, provider, messages_json, reply_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId || null,
    null,
    provider,
    JSON.stringify(messages),
    replyText,
    new Date().toISOString()
  );
}

export function saveChatSessionHistory({ userId, sessionId, provider, messages, replyText }) {
  db.prepare(`
    INSERT INTO chat_history (user_id, session_id, provider, messages_json, reply_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId || null,
    sessionId || null,
    provider,
    JSON.stringify(messages),
    replyText,
    new Date().toISOString()
  );
}

export function getLatestChatSession({ userId, sessionId, isAdmin = false }) {
  if (!sessionId) {
    return null;
  }

  let row;

  if (isAdmin) {
    row = db
      .prepare(`
        SELECT id, session_id, provider, messages_json, reply_text, created_at
        FROM chat_history
        WHERE session_id = ?
        ORDER BY id DESC
        LIMIT 1
      `)
      .get(sessionId);
  } else if (userId) {
    row = db
      .prepare(`
        SELECT id, session_id, provider, messages_json, reply_text, created_at
        FROM chat_history
        WHERE session_id = ? AND user_id = ?
        ORDER BY id DESC
        LIMIT 1
      `)
      .get(sessionId, userId);
  } else {
    row = db
      .prepare(`
        SELECT id, session_id, provider, messages_json, reply_text, created_at
        FROM chat_history
        WHERE session_id = ? AND user_id IS NULL
        ORDER BY id DESC
        LIMIT 1
      `)
      .get(sessionId);
  }

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    sessionId: row.session_id,
    provider: row.provider,
    messages: JSON.parse(row.messages_json),
    replyText: row.reply_text,
    createdAt: row.created_at
  };
}

export function saveImportHistory({ userId, datasetType, fileName, rowCount }) {
  db.prepare(`
    INSERT INTO imports (user_id, dataset_type, file_name, row_count, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId || null, datasetType, fileName, rowCount, new Date().toISOString());
}

export function getPlanHistory({ limit = 20, userId, isAdmin = false } = {}) {
  return runHistoryQuery({
    table: "plans",
    columns: "id, province, score, rank_value, ai_provider, created_at, result_json",
    mapper: (item) => ({
      id: item.id,
      province: item.province,
      score: item.score,
      rank: item.rank_value,
      aiProvider: item.ai_provider,
      createdAt: item.created_at,
      result: JSON.parse(item.result_json)
    }),
    limit,
    userId,
    isAdmin
  });
}

export function getChatHistory({ limit = 20, userId, isAdmin = false } = {}) {
  return runHistoryQuery({
    table: "chat_history",
    columns: "id, session_id, provider, messages_json, reply_text, created_at",
    mapper: (item) => ({
      id: item.id,
      sessionId: item.session_id,
      provider: item.provider,
      messages: JSON.parse(item.messages_json),
      replyText: item.reply_text,
      createdAt: item.created_at
    }),
    limit,
    userId,
    isAdmin
  });
}

export function getImportHistory({ limit = 20, userId, isAdmin = false } = {}) {
  return runHistoryQuery({
    table: "imports",
    columns: "id, dataset_type, file_name, row_count, created_at",
    mapper: (item) => ({
      id: item.id,
      datasetType: item.dataset_type,
      fileName: item.file_name,
      rowCount: item.row_count,
      createdAt: item.created_at
    }),
    limit,
    userId,
    isAdmin
  });
}

function runHistoryQuery({ table, columns, mapper, limit, userId, isAdmin }) {
  const safeLimit = Number(limit) > 0 ? Number(limit) : 20;
  const baseSql = `
    SELECT ${columns}
    FROM ${table}
  `;

  const rows = isAdmin
    ? db.prepare(`${baseSql} ORDER BY id DESC LIMIT ?`).all(safeLimit)
    : db.prepare(`${baseSql} WHERE user_id = ? ORDER BY id DESC LIMIT ?`).all(userId || 0, safeLimit);

  return rows.map(mapper);
}

function ensureUsersRoleColumn() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasRoleColumn = columns.some((column) => column.name === "role");

  if (!hasRoleColumn) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'advisor'");
  }

  db.prepare("UPDATE users SET role = 'advisor' WHERE role IS NULL OR role = ''").run();
}

function ensureUsersLastLoginColumn() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasLastLoginColumn = columns.some((column) => column.name === "last_login_at");

  if (!hasLastLoginColumn) {
    db.exec("ALTER TABLE users ADD COLUMN last_login_at TEXT");
  }
}

function ensureDefaultAdmin() {
  const username = getBootstrapAdminUsername();
  const password = process.env.ADMIN_PASSWORD;
  const existing = db
    .prepare("SELECT id, username, role, password_hash FROM users WHERE username = ?")
    .get(username);

  if (existing && existing.role !== "admin") {
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
  }

  if (!password) {
    console.warn(
      `[auth] ADMIN_PASSWORD is not set. Bootstrap admin "${username}" was not created or updated.`
    );
    return;
  }

  const passwordHash = hashPassword(password);

  if (!existing) {
    db.prepare(`
      INSERT INTO users (username, role, password_hash, created_at)
      VALUES (?, 'admin', ?, ?)
    `).run(username, passwordHash, new Date().toISOString());
    return;
  }

  if (existing.password_hash !== passwordHash || existing.role !== "admin") {
    db.prepare("UPDATE users SET password_hash = ?, role = 'admin' WHERE id = ?")
      .run(passwordHash, existing.id);
  }
}

function ensureChatSessionColumn() {
  const columns = db.prepare("PRAGMA table_info(chat_history)").all();
  const hasSessionIdColumn = columns.some((column) => column.name === "session_id");

  if (!hasSessionIdColumn) {
    db.exec("ALTER TABLE chat_history ADD COLUMN session_id TEXT");
  }
}

function getUserById(userId) {
  const user = db
    .prepare("SELECT id, username, role, created_at, last_login_at FROM users WHERE id = ?")
    .get(userId);

  return user ? normalizeUser(user) : null;
}

function getUserByUsername(username) {
  const user = db
    .prepare("SELECT id, username, role, created_at, last_login_at FROM users WHERE username = ?")
    .get(username);

  return user ? normalizeUser(user) : null;
}

function getBootstrapAdminUsername() {
  return process.env.ADMIN_USERNAME || "LYYzhiyuan";
}

function normalizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role || "advisor",
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at || null
  };
}

function assertValidRole(role) {
  if (!USER_ROLES.includes(role)) {
    throw new Error("无效的用户角色");
  }
}

function hashPassword(password) {
  return crypto.scryptSync(password, "gaokao-app-salt", 64).toString("hex");
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}
