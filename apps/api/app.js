import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  createAdvisorPlanner,
  createContextBuilder,
  createAdvisorController,
  createCitationFormatter,
  createEntityResolver,
  createIntentRecognizer,
  createMemoryEngine,
  createPersonaEngine,
  createAdvisorResponsePolicy,
  createReflectionEngine,
  createAdvisorToolRouter,
  createAdvisorRuntime
} from "./modules/advisor/index.js";
import { AuthError } from "./errors/appError.js";
import {
  listActiveSessionsForUser,
  listLoginLogsForUser,
  loginWithPassword,
  logoutCurrentSession,
  refreshAuthSession,
  requireAdminContext,
  requireAuthContext,
  resolveAuthContext,
  revokeOwnedSession,
  writeLoginCookies
} from "./services/authService.js";
import {
  PERMISSIONS,
  assertApiPermission,
  assertCanAssignRole,
  assertCanManageTargetRole,
  isPrivilegedRole,
  listAssignableRolesForActor
} from "./services/rbacService.js";
import { getDataStatus } from "./services/dataService.js";
import {
  createUser,
  deleteUser,
  getDataEngine,
  getChatHistory,
  getImportHistory,
  getLatestChatSession,
  getPlanHistory,
  getUsageStatsForIdentity,
  listUsers,
  registerTrialUsage,
  saveChatHistory,
  saveChatSessionHistory,
  saveImportHistory,
  savePlanHistory,
  updateUserPassword,
  updateUserRole
} from "./services/dbService.js";
import { importAllCsvFiles, saveImportFile } from "./services/importService.js";
import { generateAdvisorReply, listAvailableProviders } from "./services/llmService.js";
import { generateVolunteerPlan } from "./services/plannerService.js";
import { ROLES } from "../shared/rbac.js";

export const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const distDir = path.join(projectRoot, "dist");
const distIndexHtml = path.join(distDir, "index.html");

const TRIAL_COOKIE_NAME = "gaokao_trial_token";

const requestSchema = z.object({
  province: z.string().min(1),
  examMode: z.string().min(1).default("3+1+2"),
  track: z.enum(["物理", "历史"]).default("物理"),
  selectedSubjects: z.array(z.string()).default([]),
  score: z.number().min(0).max(750),
  rank: z.number().int().min(1),
  risk: z.enum(["aggressive", "balanced", "conservative"]),
  preferredCities: z.string().optional().default(""),
  careerPlan: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  maxTuition: z.number().min(0).optional().default(0),
  englishScore: z.number().min(0).max(150).optional().default(0),
  candidateType: z.string().optional().default("general"),
  specialPlans: z.array(z.string()).default([]),
  healthNotes: z.string().optional().default(""),
  willingAdjustment: z.boolean().optional().default(true),
  interests: z.array(z.string()).default([]),
  personalityTags: z.array(z.string()).default([]),
  schoolTags: z.array(z.string()).default([]),
  majorNeeds: z.array(z.string()).default([]),
  subjectConstraints: z.array(z.string()).default([])
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(true)
});

const logoutSchema = z.object({
  allDevices: z.boolean().optional().default(false)
});

const uploadSchema = z.object({
  fileName: z.string().min(1),
  datasetType: z.enum(["province_score_rank", "university_major_lines", "enrollment_plan"]),
  content: z.string().min(1)
});

const createUserSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(64),
  role: z.enum([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.TEACHER,
    ROLES.STUDENT,
    ROLES.USER
  ]).default(ROLES.TEACHER)
});

const updatePasswordSchema = z.object({
  password: z.string().min(8).max(64)
});

const updateRoleSchema = z.object({
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.USER])
});

const parseOptionalInt = ({ min = 1, max = 1000 } = {}) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }

      return Number(value);
    },
    z.number().int().min(min).max(max).optional()
  );

const universitySearchSchema = z.object({
  keyword: z.string().optional(),
  provinceCode: z.string().optional(),
  cityCode: z.string().optional(),
  limit: parseOptionalInt({ min: 1, max: 100 })
});

const majorSearchSchema = z.object({
  keyword: z.string().optional(),
  category: z.string().optional(),
  degreeType: z.string().optional(),
  limit: parseOptionalInt({ min: 1, max: 100 })
});

const planSearchSchema = z.object({
  provinceCode: z.string().optional(),
  year: parseOptionalInt({ min: 2000, max: 2100 }),
  trackType: z.string().optional(),
  batchCode: z.string().optional(),
  universityId: parseOptionalInt({ min: 1, max: Number.MAX_SAFE_INTEGER }),
  keyword: z.string().optional(),
  limit: parseOptionalInt({ min: 1, max: 200 })
});

const admissionSearchSchema = z.object({
  provinceCode: z.string().optional(),
  year: parseOptionalInt({ min: 2000, max: 2100 }),
  trackType: z.string().optional(),
  rankMin: parseOptionalInt({ min: 1, max: Number.MAX_SAFE_INTEGER }),
  rankMax: parseOptionalInt({ min: 1, max: Number.MAX_SAFE_INTEGER }),
  batchCode: z.string().optional(),
  limit: parseOptionalInt({ min: 1, max: 200 })
});

const advisorRuntime = createAdvisorRuntime({
  loadLatestSession: getLatestChatSession,
  loadChatHistory: getChatHistory,
  citationFormatter: createCitationFormatter(),
  contextBuilder: createContextBuilder(),
  intentRecognizer: createIntentRecognizer(),
  memoryEngine: createMemoryEngine(),
  planner: createAdvisorPlanner(),
  personaEngine: createPersonaEngine(),
  responsePolicyEngine: createAdvisorResponsePolicy(),
  reflectionEngine: createReflectionEngine(),
  toolRouter: createAdvisorToolRouter({
    entityResolver: createEntityResolver({ getDataEngine }),
    getDataEngine
  }),
  generateReply: generateAdvisorReply,
  saveSessionHistory: saveChatSessionHistory,
  saveHistory: saveChatHistory
});

const advisorController = createAdvisorController({
  runtime: advisorRuntime,
  resolveUsageAccess,
  isAdmin,
  handleApiError
});

app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ["X-Access-Token", "X-Session-Id"]
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "gaokao-planner-agent"
  });
});

app.post("/api/auth/login", (request, response) => {
  try {
    const payload = loginSchema.parse(request.body);
    const auth = loginWithPassword(request, payload);
    writeLoginCookies(response, auth);

    response.json({
      ok: true,
      data: {
        token: auth.token,
        user: auth.user,
        session: auth.session
      }
    });
  } catch (error) {
    handleApiError(response, error, "登录请求无效");
  }
});

app.get("/api/auth/me", (request, response) => {
  try {
    const auth = requireAuthContext(request, response, { allowRefresh: true });
    response.json({
      ok: true,
      data: {
        user: auth.user,
        session: auth.session
      }
    });
  } catch (error) {
    handleApiError(response, error, "获取当前登录状态失败");
  }
});

app.post("/api/auth/refresh", (request, response) => {
  try {
    const auth = refreshAuthSession(request, response);
    response.json({
      ok: true,
      data: {
        token: auth.token,
        user: auth.user,
        session: auth.session
      }
    });
  } catch (error) {
    handleApiError(response, error, "刷新登录状态失败");
  }
});

app.post("/api/auth/logout", (request, response) => {
  try {
    const payload = logoutSchema.parse(request.body || {});
    logoutCurrentSession(request, response, { revokeAll: payload.allDevices });
    response.json({ ok: true });
  } catch (error) {
    handleApiError(response, error, "退出登录失败");
  }
});

app.get("/api/auth/sessions", (request, response) => {
  try {
    const auth = requireAuthContext(request, response, { allowRefresh: true });
    response.json({
      ok: true,
      data: {
        sessions: listActiveSessionsForUser(auth.user.id, auth.session.id)
      }
    });
  } catch (error) {
    handleApiError(response, error, "获取会话列表失败");
  }
});

app.delete("/api/auth/sessions/:id", (request, response) => {
  try {
    const auth = requireAuthContext(request, response, { allowRefresh: true });
    const targetSessionId = String(request.params.id || "");

    revokeOwnedSession({
      actorUserId: auth.user.id,
      sessionId: targetSessionId,
      currentSessionId: auth.session.id
    });

    if (targetSessionId === auth.session.id) {
      logoutCurrentSession(request, response);
    }

    response.json({ ok: true });
  } catch (error) {
    handleApiError(response, error, "撤销会话失败");
  }
});

app.get("/api/auth/login-logs", (request, response) => {
  try {
    const auth = requireAuthContext(request, response, { allowRefresh: true });
    response.json({
      ok: true,
      data: {
        logs: listLoginLogsForUser(auth.user.id)
      }
    });
  } catch (error) {
    handleApiError(response, error, "获取登录日志失败");
  }
});

app.get("/api/meta/providers", (_request, response) => {
  response.json({
    ok: true,
    data: listAvailableProviders()
  });
});

app.get("/api/meta/data-status", (_request, response) => {
  response.json({
    ok: true,
    data: getDataStatus()
  });
});

app.get("/api/meta/upload-template", (request, response) => {
  const datasetType = String(request.query.datasetType || "province_score_rank");

  if (datasetType === "enrollment_plan") {
    response.json({
      ok: true,
      data: {
        datasetType,
        fileNameExample: "enrollment_plan_2026_guangdong_physics.csv",
        headers: [
          "province",
          "year",
          "track",
          "batch",
          "university",
          "major",
          "major_group_code",
          "plan_name",
          "plan_count",
          "subject_requirement",
          "required_subjects",
          "one_of_subjects",
          "preferred_subjects",
          "forbidden_subjects",
          "tuition",
          "duration_years",
          "campus_name",
          "is_new_program",
          "is_cooperative_program",
          "is_targeted_program",
          "notes"
        ]
      }
    });
    return;
  }

  if (datasetType === "university_major_lines") {
    response.json({
      ok: true,
      data: {
        datasetType,
        fileNameExample: "university_major_lines_2025_guangdong_physics.csv",
        headers: [
          "province",
          "year",
          "track",
          "university",
          "major",
          "min_score",
          "min_rank",
          "batch",
          "admission_count",
          "subject_requirement",
          "tuition",
          "notes"
        ]
      }
    });
    return;
  }

  response.json({
    ok: true,
    data: {
      datasetType: "province_score_rank",
      fileNameExample: "province_score_rank_2025_physics.csv",
      headers: ["province", "year", "track", "score", "rank"]
    }
  });
});

app.get("/api/data/universities", (request, response) => {
  try {
    const query = universitySearchSchema.parse(request.query || {});
    const items = getDataEngine().services.universityQuery.searchUniversities({
      keyword: emptyToUndefined(query.keyword),
      provinceCode: emptyToUndefined(query.provinceCode),
      cityCode: emptyToUndefined(query.cityCode),
      limit: query.limit || 24
    });

    response.json({
      ok: true,
      data: {
        items
      }
    });
  } catch (error) {
    handleApiError(response, error, "获取高校列表失败");
  }
});

app.get("/api/data/universities/:id", (request, response) => {
  try {
    const universityId = parseEntityId(request.params.id, "INVALID_UNIVERSITY_ID");
    const item = getDataEngine().services.universityQuery.getUniversityProfile(universityId);

    if (!item) {
      throw new AuthError("高校不存在", 404, "UNIVERSITY_NOT_FOUND");
    }

    response.json({
      ok: true,
      data: {
        item
      }
    });
  } catch (error) {
    handleApiError(response, error, "获取高校详情失败");
  }
});

app.get("/api/data/majors", (request, response) => {
  try {
    const query = majorSearchSchema.parse(request.query || {});
    const items = getDataEngine().services.majorQuery.searchMajors({
      keyword: emptyToUndefined(query.keyword),
      category: emptyToUndefined(query.category),
      degreeType: emptyToUndefined(query.degreeType),
      limit: query.limit || 24
    });

    response.json({
      ok: true,
      data: {
        items
      }
    });
  } catch (error) {
    handleApiError(response, error, "获取专业列表失败");
  }
});

app.get("/api/data/majors/:id", (request, response) => {
  try {
    const majorId = parseEntityId(request.params.id, "INVALID_MAJOR_ID");
    const item = getDataEngine().services.majorQuery.getMajorProfile(majorId);

    if (!item) {
      throw new AuthError("专业不存在", 404, "MAJOR_NOT_FOUND");
    }

    response.json({
      ok: true,
      data: {
        item
      }
    });
  } catch (error) {
    handleApiError(response, error, "获取专业详情失败");
  }
});

app.get("/api/data/plans", (request, response) => {
  try {
    const query = planSearchSchema.parse(request.query || {});
    const items = getDataEngine().services.planQuery.searchPlans({
      provinceCode: emptyToUndefined(query.provinceCode),
      year: query.year,
      trackType: emptyToUndefined(query.trackType),
      batchCode: emptyToUndefined(query.batchCode),
      universityId: query.universityId,
      keyword: emptyToUndefined(query.keyword),
      limit: query.limit || 60
    });

    response.json({
      ok: true,
      data: {
        items
      }
    });
  } catch (error) {
    handleApiError(response, error, "获取招生计划失败");
  }
});

app.get("/api/data/admissions", (request, response) => {
  try {
    const query = admissionSearchSchema.parse(request.query || {});
    const items = getDataEngine().services.admissionQuery.searchAdmissionRecords({
      provinceCode: emptyToUndefined(query.provinceCode),
      year: query.year,
      trackType: emptyToUndefined(query.trackType),
      rankMin: query.rankMin,
      rankMax: query.rankMax,
      batchCode: emptyToUndefined(query.batchCode),
      limit: query.limit || 60
    });

    response.json({
      ok: true,
      data: {
        items
      }
    });
  } catch (error) {
    handleApiError(response, error, "获取录取线数据失败");
  }
});

app.get("/api/admin/history", (request, response) => {
  try {
    const auth = requireAuthContext(request, response, { allowRefresh: true });
    assertApiPermission(auth.user, PERMISSIONS.api.HISTORY_READ_SELF, "没有查看历史记录的权限");
    response.json({
      ok: true,
      data: {
        plans: getPlanHistory({ userId: auth.user.id, isAdmin: isAdmin(auth.user) }),
        chats: getChatHistory({ userId: auth.user.id, isAdmin: isAdmin(auth.user) }),
        imports: getImportHistory({ userId: auth.user.id, isAdmin: isAdmin(auth.user) })
      }
    });
  } catch (error) {
    handleApiError(response, error, "获取历史记录失败");
  }
});

app.get("/api/admin/users", (request, response) => {
  try {
    const auth = requireAdminContext(request, response, { allowRefresh: true });
    assertApiPermission(auth.user, PERMISSIONS.api.USERS_READ, "没有查看成员列表的权限");
    response.json({
      ok: true,
      data: {
        users: listUsers(),
        actor: auth.user,
        roleOptions: listAssignableRolesForActor(auth.user.role)
      }
    });
  } catch (error) {
    handleApiError(response, error, "获取用户列表失败");
  }
});

app.post("/api/admin/users", (request, response) => {
  try {
    const auth = requireAdminContext(request, response, { allowRefresh: true });
    assertApiPermission(auth.user, PERMISSIONS.api.USERS_CREATE, "没有创建成员的权限");
    const payload = createUserSchema.parse(request.body);
    assertCanAssignRole(auth.user.role, payload.role);
    const createdUser = createUser(payload);

    response.status(201).json({
      ok: true,
      data: {
        user: createdUser
      }
    });
  } catch (error) {
    handleApiError(response, error, "创建用户失败");
  }
});

app.patch("/api/admin/users/:id/password", (request, response) => {
  try {
    const auth = requireAdminContext(request, response, { allowRefresh: true });
    assertApiPermission(auth.user, PERMISSIONS.api.USERS_PASSWORD_RESET, "没有重置密码的权限");
    const targetUserId = parseUserId(request.params.id);
    const targetUser = getManagedUserById(targetUserId);
    assertCanManageTargetRole(auth.user.role, targetUser.role);
    const payload = updatePasswordSchema.parse(request.body);
    const updatedUser = updateUserPassword(targetUserId, payload.password);

    response.json({
      ok: true,
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    handleApiError(response, error, "重置密码失败");
  }
});

app.patch("/api/admin/users/:id/role", (request, response) => {
  try {
    const auth = requireAdminContext(request, response, { allowRefresh: true });
    assertApiPermission(auth.user, PERMISSIONS.api.USERS_ROLE_UPDATE, "没有修改角色的权限");
    const targetUserId = parseUserId(request.params.id);
    const targetUser = getManagedUserById(targetUserId);
    assertCanManageTargetRole(auth.user.role, targetUser.role);
    const payload = updateRoleSchema.parse(request.body);
    assertCanAssignRole(auth.user.role, payload.role);

    if (targetUserId === auth.user.id && payload.role !== auth.user.role) {
      throw new AuthError("当前管理员不能取消自己的管理员权限", 409, "SELF_ROLE_DOWNGRADE");
    }

    const updatedUser = updateUserRole(targetUserId, payload.role);
    response.json({
      ok: true,
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    handleApiError(response, error, "更新用户角色失败");
  }
});

app.delete("/api/admin/users/:id", (request, response) => {
  try {
    const auth = requireAdminContext(request, response, { allowRefresh: true });
    assertApiPermission(auth.user, PERMISSIONS.api.USERS_DELETE, "没有删除成员的权限");
    const targetUserId = parseUserId(request.params.id);
    const targetUser = getManagedUserById(targetUserId);

    if (targetUserId === auth.user.id) {
      throw new AuthError("管理员不能删除当前登录账号", 409, "SELF_DELETE_FORBIDDEN");
    }

    assertCanManageTargetRole(auth.user.role, targetUser.role);
    deleteUser(targetUserId);
    response.json({ ok: true });
  } catch (error) {
    handleApiError(response, error, "删除用户失败");
  }
});

app.post("/api/planner/recommend", async (request, response) => {
  try {
    const access = resolveUsageAccess(request, response, "planner");
    if (!access.allowed) {
      response.status(403).json({
        ok: false,
        error: access.message
      });
      return;
    }

    const payload = requestSchema.parse(request.body);
    const plan = await generateVolunteerPlan(payload);

    savePlanHistory({
      userId: access.user?.id,
      profile: payload,
      result: plan
    });

    if (!access.user && access.trialToken) {
      registerTrialUsage({
        trialToken: access.trialToken,
        actionType: "planner"
      });
    }

    response.json({
      ok: true,
      data: plan
    });
  } catch (error) {
    handleApiError(response, error, "生成志愿方案失败");
  }
});

app.post("/api/chat/advisor", advisorController);

app.post("/api/admin/upload", (request, response) => {
  try {
    const auth = requireAdminContext(request, response, { allowRefresh: true });
    assertApiPermission(auth.user, PERMISSIONS.api.IMPORT_UPLOAD, "没有导入数据的权限");
    const payload = uploadSchema.parse(request.body);
    const savedPath = saveImportFile(payload.fileName, payload.content);
    const result = importAllCsvFiles();
    const rowCount =
      payload.datasetType === "province_score_rank"
        ? result.provinceScoreRankCount
        : payload.datasetType === "enrollment_plan"
          ? result.enrollmentPlanCount
          : result.universityMajorLineCount;

    saveImportHistory({
      userId: auth.user.id,
      datasetType: payload.datasetType,
      fileName: savedPath,
      rowCount
    });

    response.json({
      ok: true,
      data: {
        savedPath,
        importResult: result,
        importedDatasetType: payload.datasetType,
        importedRowCount: rowCount
      }
    });
  } catch (error) {
    handleApiError(response, error, "导入数据失败");
  }
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  app.use((request, response, next) => {
    if (request.path.startsWith("/api") || request.method !== "GET") {
      next();
      return;
    }

    response.sendFile(distIndexHtml);
  });
} else {
  app.get("/", (_request, response) => {
    response
      .status(200)
      .send("前端静态资源尚未构建，请先执行 npm run build，然后访问 http://localhost:3001。");
  });
}

export function createServer() {
  return app;
}

function parseEntityId(value, code = "INVALID_ENTITY_ID") {
  const entityId = Number(value);
  if (!Number.isInteger(entityId) || entityId <= 0) {
    throw new AuthError("无效的标识符", 400, code);
  }

  return entityId;
}

function parseUserId(value) {
  const userId = Number(value);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AuthError("无效的用户 ID", 400, "INVALID_USER_ID");
  }

  return userId;
}

function getManagedUserById(userId) {
  const targetUser = listUsers().find((user) => Number(user.id) === Number(userId));
  if (!targetUser) {
    throw new AuthError("用户不存在", 404, "USER_NOT_FOUND");
  }

  return targetUser;
}

function isAdmin(user) {
  return isPrivilegedRole(user?.role);
}

function resolveUsageAccess(request, response, actionType = "planner") {
  const auth = resolveAuthContext(request, response, { allowRefresh: true });
  if (auth?.user) {
    return {
      allowed: true,
      trialToken: "",
      user: auth.user
    };
  }

  const trialToken = getTrialToken(request);

  if (actionType === "chat") {
    return {
      allowed: false,
      trialToken,
      user: null,
      message: "游客模式不开放连续对话、聊天记忆和上下文顾问能力，请登录后继续使用 AI 顾问。"
    };
  }

  if (!trialToken) {
    return {
      allowed: false,
      trialToken: "",
      user: null,
      message: "游客凭证缺失，请返回首页重新进入游客体验，或直接登录正式账号继续使用。"
    };
  }

  const usage = getUsageStatsForIdentity({ userId: null, trialToken });
  if (usage.trialUsageCount >= 1) {
    return {
      allowed: false,
      trialToken,
      user: null,
      message: "游客模式仅开放一次正式志愿方案体验，本次试用次数已用完，请登录后继续使用。"
    };
  }

  return {
    allowed: true,
    trialToken,
    user: null
  };
}

function getTrialToken(request) {
  const cookieHeader = String(request.headers.cookie || "");
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const cookie = cookies.find((item) => item.startsWith(`${TRIAL_COOKIE_NAME}=`));

  if (cookie) {
    return decodeURIComponent(cookie.slice(TRIAL_COOKIE_NAME.length + 1));
  }

  return String(request.headers["x-trial-token"] || "").trim();
}


function emptyToUndefined(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
}

function handleApiError(response, error, fallbackMessage) {
  if (error instanceof AuthError) {
    response.status(error.status).json({
      ok: false,
      error: error.message,
      code: error.code
    });
    return;
  }

  if (error instanceof z.ZodError) {
    response.status(400).json({
      ok: false,
      error: error.issues?.[0]?.message || fallbackMessage,
      code: "VALIDATION_ERROR"
    });
    return;
  }

  if (error instanceof Error) {
    response.status(400).json({
      ok: false,
      error: error.message || fallbackMessage,
      code: "REQUEST_ERROR"
    });
    return;
  }

  response.status(500).json({
    ok: false,
    error: fallbackMessage,
    code: "INTERNAL_ERROR"
  });
}
