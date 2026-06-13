import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { generateVolunteerPlan } from "./services/plannerService.js";
import { generateAdvisorReply, listAvailableProviders } from "./services/llmService.js";
import { getDataStatus } from "./services/dataService.js";
import {
  authenticateUser,
  createUser,
  deleteUser,
  getChatHistory,
  getImportHistory,
  getPlanHistory,
  getUserFromToken,
  getUsageStatsForIdentity,
  listUsers,
  registerTrialUsage,
  revokeToken,
  saveChatHistory,
  saveImportHistory,
  savePlanHistory,
  updateUserPassword,
  updateUserRole
} from "./services/dbService.js";
import { importAllCsvFiles, saveImportFile } from "./services/importService.js";

const app = express();
const port = Number(process.env.PORT || 3001);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const distIndexHtml = path.join(distDir, "index.html");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const requestSchema = z.object({
  province: z.string().min(1),
  track: z.enum(["历史", "物理"]).default("物理"),
  score: z.number().min(0).max(750),
  rank: z.number().int().min(1),
  risk: z.enum(["aggressive", "balanced", "conservative"]),
  preferredCities: z.string().optional().default(""),
  careerPlan: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  maxTuition: z.number().min(0).optional().default(0),
  interests: z.array(z.string()).default([]),
  schoolTags: z.array(z.string()).default([]),
  majorNeeds: z.array(z.string()).default([]),
  subjectConstraints: z.array(z.string()).default([])
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const chatSchema = z.object({
  provider: z.string().optional().default("auto"),
  planningContext: z.any().optional().nullable(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1)
      })
    )
    .min(1)
});

const uploadSchema = z.object({
  fileName: z.string().min(1),
  datasetType: z.enum(["province_score_rank", "university_major_lines"]),
  content: z.string().min(1)
});

const createUserSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(64),
  role: z.enum(["admin", "advisor"]).default("advisor")
});

const updatePasswordSchema = z.object({
  password: z.string().min(8).max(64)
});

const updateRoleSchema = z.object({
  role: z.enum(["admin", "advisor"])
});

const TRIAL_COOKIE_NAME = "gaokao_trial_token";

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "gaokao-planner-agent"
  });
});

app.post("/api/auth/login", (request, response) => {
  try {
    const payload = loginSchema.parse(request.body);
    const auth = authenticateUser(payload.username, payload.password);

    if (!auth) {
      response.status(401).json({
        ok: false,
        error: "用户名或密码错误"
      });
      return;
    }

    response.json({
      ok: true,
      data: auth
    });
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "登录失败"
    });
  }
});

app.get("/api/auth/me", (request, response) => {
  const user = requireAuthUser(request, response);
  if (!user) {
    return;
  }

  response.json({
    ok: true,
    data: {
      user
    }
  });
});

app.post("/api/auth/logout", (request, response) => {
  revokeToken(resolveToken(request));
  response.json({
    ok: true
  });
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

app.get("/api/admin/history", (request, response) => {
  const user = requireAuthUser(request, response);
  if (!user) {
    return;
  }

  response.json({
    ok: true,
    data: {
      plans: getPlanHistory({ userId: user.id, isAdmin: isAdmin(user) }),
      chats: getChatHistory({ userId: user.id, isAdmin: isAdmin(user) }),
      imports: getImportHistory({ userId: user.id, isAdmin: isAdmin(user) })
    }
  });
});

app.get("/api/admin/users", (request, response) => {
  const user = requireAdminUser(request, response);
  if (!user) {
    return;
  }

  response.json({
    ok: true,
    data: {
      users: listUsers()
    }
  });
});

app.post("/api/admin/users", (request, response) => {
  const user = requireAdminUser(request, response);
  if (!user) {
    return;
  }

  try {
    const payload = createUserSchema.parse(request.body);
    const createdUser = createUser(payload);

    response.json({
      ok: true,
      data: {
        user: createdUser
      }
    });
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "创建用户失败"
    });
  }
});

app.patch("/api/admin/users/:id/password", (request, response) => {
  const user = requireAdminUser(request, response);
  if (!user) {
    return;
  }

  try {
    const targetUserId = parseUserId(request.params.id);
    const payload = updatePasswordSchema.parse(request.body);
    const updatedUser = updateUserPassword(targetUserId, payload.password);

    response.json({
      ok: true,
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "重置密码失败"
    });
  }
});

app.patch("/api/admin/users/:id/role", (request, response) => {
  const user = requireAdminUser(request, response);
  if (!user) {
    return;
  }

  try {
    const targetUserId = parseUserId(request.params.id);
    const payload = updateRoleSchema.parse(request.body);

    if (targetUserId === user.id && payload.role !== "admin") {
      throw new Error("当前管理员不能取消自己的管理员权限");
    }

    const updatedUser = updateUserRole(targetUserId, payload.role);

    response.json({
      ok: true,
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "更新角色失败"
    });
  }
});

app.delete("/api/admin/users/:id", (request, response) => {
  const user = requireAdminUser(request, response);
  if (!user) {
    return;
  }

  try {
    const targetUserId = parseUserId(request.params.id);
    if (targetUserId === user.id) {
      throw new Error("不能删除当前登录账号");
    }

    deleteUser(targetUserId);

    response.json({
      ok: true
    });
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "删除用户失败"
    });
  }
});

app.post("/api/planner/recommend", async (request, response) => {
  try {
    const access = resolveUsageAccess(request);
    if (!access.allowed) {
      response.status(403).json({
        ok: false,
        error: access.message
      });
      return;
    }

    const payload = requestSchema.parse(request.body);
    const plan = await generateVolunteerPlan(payload);
    const user = getUserFromRequest(request);

    savePlanHistory({
      userId: user?.id,
      profile: payload,
      result: plan
    });

    if (!user && access.trialToken) {
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
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "生成志愿方案失败"
    });
  }
});

app.post("/api/chat/advisor", async (request, response) => {
  try {
    const access = resolveUsageAccess(request);
    if (!access.allowed) {
      response.status(403).json({
        ok: false,
        error: access.message
      });
      return;
    }

    const payload = chatSchema.parse(request.body);
    const reply = await generateAdvisorReply(payload);
    const user = getUserFromRequest(request);

    saveChatHistory({
      userId: user?.id,
      provider: payload.provider,
      messages: payload.messages,
      replyText: reply.reply
    });

    if (!user && access.trialToken) {
      registerTrialUsage({
        trialToken: access.trialToken,
        actionType: "chat"
      });
    }

    response.json({
      ok: true,
      data: reply
    });
  } catch (error) {
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "聊天顾问回复失败"
    });
  }
});

app.post("/api/admin/upload", (request, response) => {
  const user = requireAdminUser(request, response);
  if (!user) {
    return;
  }

  try {
    const payload = uploadSchema.parse(request.body);
    const savedPath = saveImportFile(payload.fileName, payload.content);
    const result = importAllCsvFiles();
    const rowCount =
      payload.datasetType === "province_score_rank"
        ? result.provinceScoreRankCount
        : result.universityMajorLineCount;

    saveImportHistory({
      userId: user.id,
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
    response.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "上传导入失败"
    });
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
    response.status(200).send(
      "前端尚未构建。请先运行 `npm run build`，然后访问 http://localhost:3001 。"
    );
  });
}

app.listen(port, () => {
  console.log(`Gaokao planner API running at http://localhost:${port}`);
});

function parseUserId(value) {
  const userId = Number(value);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("无效的用户编号");
  }

  return userId;
}

function isAdmin(user) {
  return user?.role === "admin";
}

function resolveToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function resolveUsageAccess(request) {
  const user = getUserFromRequest(request);
  if (user) {
    return {
      allowed: true,
      trialToken: ""
    };
  }

  const trialToken = getTrialToken(request);
  if (!trialToken) {
    return {
      allowed: false,
      trialToken: "",
      message: "未登录用户需要先领取一次试用标识后才能体验。请刷新页面后重试。"
    };
  }

  const usage = getUsageStatsForIdentity({ userId: null, trialToken });
  if (usage.trialUsageCount >= 1) {
    return {
      allowed: false,
      trialToken,
      message: "游客账号仅可体验一次正式志愿或顾问功能。请联系管理员创建账号后继续无限使用。"
    };
  }

  return {
    allowed: true,
    trialToken
  };
}

function getUserFromRequest(request) {
  return getUserFromToken(resolveToken(request));
}

function getTrialToken(request) {
  const cookieHeader = request.headers.cookie || "";
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const cookie = cookies.find((item) => item.startsWith(`${TRIAL_COOKIE_NAME}=`));

  if (cookie) {
    return decodeURIComponent(cookie.slice(TRIAL_COOKIE_NAME.length + 1));
  }

  const trialToken = String(request.headers["x-trial-token"] || "").trim();
  return trialToken || "";
}

function requireAuthUser(request, response) {
  const user = getUserFromRequest(request);
  if (!user) {
    response.status(401).json({ ok: false, error: "未登录" });
    return null;
  }

  return user;
}

function requireAdminUser(request, response) {
  const user = requireAuthUser(request, response);
  if (!user) {
    return null;
  }

  if (!isAdmin(user)) {
    response.status(403).json({ ok: false, error: "需要管理员权限" });
    return null;
  }

  return user;
}
