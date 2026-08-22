# 工程化说明

## 仓库与运行模式

项目是 npm 单仓库，前端位于 `apps/web`，后端位于 `apps/api`，共享 RBAC 定义位于 `apps/shared`。开发环境由 `concurrently` 同时启动 Vite 和 Node watch server；生产环境由 Express 提供 API 与 Vite 构建产物。

## API 与校验

- Express 5 承载 health、auth、meta、data、planner、advisor、history 和 admin routes。
- Zod 校验 Planner、Advisor、认证、用户管理、上传和查询参数。
- SQLite 查询通过 prepared statements 执行。
- `handleApiError` 统一处理 AuthError、ZodError 和一般 Error。

当前错误层仍较粗：普通 `Error` 大多返回 400，缺少 request ID、领域错误 taxonomy、生产/开发错误脱敏区分和集中 error middleware。

## 数据库

项目使用 Node 24 内置 `node:sqlite` 的 `DatabaseSync`：

- 默认路径：`apps/api/storage/app.db`；
- 配置 `DATA_DIR` 后：`$DATA_DIR/app.db`；
- foreign keys 开启；
- 同一数据库保存认证、方案、聊天、导入记录和 Data Engine 表。

SQLite 让作品集项目零外部依赖、易本地演示和单文件持久化。当前没有 migration framework、备份/恢复自动化、读副本或横向扩展方案。

## 认证与 RBAC

已实现：

- scrypt 密码哈希；
- 签名 access / refresh token；
- HttpOnly、SameSite=Lax、可配置 Secure cookie；
- refresh token hash、rotation 和 reuse detection；
- token blacklist、idle expiry、设备会话撤销和登录日志；
- super admin、admin、teacher、student、user 角色与权限检查；
- Admin Users 创建、改密、改角色和删除约束。

待加强：

- 前端仍把 bearer access token 存入 `localStorage`；
- CORS 使用 `origin: true`；
- 没有明确的 CSRF token 策略；
- 没有 API rate limit、登录防爆破和安全响应头中间件；
- Caddy 只设置部分基础 header。

## LLM 工程

- 单一 service 适配 OpenAI Responses 与兼容 Chat Completions。
- provider metadata 可通过 `/api/meta/providers` 查询。
- provider 未配置或请求失败时有 local fallback。
- Planner 使用严格 JSON 摘要结构，Advisor 使用证据化 prompt 与本地回答模板。

当前不足：

- `llmService.js` 体积大、职责多；
- 没有统一 deadline、retry/backoff、circuit breaker；
- 没有 token、cost、latency、cache hit 等指标；
- 没有 prompt/version registry；
- 没有跨 provider 自动 failover，仅回本地 fallback。

## 日志与可观测性

当前主要使用 `console` 日志，health endpoint 返回服务状态。尚未实现：

- JSON structured logging；
- request / trace / session correlation ID；
- OpenTelemetry traces；
- metrics 与 dashboard；
- error aggregation；
- Agent event timeline；
- LLM cost and latency budget。

## 测试与静态质量

| 命令                             | 覆盖                               |
| -------------------------------- | ---------------------------------- |
| `npm run check`                  | 关键 Node 文件语法检查             |
| `npm run lint`                   | Web、API、scripts、E2E 配置 ESLint |
| `npm run format:check`           | 全仓库 Prettier 检查               |
| `npm run build`                  | Vite 生产构建                      |
| `npm run test:smoke`             | Playwright Chromium E2E            |
| `npm run verify:advisor-quality` | 8 个 Advisor 规则场景              |
| `npm run verify:planner-quality` | 10 个广东画像的方案质量扫描        |

Playwright 使用真实本地 Web/API server，当前 `fullyParallel: false`、`retries: 0`，失败时保留 trace。E2E 主要是 PC smoke，不等于完整跨浏览器、移动端或无障碍测试。

最近基线审计结果：check 通过；lint 0 error/1 warning；format:check 因 48 个文件失败；Advisor quality 7/8；Planner quality 执行完成。仓库当前没有 CI workflow，因此这些命令不会由 GitHub 自动强制执行。

## Docker 与 Caddy

`Dockerfile`：

- Node 24 Alpine build stage 执行 `npm ci` 和 Vite build；
- runtime stage 仅安装 production dependencies；
- 复制 `dist`、`apps/api`、`apps/shared`；
- 暴露 3001 并启动 `apps/api/index.js`。

`deploy/docker-compose.yml`：

- App 使用 `gaokao-data` volume 持久化 `/var/data/gaokao`；
- 每 30 秒调用 `/api/health`；
- Caddy 等待 App healthy 后反向代理；
- Caddy 管理 80/443 和自己的证书数据卷。

`Caddyfile` 启用 zstd/gzip，设置 `X-Content-Type-Options`、`Referrer-Policy` 并隐藏 Server header。

## 环境变量

`.env.example` 当前包含：

- `PORT`、`DATA_DIR`；
- `ADMIN_USERNAME`、`ADMIN_PASSWORD`；
- OpenAI、DeepSeek、DashScope key/model/base URL。

Future 应补充并文档化 cookie secure、token secret/TTL、allowed origins、log level、LLM timeout/budget 等生产配置，并在启动时做强校验。

## Production Readiness

已有基础：可构建镜像、健康检查、持久卷、反向代理、RBAC、session rotation、参数校验、fallback 和 E2E。

尚不能称为生产级，优先缺口是：

1. CI/CD quality gates；
2. 数据库 migration、backup、restore drill；
3. structured logs、traces、metrics 和 alerting；
4. rate limiting、CORS allowlist、CSRF 与 token storage 收紧；
5. request deadline、LLM retry/circuit breaker；
6. 数据来源和版本发布治理；
7. 性能/并发/故障注入测试。
