import crypto from "node:crypto";
import { AuthError } from "../errors/appError.js";
import {
  findUserAuthRecordById,
  findUserAuthRecordByUsername,
  getDatabaseHandle,
  normalizeUser,
  touchUserLastLogin,
  verifyAndUpgradeUserPassword
} from "./dbService.js";
import { buildUserAccessContext, hasAdminPanelAccess } from "./rbacService.js";

const db = getDatabaseHandle();

export const ACCESS_COOKIE_NAME = "gaokao_access_token";
export const REFRESH_COOKIE_NAME = "gaokao_refresh_token";

const ACCESS_TOKEN_TTL_SECONDS = toPositiveInt(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS, 15 * 60);
const ACCESS_ROTATE_THRESHOLD_SECONDS = toPositiveInt(
  process.env.AUTH_ACCESS_ROTATE_THRESHOLD_SECONDS,
  5 * 60
);
const REFRESH_TOKEN_TTL_SECONDS = toPositiveInt(
  process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS,
  7 * 24 * 60 * 60
);
const REFRESH_TOKEN_REMEMBER_ME_TTL_SECONDS = toPositiveInt(
  process.env.AUTH_REFRESH_TOKEN_REMEMBER_ME_TTL_SECONDS,
  30 * 24 * 60 * 60
);
const SESSION_IDLE_TTL_SECONDS = toPositiveInt(
  process.env.AUTH_SESSION_IDLE_TTL_SECONDS,
  14 * 24 * 60 * 60
);
const COOKIE_SECURE =
  String(process.env.AUTH_COOKIE_SECURE || process.env.NODE_ENV || "")
    .toLowerCase()
    .trim() === "production";
const COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN || undefined;
const ISSUER = process.env.AUTH_TOKEN_ISSUER || "gaokao-planner-agent";
const AUDIENCE = process.env.AUTH_TOKEN_AUDIENCE || "gaokao-planner-web";
const SECRET = resolveJwtSecret();

export function getClientMetadata(request) {
  const forwardedFor = String(request.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  const ipAddress =
    forwardedFor ||
    request.headers["x-real-ip"] ||
    request.socket?.remoteAddress ||
    request.ip ||
    "";
  const userAgent = String(request.headers["user-agent"] || "").slice(0, 512);

  return {
    ipAddress: ipAddress ? String(ipAddress).slice(0, 128) : "",
    userAgent
  };
}

export function parseAuthCookies(request) {
  const cookieHeader = String(request.headers.cookie || "");
  const cookies = {};

  cookieHeader.split(";").forEach((chunk) => {
    const [name, ...rest] = chunk.trim().split("=");
    if (!name) {
      return;
    }

    cookies[name] = decodeURIComponent(rest.join("=") || "");
  });

  return {
    accessToken: cookies[ACCESS_COOKIE_NAME] || "",
    refreshToken: cookies[REFRESH_COOKIE_NAME] || ""
  };
}

export function resolveBearerToken(request) {
  const header = String(request.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export function loginWithPassword(request, { username, password, rememberMe = true }) {
  cleanupExpiredAuthArtifacts();

  const metadata = getClientMetadata(request);
  const userRecord = findUserAuthRecordByUsername(username);

  if (!userRecord || !verifyAndUpgradeUserPassword(userRecord.id, password, userRecord.password_hash)) {
    insertLoginLog({
      userId: userRecord?.id || null,
      username,
      success: false,
      rememberMe,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      failureReason: "invalid_credentials"
    });
    throw new AuthError("用户名或密码错误", 401, "INVALID_CREDENTIALS");
  }

  const now = new Date();
  const session = createSessionRecord({
    user: userRecord,
    rememberMe,
    metadata,
    authMethod: "password",
    now
  });

  touchUserLastLogin(userRecord.id, now.toISOString());

  insertLoginLog({
    userId: userRecord.id,
    username: userRecord.username,
    success: true,
    rememberMe,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    sessionId: session.id
  });

  return {
    token: session.accessToken,
    user: buildUserAccessContext(
      normalizeUser({
        ...userRecord,
        last_login_at: now.toISOString()
      })
    ),
    session: toSessionPayload(session),
    refreshToken: session.refreshToken
  };
}

export function writeLoginCookies(response, authResult) {
  applyAuthCookies(response, {
    accessToken: authResult.token,
    refreshToken: authResult.refreshToken,
    accessExpiresAt: authResult.session.accessExpiresAt,
    refreshExpiresAt: authResult.session.refreshExpiresAt,
    rememberMe: authResult.session.rememberMe
  });
  response.setHeader("X-Access-Token", authResult.token);
  response.setHeader("X-Session-Id", authResult.session.id);
}

export function clearAuthCookies(response) {
  response.clearCookie(ACCESS_COOKIE_NAME, getBaseCookieOptions());
  response.clearCookie(REFRESH_COOKIE_NAME, getBaseCookieOptions());
}

export function requireAuthContext(request, response, options = {}) {
  const context = resolveAuthContext(request, response, options);
  if (!context?.user) {
    throw new AuthError("未登录或登录已失效", 401, "AUTH_REQUIRED");
  }

  return context;
}

export function requireAdminContext(request, response, options = {}) {
  const context = requireAuthContext(request, response, options);
  if (!hasAdminPanelAccess(context.user)) {
    throw new AuthError("当前账号没有管理员权限", 403, "ADMIN_REQUIRED");
  }

  return context;
}

export function resolveAuthContext(request, response, options = {}) {
  cleanupExpiredAuthArtifacts();

  const allowRefresh = options.allowRefresh !== false;
  const { accessToken: accessCookieToken, refreshToken } = parseAuthCookies(request);
  const bearerToken = resolveBearerToken(request);
  const accessCandidates = [bearerToken, accessCookieToken].filter(Boolean);

  for (const candidateToken of accessCandidates) {
    const accessContext = validateAccessToken(candidateToken);
    if (accessContext.ok) {
      const maybeRotated =
        allowRefresh && shouldRotateAccessToken(accessContext.payload)
          ? tryRefreshFromToken(refreshToken, request, response)
          : null;

      return maybeRotated || accessContext.context;
    }
  }

  if (!allowRefresh || !refreshToken) {
    return null;
  }

  return tryRefreshFromToken(refreshToken, request, response);
}

export function refreshAuthSession(request, response) {
  const { refreshToken } = parseAuthCookies(request);
  if (!refreshToken) {
    throw new AuthError("刷新令牌不存在，请重新登录", 401, "REFRESH_TOKEN_MISSING");
  }

  const context = tryRefreshFromToken(refreshToken, request, response);
  if (!context) {
    throw new AuthError("登录已失效，请重新登录", 401, "REFRESH_TOKEN_INVALID");
  }

  return {
    token: context.accessToken,
    user: context.user,
    session: context.session,
    refreshToken: context.refreshToken
  };
}

export function logoutCurrentSession(request, response, { revokeAll = false } = {}) {
  const authContext = resolveAuthContext(request, response, { allowRefresh: true });
  const { refreshToken } = parseAuthCookies(request);
  const token = authContext?.accessToken || resolveBearerToken(request);

  if (revokeAll && authContext?.user) {
    revokeAllSessionsForUser(authContext.user.id, "logout_all");
  } else if (authContext?.session?.id) {
    revokeSessionById(authContext.session.id, {
      reason: "logout",
      accessToken: token,
      refreshToken
    });
  } else if (refreshToken) {
    revokeSessionByRefreshToken(refreshToken, "logout");
  }

  clearAuthCookies(response);
}

export function listActiveSessionsForUser(userId, currentSessionId = "") {
  cleanupExpiredAuthArtifacts();

  return db
    .prepare(
      `
      SELECT id, user_id, remember_me, created_at, updated_at, last_seen_at, expires_at,
             idle_expires_at, revoked_at, revoked_reason, ip_address, user_agent, auth_method,
             device_label
      FROM auth_sessions
      WHERE user_id = ? AND revoked_at IS NULL AND datetime(expires_at) > datetime('now')
      ORDER BY datetime(last_seen_at) DESC
    `
    )
    .all(userId)
    .map((row) => ({
      id: row.id,
      rememberMe: Boolean(row.remember_me),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSeenAt: row.last_seen_at,
      expiresAt: row.expires_at,
      idleExpiresAt: row.idle_expires_at,
      revokedAt: row.revoked_at || null,
      revokedReason: row.revoked_reason || null,
      ipAddress: row.ip_address || "",
      userAgent: row.user_agent || "",
      authMethod: row.auth_method || "password",
      deviceLabel: row.device_label || buildDeviceLabel(row.user_agent),
      isCurrent: row.id === currentSessionId
    }));
}

export function revokeOwnedSession({ actorUserId, sessionId, currentSessionId = "" }) {
  const session = db
    .prepare(
      `
      SELECT id, user_id
      FROM auth_sessions
      WHERE id = ?
    `
    )
    .get(sessionId);

  if (!session) {
    throw new AuthError("会话不存在", 404, "SESSION_NOT_FOUND");
  }

  if (Number(session.user_id) !== Number(actorUserId)) {
    throw new AuthError("不能管理其他账号的会话", 403, "SESSION_FORBIDDEN");
  }

  revokeSessionById(sessionId, {
    reason: sessionId === currentSessionId ? "logout_current" : "session_revoked"
  });
}

export function listLoginLogsForUser(userId, { limit = 30 } = {}) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 30));
  return db
    .prepare(
      `
      SELECT id, username, session_id, success, auth_method, remember_me, ip_address,
             user_agent, failure_reason, created_at
      FROM auth_login_logs
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ?
    `
    )
    .all(userId, safeLimit)
    .map((row) => ({
      id: row.id,
      username: row.username,
      sessionId: row.session_id || null,
      success: Boolean(row.success),
      authMethod: row.auth_method || "password",
      rememberMe: Boolean(row.remember_me),
      ipAddress: row.ip_address || "",
      userAgent: row.user_agent || "",
      failureReason: row.failure_reason || null,
      createdAt: row.created_at
    }));
}

function tryRefreshFromToken(refreshToken, request, response) {
  const refreshPayloadResult = verifyJwt(refreshToken, "refresh");
  if (!refreshPayloadResult.ok) {
    return null;
  }

  const refreshPayload = refreshPayloadResult.payload;
  if (isBlacklisted(refreshPayload.jti)) {
    revokeSessionById(refreshPayload.sid, { reason: "blacklisted_refresh_token" });
    return null;
  }

  const session = findSessionById(refreshPayload.sid);
  const userRecord = findUserAuthRecordById(Number(refreshPayload.sub));
  const now = new Date();

  if (!session || !userRecord) {
    return null;
  }

  if (!isSessionUsable(session, now)) {
    return null;
  }

  if (Number(userRecord.token_version || 0) !== Number(refreshPayload.ver || 0)) {
    revokeSessionById(session.id, { reason: "token_version_mismatch" });
    return null;
  }

  if (
    session.current_refresh_jti !== refreshPayload.jti ||
    !verifyOpaqueToken(refreshToken, session.refresh_token_hash)
  ) {
    revokeSessionById(session.id, { reason: "refresh_reuse_detected" });
    blacklistToken({
      jti: refreshPayload.jti,
      tokenType: "refresh",
      userId: userRecord.id,
      sessionId: session.id,
      expiresAt: new Date(refreshPayload.exp * 1000).toISOString(),
      reason: "refresh_reuse_detected"
    });
    return null;
  }

  const metadata = getClientMetadata(request);
  const rotated = rotateSessionTokens({
    session,
    userRecord,
    now,
    metadata,
    previousAccessToken: resolveBearerToken(request) || parseAuthCookies(request).accessToken,
    previousRefreshToken: refreshToken
  });

  if (response) {
    applyAuthCookies(response, {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      accessExpiresAt: rotated.accessExpiresAt,
      refreshExpiresAt: rotated.refreshExpiresAt,
      rememberMe: rotated.rememberMe
    });
    response.setHeader("X-Access-Token", rotated.accessToken);
    response.setHeader("X-Session-Id", rotated.id);
  }

  return {
    user: buildUserAccessContext(
      normalizeUser({
        ...userRecord,
        last_login_at: userRecord.last_login_at
      })
    ),
    session: toSessionPayload(rotated),
    accessToken: rotated.accessToken,
    refreshToken: rotated.refreshToken
  };
}

function validateAccessToken(token) {
  const payloadResult = verifyJwt(token, "access");
  if (!payloadResult.ok) {
    return payloadResult;
  }

  const payload = payloadResult.payload;
  if (isBlacklisted(payload.jti)) {
    return { ok: false, code: "BLACKLISTED_ACCESS_TOKEN" };
  }

  const session = findSessionById(payload.sid);
  const userRecord = findUserAuthRecordById(Number(payload.sub));
  const now = new Date();

  if (!session || !userRecord || !isSessionUsable(session, now)) {
    return { ok: false, code: "SESSION_INVALID" };
  }

  if (Number(userRecord.token_version || 0) !== Number(payload.ver || 0)) {
    return { ok: false, code: "TOKEN_VERSION_MISMATCH" };
  }

  if (session.current_access_jti && session.current_access_jti !== payload.jti) {
    return { ok: false, code: "ACCESS_TOKEN_SUPERSEDED" };
  }

  touchSessionActivity(session.id, now, getClientMetadataFromSession(session));

  return {
    ok: true,
    payload,
    context: {
      user: buildUserAccessContext(
        normalizeUser({
          ...userRecord,
          last_login_at: userRecord.last_login_at
        })
      ),
      session: {
        ...toSessionPayload(session),
        accessExpiresAt: new Date(payload.exp * 1000).toISOString()
      },
      accessToken: token,
      refreshToken: "",
      accessPayload: payload
    }
  };
}

function createSessionRecord({ user, rememberMe, metadata, authMethod, now }) {
  const sessionId = crypto.randomUUID();
  const currentAccessJti = crypto.randomUUID();
  const currentRefreshJti = crypto.randomUUID();
  const accessExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000);
  const refreshTtlSeconds = rememberMe
    ? REFRESH_TOKEN_REMEMBER_ME_TTL_SECONDS
    : REFRESH_TOKEN_TTL_SECONDS;
  const refreshExpiresAt = new Date(now.getTime() + refreshTtlSeconds * 1000);
  const idleExpiresAt = new Date(now.getTime() + SESSION_IDLE_TTL_SECONDS * 1000);

  const accessToken = signJwt({
    sub: String(user.id),
    sid: sessionId,
    jti: currentAccessJti,
    typ: "access",
    role: user.role,
    username: user.username,
    ver: Number(user.token_version || 0)
  }, accessExpiresAt);
  const refreshToken = signJwt({
    sub: String(user.id),
    sid: sessionId,
    jti: currentRefreshJti,
    typ: "refresh",
    ver: Number(user.token_version || 0),
    rm: rememberMe ? 1 : 0
  }, refreshExpiresAt);

  const timestamp = now.toISOString();
  db.prepare(
    `
    INSERT INTO auth_sessions (
      id, user_id, refresh_token_hash, current_refresh_jti, current_access_jti, remember_me,
      created_at, updated_at, last_seen_at, expires_at, idle_expires_at, ip_address,
      user_agent, auth_method, device_label
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    sessionId,
    user.id,
    hashOpaqueToken(refreshToken),
    currentRefreshJti,
    currentAccessJti,
    rememberMe ? 1 : 0,
    timestamp,
    timestamp,
    timestamp,
    refreshExpiresAt.toISOString(),
    idleExpiresAt.toISOString(),
    metadata.ipAddress,
    metadata.userAgent,
    authMethod,
    buildDeviceLabel(metadata.userAgent)
  );

  return {
    id: sessionId,
    rememberMe,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSeenAt: timestamp,
    expiresAt: refreshExpiresAt.toISOString(),
    idleExpiresAt: idleExpiresAt.toISOString(),
    authMethod,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    deviceLabel: buildDeviceLabel(metadata.userAgent),
    currentAccessJti,
    currentRefreshJti,
    accessToken,
    refreshToken,
    accessExpiresAt: accessExpiresAt.toISOString(),
    refreshExpiresAt: refreshExpiresAt.toISOString()
  };
}

function rotateSessionTokens({
  session,
  userRecord,
  now,
  metadata,
  previousAccessToken,
  previousRefreshToken
}) {
  const nextAccessJti = crypto.randomUUID();
  const nextRefreshJti = crypto.randomUUID();
  const accessExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000);
  const refreshTtlSeconds = Number(session.remember_me) ? REFRESH_TOKEN_REMEMBER_ME_TTL_SECONDS : REFRESH_TOKEN_TTL_SECONDS;
  const refreshExpiresAt = new Date(now.getTime() + refreshTtlSeconds * 1000);
  const idleExpiresAt = new Date(now.getTime() + SESSION_IDLE_TTL_SECONDS * 1000);

  const accessToken = signJwt({
    sub: String(userRecord.id),
    sid: session.id,
    jti: nextAccessJti,
    typ: "access",
    role: userRecord.role,
    username: userRecord.username,
    ver: Number(userRecord.token_version || 0)
  }, accessExpiresAt);
  const refreshToken = signJwt({
    sub: String(userRecord.id),
    sid: session.id,
    jti: nextRefreshJti,
    typ: "refresh",
    ver: Number(userRecord.token_version || 0),
    rm: Number(session.remember_me) ? 1 : 0
  }, refreshExpiresAt);

  if (previousAccessToken) {
    const accessPayload = verifyJwt(previousAccessToken, "access");
    if (accessPayload.ok) {
      blacklistToken({
        jti: accessPayload.payload.jti,
        tokenType: "access",
        userId: userRecord.id,
        sessionId: session.id,
        expiresAt: new Date(accessPayload.payload.exp * 1000).toISOString(),
        reason: "rotated"
      });
    }
  }

  if (previousRefreshToken) {
    const refreshPayload = verifyJwt(previousRefreshToken, "refresh");
    if (refreshPayload.ok) {
      blacklistToken({
        jti: refreshPayload.payload.jti,
        tokenType: "refresh",
        userId: userRecord.id,
        sessionId: session.id,
        expiresAt: new Date(refreshPayload.payload.exp * 1000).toISOString(),
        reason: "rotated"
      });
    }
  }

  const timestamp = now.toISOString();
  db.prepare(
    `
    UPDATE auth_sessions
    SET refresh_token_hash = ?, current_refresh_jti = ?, current_access_jti = ?, remember_me = ?,
        updated_at = ?, last_seen_at = ?, expires_at = ?, idle_expires_at = ?, ip_address = ?,
        user_agent = ?, device_label = ?, revoked_at = NULL, revoked_reason = NULL
    WHERE id = ?
  `
  ).run(
    hashOpaqueToken(refreshToken),
    nextRefreshJti,
    nextAccessJti,
    Number(session.remember_me) ? 1 : 0,
    timestamp,
    timestamp,
    refreshExpiresAt.toISOString(),
    idleExpiresAt.toISOString(),
    metadata.ipAddress,
    metadata.userAgent,
    buildDeviceLabel(metadata.userAgent),
    session.id
  );

  return {
    id: session.id,
    rememberMe: Boolean(session.remember_me),
    createdAt: session.created_at,
    updatedAt: timestamp,
    lastSeenAt: timestamp,
    expiresAt: refreshExpiresAt.toISOString(),
    idleExpiresAt: idleExpiresAt.toISOString(),
    authMethod: session.auth_method || "password",
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    deviceLabel: buildDeviceLabel(metadata.userAgent),
    accessToken,
    refreshToken,
    accessExpiresAt: accessExpiresAt.toISOString(),
    refreshExpiresAt: refreshExpiresAt.toISOString()
  };
}

function revokeSessionByRefreshToken(refreshToken, reason) {
  const payload = verifyJwt(refreshToken, "refresh");
  if (!payload.ok) {
    return;
  }

  revokeSessionById(payload.payload.sid, { reason, refreshToken });
}

function revokeAllSessionsForUser(userId, reason) {
  const now = new Date().toISOString();
  db.prepare(
    `
    UPDATE auth_sessions
    SET revoked_at = COALESCE(revoked_at, ?), revoked_reason = COALESCE(revoked_reason, ?)
    WHERE user_id = ? AND revoked_at IS NULL
  `
  ).run(now, reason, userId);
}

function revokeSessionById(sessionId, { reason, accessToken = "", refreshToken = "" } = {}) {
  const session = findSessionById(sessionId);
  if (!session) {
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `
    UPDATE auth_sessions
    SET revoked_at = COALESCE(revoked_at, ?), revoked_reason = COALESCE(revoked_reason, ?)
    WHERE id = ?
  `
  ).run(now, reason || "revoked", sessionId);

  if (session.current_access_jti) {
    blacklistToken({
      jti: session.current_access_jti,
      tokenType: "access",
      userId: session.user_id,
      sessionId,
      expiresAt: session.expires_at,
      reason: reason || "revoked"
    });
  }

  if (refreshToken) {
    const payload = verifyJwt(refreshToken, "refresh");
    if (payload.ok) {
      blacklistToken({
        jti: payload.payload.jti,
        tokenType: "refresh",
        userId: session.user_id,
        sessionId,
        expiresAt: new Date(payload.payload.exp * 1000).toISOString(),
        reason: reason || "revoked"
      });
    }
  } else if (session.current_refresh_jti) {
    blacklistToken({
      jti: session.current_refresh_jti,
      tokenType: "refresh",
      userId: session.user_id,
      sessionId,
      expiresAt: session.expires_at,
      reason: reason || "revoked"
    });
  }

  if (accessToken) {
    const payload = verifyJwt(accessToken, "access");
    if (payload.ok) {
      blacklistToken({
        jti: payload.payload.jti,
        tokenType: "access",
        userId: session.user_id,
        sessionId,
        expiresAt: new Date(payload.payload.exp * 1000).toISOString(),
        reason: reason || "revoked"
      });
    }
  }
}

function touchSessionActivity(sessionId, now, metadata) {
  db.prepare(
    `
    UPDATE auth_sessions
    SET updated_at = ?, last_seen_at = ?, idle_expires_at = ?, ip_address = COALESCE(?, ip_address),
        user_agent = COALESCE(?, user_agent), device_label = COALESCE(?, device_label)
    WHERE id = ?
  `
  ).run(
    now.toISOString(),
    now.toISOString(),
    new Date(now.getTime() + SESSION_IDLE_TTL_SECONDS * 1000).toISOString(),
    metadata.ipAddress || null,
    metadata.userAgent || null,
    buildDeviceLabel(metadata.userAgent || ""),
    sessionId
  );
}

function findSessionById(sessionId) {
  if (!sessionId) {
    return null;
  }

  return (
    db
      .prepare(
        `
        SELECT id, user_id, refresh_token_hash, current_refresh_jti, current_access_jti,
               remember_me, created_at, updated_at, last_seen_at, expires_at, idle_expires_at,
               revoked_at, revoked_reason, ip_address, user_agent, auth_method, device_label
        FROM auth_sessions
        WHERE id = ?
      `
      )
      .get(sessionId) || null
  );
}

function isSessionUsable(session, now = new Date()) {
  if (!session || session.revoked_at) {
    return false;
  }

  const refreshExpired = new Date(session.expires_at).getTime() <= now.getTime();
  const idleExpired = new Date(session.idle_expires_at).getTime() <= now.getTime();
  return !refreshExpired && !idleExpired;
}

function shouldRotateAccessToken(payload) {
  return Number(payload.exp || 0) - Math.floor(Date.now() / 1000) <= ACCESS_ROTATE_THRESHOLD_SECONDS;
}

function insertLoginLog({
  userId,
  username,
  success,
  rememberMe,
  ipAddress,
  userAgent,
  failureReason = null,
  sessionId = null
}) {
  db.prepare(
    `
    INSERT INTO auth_login_logs (
      user_id, username, session_id, success, auth_method, remember_me, ip_address, user_agent,
      failure_reason, created_at
    )
    VALUES (?, ?, ?, ?, 'password', ?, ?, ?, ?, ?)
  `
  ).run(
    userId,
    username,
    sessionId,
    success ? 1 : 0,
    rememberMe ? 1 : 0,
    ipAddress,
    userAgent,
    failureReason,
    new Date().toISOString()
  );
}

function blacklistToken({ jti, tokenType, userId, sessionId, expiresAt, reason }) {
  if (!jti) {
    return;
  }

  db.prepare(
    `
    INSERT OR REPLACE INTO auth_token_blacklist (
      jti, token_type, user_id, session_id, expires_at, created_at, reason
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(jti, tokenType, userId || null, sessionId || null, expiresAt, new Date().toISOString(), reason || null);
}

function isBlacklisted(jti) {
  if (!jti) {
    return false;
  }

  const record = db
    .prepare("SELECT jti FROM auth_token_blacklist WHERE jti = ? AND datetime(expires_at) > datetime('now')")
    .get(jti);

  return Boolean(record);
}

function cleanupExpiredAuthArtifacts() {
  db.prepare("DELETE FROM auth_token_blacklist WHERE datetime(expires_at) <= datetime('now')").run();
  db.prepare("DELETE FROM auth_sessions WHERE datetime(expires_at) <= datetime('now')").run();
}

function signJwt(payload, expiresAt) {
  const header = { alg: "HS256", typ: "JWT" };
  const issuedAt = Math.floor(Date.now() / 1000);
  const body = {
    iss: ISSUER,
    aud: AUDIENCE,
    iat: issuedAt,
    exp: Math.floor(expiresAt.getTime() / 1000),
    ...payload
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedBody = encodeBase64Url(JSON.stringify(body));
  const unsignedToken = `${encodedHeader}.${encodedBody}`;
  const signature = crypto.createHmac("sha256", SECRET).update(unsignedToken).digest("base64url");
  return `${unsignedToken}.${signature}`;
}

function verifyJwt(token, expectedType) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) {
      return { ok: false, code: "INVALID_TOKEN" };
    }

    const [headerPart, payloadPart, signaturePart] = parts;
    const unsignedToken = `${headerPart}.${payloadPart}`;
    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(unsignedToken)
      .digest("base64url");

    if (
      Buffer.byteLength(signaturePart) !== Buffer.byteLength(expectedSignature) ||
      !crypto.timingSafeEqual(Buffer.from(signaturePart), Buffer.from(expectedSignature))
    ) {
      return { ok: false, code: "INVALID_SIGNATURE" };
    }

    const payload = JSON.parse(decodeBase64Url(payloadPart));
    const nowInSeconds = Math.floor(Date.now() / 1000);

    if (payload.iss !== ISSUER || payload.aud !== AUDIENCE) {
      return { ok: false, code: "INVALID_AUDIENCE" };
    }

    if (expectedType && payload.typ !== expectedType) {
      return { ok: false, code: "INVALID_TOKEN_TYPE" };
    }

    if (Number(payload.exp || 0) <= nowInSeconds) {
      return { ok: false, code: "TOKEN_EXPIRED" };
    }

    return { ok: true, payload };
  } catch {
    return { ok: false, code: "INVALID_TOKEN" };
  }
}

function applyAuthCookies(response, { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, rememberMe }) {
  response.cookie(
    ACCESS_COOKIE_NAME,
    accessToken,
    getAccessCookieOptions(new Date(accessExpiresAt))
  );
  response.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    getRefreshCookieOptions(new Date(refreshExpiresAt), rememberMe)
  );
}

function getBaseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    domain: COOKIE_DOMAIN,
    path: "/"
  };
}

function getAccessCookieOptions(expiresAt) {
  return {
    ...getBaseCookieOptions(),
    expires: expiresAt,
    maxAge: Math.max(0, expiresAt.getTime() - Date.now())
  };
}

function getRefreshCookieOptions(expiresAt, rememberMe) {
  return rememberMe
    ? {
        ...getBaseCookieOptions(),
        expires: expiresAt,
        maxAge: Math.max(0, expiresAt.getTime() - Date.now())
      }
    : getBaseCookieOptions();
}

function hashOpaqueToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function verifyOpaqueToken(token, hash) {
  const actual = hashOpaqueToken(token);
  return Buffer.byteLength(actual) === Buffer.byteLength(hash || "")
    ? crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(hash || ""))
    : false;
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function toSessionPayload(session) {
  return {
    id: session.id,
    rememberMe: Boolean(session.rememberMe),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    idleExpiresAt: session.idleExpiresAt,
    authMethod: session.authMethod || "password",
    ipAddress: session.ipAddress || "",
    userAgent: session.userAgent || "",
    deviceLabel: session.deviceLabel || buildDeviceLabel(session.userAgent || ""),
    accessExpiresAt: session.accessExpiresAt || null,
    refreshExpiresAt: session.refreshExpiresAt || session.expiresAt || null
  };
}

function getClientMetadataFromSession(session) {
  return {
    ipAddress: session.ip_address || "",
    userAgent: session.user_agent || ""
  };
}

function buildDeviceLabel(userAgent) {
  const value = String(userAgent || "").toLowerCase();
  if (!value) {
    return "Unknown Device";
  }

  if (value.includes("iphone")) {
    return "iPhone";
  }
  if (value.includes("ipad")) {
    return "iPad";
  }
  if (value.includes("android")) {
    return "Android";
  }
  if (value.includes("mac os")) {
    return "Mac";
  }
  if (value.includes("windows")) {
    return "Windows";
  }
  if (value.includes("linux")) {
    return "Linux";
  }

  return "Web Device";
}

function resolveJwtSecret() {
  const explicitSecret = String(process.env.AUTH_JWT_SECRET || "").trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  return crypto
    .createHash("sha256")
    .update(
      [
        "gaokao-planner-agent",
        process.env.ADMIN_PASSWORD || "",
        process.env.ADMIN_USERNAME || "",
        process.env.DATA_DIR || ""
      ].join(":")
    )
    .digest("hex");
}

function toPositiveInt(value, fallbackValue) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? Math.floor(parsedValue) : fallbackValue;
}
