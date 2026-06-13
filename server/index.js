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
  getUserFromToken,
  getPlanHistory,
  getChatHistory,
  getImportHistory,
  savePlanHistory,
  saveChatHistory,
  saveImportHistory
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

app.get("/api/admin/history", (request, response) => {
  const user = resolveUser(request);
  if (!user) {
    response.status(401).json({ ok: false, error: "未登录" });
    return;
  }

  response.json({
    ok: true,
    data: {
      plans: getPlanHistory(),
      chats: getChatHistory(),
      imports: getImportHistory()
    }
  });
});

app.post("/api/planner/recommend", async (request, response) => {
  try {
    const payload = requestSchema.parse(request.body);
    const plan = await generateVolunteerPlan(payload);
    const user = resolveUser(request);
    savePlanHistory({
      userId: user?.id,
      profile: payload,
      result: plan
    });

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
    const payload = chatSchema.parse(request.body);
    const reply = await generateAdvisorReply(payload);
    const user = resolveUser(request);
    saveChatHistory({
      userId: user?.id,
      provider: payload.provider,
      messages: payload.messages,
      replyText: reply.reply
    });

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
  const user = resolveUser(request);
  if (!user) {
    response.status(401).json({ ok: false, error: "未登录" });
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
        importResult: result
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

function resolveUser(request) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return getUserFromToken(token);
}
