import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { ROLE_DEFINITIONS, ROLES, normalizeRole } from "../../shared/rbac.js";
import { createDataEngineCoreSchema, createDataEngine } from "../modules/data-engine/index.js";

const USER_ROLES = Object.keys(ROLE_DEFINITIONS);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");
const storageDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(apiRoot, "storage");
const dbPath = path.join(storageDir, "app.db");

fs.mkdirSync(storageDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'teacher',
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

  CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    refresh_token_hash TEXT NOT NULL,
    current_refresh_jti TEXT NOT NULL,
    current_access_jti TEXT,
    remember_me INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    idle_expires_at TEXT NOT NULL,
    revoked_at TEXT,
    revoked_reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    auth_method TEXT NOT NULL DEFAULT 'password',
    device_label TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS auth_token_blacklist (
    jti TEXT PRIMARY KEY,
    token_type TEXT NOT NULL,
    user_id INTEGER,
    session_id TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    reason TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS auth_login_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    session_id TEXT,
    success INTEGER NOT NULL DEFAULT 0,
    auth_method TEXT NOT NULL DEFAULT 'password',
    remember_me INTEGER NOT NULL DEFAULT 1,
    ip_address TEXT,
    user_agent TEXT,
    failure_reason TEXT,
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

createDataEngineCoreSchema(db);

ensureUsersRoleColumn();
ensureChatSessionColumn();
ensureUsersLastLoginColumn();
ensureUsersTokenVersionColumn();
ensureUsersReservedIdentityColumns();
ensureDatabaseIndexes();
ensureDefaultAdmin();

const dataEngine = createDataEngine(db);

export function getUsageStatsForIdentity({ userId, trialToken }) {
  const planCount = userId
    ? Number(
        db.prepare("SELECT COUNT(*) AS total FROM plans WHERE user_id = ?").get(userId)?.total || 0
      )
    : 0;
  const chatCount = userId
    ? Number(
        db.prepare("SELECT COUNT(*) AS total FROM chat_history WHERE user_id = ?").get(userId)
          ?.total || 0
      )
    : 0;

  const trialUsageCount = trialToken
    ? Number(
        db
          .prepare("SELECT COUNT(*) AS total FROM trial_usage WHERE trial_token = ?")
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

  db.prepare(
    `
    INSERT INTO trial_usage (trial_token, action_type, created_at)
    VALUES (?, ?, ?)
  `
  ).run(trialToken, actionType, new Date().toISOString());
}

export function getDatabaseHandle() {
  return db;
}

export function getDataEngine() {
  return dataEngine;
}

export function authenticateUser(username, password) {
  const user = db
    .prepare(
      `
      SELECT id, username, role, password_hash, created_at, last_login_at, token_version
      FROM users
      WHERE username = ?
    `
    )
    .get(username);

  if (!user || !verifyAndUpgradeUserPassword(user.id, password, user.password_hash)) {
    return null;
  }

  const lastLoginAt = new Date().toISOString();
  const token = crypto.randomUUID();
  db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(lastLoginAt, user.id);
  db.prepare("INSERT INTO auth_tokens (token, user_id, created_at) VALUES (?, ?, ?)").run(
    token,
    user.id,
    new Date().toISOString()
  );

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
    .prepare(
      `
      SELECT users.id, users.username, users.role, users.created_at
        , users.last_login_at
      FROM auth_tokens
      JOIN users ON users.id = auth_tokens.user_id
      WHERE auth_tokens.token = ?
    `
    )
    .get(token);

  return record ? normalizeUser(record) : null;
}

export function listUsers() {
  return db
    .prepare(
      `
      SELECT id, username, role, created_at
        , last_login_at
      FROM users
      ORDER BY
        CASE
          WHEN role = 'super_admin' THEN 0
          WHEN role = 'admin' THEN 1
          WHEN role = 'teacher' THEN 2
          WHEN role = 'student' THEN 3
          ELSE 4
        END,
        id ASC
    `
    )
    .all()
    .map((user) => ({
      ...normalizeUser(user),
      isBootstrapAdmin: user.username === getBootstrapAdminUsername()
    }));
}

export function findUserAuthRecordByUsername(username) {
  return (
    db
      .prepare(
        `
        SELECT id, username, role, password_hash, created_at, last_login_at, token_version
        FROM users
        WHERE username = ?
      `
      )
      .get(username) || null
  );
}

export function findUserAuthRecordById(userId) {
  return (
    db
      .prepare(
        `
        SELECT id, username, role, password_hash, created_at, last_login_at, token_version
        FROM users
        WHERE id = ?
      `
      )
      .get(userId) || null
  );
}

export function touchUserLastLogin(userId, timestamp = new Date().toISOString()) {
  db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(timestamp, userId);
}

export function createUser({ username, password, role = "teacher" }) {
  const normalizedRole = normalizeIncomingRole(role);
  assertValidRole(normalizedRole);

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    throw new Error("该用户名已存在");
  }

  db.prepare(
    `
    INSERT INTO users (username, role, password_hash, created_at, token_version)
    VALUES (?, ?, ?, ?, 0)
  `
  ).run(username, normalizedRole, createPasswordHash(password), new Date().toISOString());

  return getUserByUsername(username);
}

export function updateUserPassword(userId, password) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error("用户不存在");
  }

  db.prepare("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?").run(
    createPasswordHash(password),
    userId
  );

  db.prepare("DELETE FROM auth_tokens WHERE user_id = ?").run(userId);
  db
    .prepare(
      `
      UPDATE auth_sessions
      SET revoked_at = ?, revoked_reason = ?
      WHERE user_id = ? AND revoked_at IS NULL
    `
    )
    .run(new Date().toISOString(), "password_changed", userId);

  return getUserById(userId);
}

export function updateUserRole(userId, role) {
  const normalizedRole = normalizeIncomingRole(role);
  assertValidRole(normalizedRole);

  const user = getUserById(userId);
  if (!user) {
    throw new Error("用户不存在");
  }

  if (user.username === getBootstrapAdminUsername() && normalizedRole !== ROLES.SUPER_ADMIN) {
    throw new Error("默认管理员账号必须保留管理员权限");
  }

  db.prepare("UPDATE users SET role = ?, token_version = token_version + 1 WHERE id = ?").run(
    normalizedRole,
    userId
  );
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
  db.prepare("DELETE FROM auth_sessions WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM auth_login_logs WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM auth_token_blacklist WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
}

export function savePlanHistory({ userId, profile, result }) {
  db.prepare(
    `
    INSERT INTO plans (user_id, province, score, rank_value, ai_provider, result_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
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
  db.prepare(
    `
    INSERT INTO chat_history (user_id, session_id, provider, messages_json, reply_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(
    userId || null,
    null,
    provider,
    JSON.stringify(messages),
    replyText,
    new Date().toISOString()
  );
}

export function saveChatSessionHistory({ userId, sessionId, provider, messages, replyText }) {
  db.prepare(
    `
    INSERT INTO chat_history (user_id, session_id, provider, messages_json, reply_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(
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
      .prepare(
        `
        SELECT id, session_id, provider, messages_json, reply_text, created_at
        FROM chat_history
        WHERE session_id = ?
        ORDER BY id DESC
        LIMIT 1
      `
      )
      .get(sessionId);
  } else if (userId) {
    row = db
      .prepare(
        `
        SELECT id, session_id, provider, messages_json, reply_text, created_at
        FROM chat_history
        WHERE session_id = ? AND user_id = ?
        ORDER BY id DESC
        LIMIT 1
      `
      )
      .get(sessionId, userId);
  } else {
    row = db
      .prepare(
        `
        SELECT id, session_id, provider, messages_json, reply_text, created_at
        FROM chat_history
        WHERE session_id = ? AND user_id IS NULL
        ORDER BY id DESC
        LIMIT 1
      `
      )
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
  db.prepare(
    `
    INSERT INTO imports (user_id, dataset_type, file_name, row_count, created_at)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(userId || null, datasetType, fileName, rowCount, new Date().toISOString());
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
    : db
        .prepare(`${baseSql} WHERE user_id = ? ORDER BY id DESC LIMIT ?`)
        .all(userId || 0, safeLimit);

  return rows.map(mapper);
}

function ensureUsersRoleColumn() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasRoleColumn = columns.some((column) => column.name === "role");

  if (!hasRoleColumn) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'teacher'");
  }

  db.prepare("UPDATE users SET role = 'teacher' WHERE role = 'advisor'").run();
  db.prepare("UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''").run();
}

function ensureDatabaseIndexes() {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id
      ON auth_tokens (user_id);

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_revoked_last_seen
      ON auth_sessions (user_id, revoked_at, last_seen_at DESC);

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
      ON auth_sessions (expires_at);

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_idle_expires_at
      ON auth_sessions (idle_expires_at);

    CREATE INDEX IF NOT EXISTS idx_auth_token_blacklist_expires_at
      ON auth_token_blacklist (expires_at);

    CREATE INDEX IF NOT EXISTS idx_auth_token_blacklist_user_id
      ON auth_token_blacklist (user_id);

    CREATE INDEX IF NOT EXISTS idx_auth_login_logs_user_id_id_desc
      ON auth_login_logs (user_id, id DESC);

    CREATE INDEX IF NOT EXISTS idx_plans_user_id_id_desc
      ON plans (user_id, id DESC);

    CREATE INDEX IF NOT EXISTS idx_chat_history_user_id_id_desc
      ON chat_history (user_id, id DESC);

    CREATE INDEX IF NOT EXISTS idx_chat_history_session_id_user_id_id_desc
      ON chat_history (session_id, user_id, id DESC);

    CREATE INDEX IF NOT EXISTS idx_imports_user_id_id_desc
      ON imports (user_id, id DESC);

    CREATE INDEX IF NOT EXISTS idx_trial_usage_trial_token_id_desc
      ON trial_usage (trial_token, id DESC);
  `);
}

function ensureUsersLastLoginColumn() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasLastLoginColumn = columns.some((column) => column.name === "last_login_at");

  if (!hasLastLoginColumn) {
    db.exec("ALTER TABLE users ADD COLUMN last_login_at TEXT");
  }
}

function ensureUsersTokenVersionColumn() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasTokenVersionColumn = columns.some((column) => column.name === "token_version");

  if (!hasTokenVersionColumn) {
    db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0");
  }
}

function ensureUsersReservedIdentityColumns() {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const requiredColumns = [
    { name: "email", definition: "TEXT" },
    { name: "email_verified_at", definition: "TEXT" },
    { name: "phone_number", definition: "TEXT" },
    { name: "oauth_google_sub", definition: "TEXT" },
    { name: "oauth_wechat_openid", definition: "TEXT" }
  ];

  requiredColumns.forEach((column) => {
    if (!columns.some((item) => item.name === column.name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${column.name} ${column.definition}`);
    }
  });
}

function ensureDefaultAdmin() {
  const username = getBootstrapAdminUsername();
  const password = process.env.ADMIN_PASSWORD;
  const existing = db
    .prepare("SELECT id, username, role, password_hash FROM users WHERE username = ?")
    .get(username);

  if (existing && normalizeIncomingRole(existing.role) !== ROLES.SUPER_ADMIN) {
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(ROLES.SUPER_ADMIN, existing.id);
  }

  if (!password) {
    console.warn(
      `[auth] ADMIN_PASSWORD is not set. Bootstrap admin "${username}" was not created or updated.`
    );
    return;
  }

  const passwordHash = createPasswordHash(password);

  if (!existing) {
    db.prepare(
      `
      INSERT INTO users (username, role, password_hash, created_at, token_version)
      VALUES (?, ?, ?, ?, 0)
    `
    ).run(username, ROLES.SUPER_ADMIN, passwordHash, new Date().toISOString());
    return;
  }

  if (existing.password_hash !== passwordHash || normalizeIncomingRole(existing.role) !== ROLES.SUPER_ADMIN) {
    db.prepare("UPDATE users SET password_hash = ?, role = ? WHERE id = ?").run(
      passwordHash,
      ROLES.SUPER_ADMIN,
      existing.id
    );
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
    .prepare(
      "SELECT id, username, role, created_at, last_login_at, token_version FROM users WHERE id = ?"
    )
    .get(userId);

  return user ? normalizeUser(user) : null;
}

function getUserByUsername(username) {
  const user = db
    .prepare(
      "SELECT id, username, role, created_at, last_login_at, token_version FROM users WHERE username = ?"
    )
    .get(username);

  return user ? normalizeUser(user) : null;
}

function getBootstrapAdminUsername() {
  return process.env.ADMIN_USERNAME || "LYYzhiyuan";
}

export function normalizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: normalizeIncomingRole(user.role),
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at || null
  };
}

function assertValidRole(role) {
  if (!USER_ROLES.includes(normalizeIncomingRole(role))) {
    throw new Error("无效的用户角色");
  }
}

function normalizeIncomingRole(role) {
  return normalizeRole(role);
}

export function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyStoredPassword(password, storedHash) {
  const normalizedHash = String(storedHash || "");

  if (normalizedHash.startsWith("scrypt$")) {
    const [, salt, expectedHash] = normalizedHash.split("$");
    if (!salt || !expectedHash) {
      return false;
    }

    const actualBuffer = Buffer.from(crypto.scryptSync(password, salt, 64).toString("hex"), "hex");
    const expectedBuffer = Buffer.from(expectedHash, "hex");
    return actualBuffer.length === expectedBuffer.length
      ? crypto.timingSafeEqual(actualBuffer, expectedBuffer)
      : false;
  }

  return hashPasswordLegacy(password) === normalizedHash;
}

export function verifyAndUpgradeUserPassword(userId, password, storedHash) {
  const valid = verifyStoredPassword(password, storedHash);
  if (!valid) {
    return false;
  }

  if (!String(storedHash || "").startsWith("scrypt$")) {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(createPasswordHash(password), userId);
  }

  return true;
}

function hashPasswordLegacy(password) {
  return crypto.scryptSync(password, "gaokao-app-salt", 64).toString("hex");
}
