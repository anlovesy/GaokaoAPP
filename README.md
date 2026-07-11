# 志序 ZHIXU AI

面向高考考生与家长的 AI 志愿填报系统。

项目目标不是做一个简单的“分数换学校”工具，而是搭建一套可持续迭代的 AI 决策工作台，围绕考生画像、志愿推荐、院校专业查询、AI 顾问和历史方案管理，形成完整的产品闭环。

## 当前状态

当前仓库已经完成一轮较大规模的结构升级与前端重构，核心方向包括：

- 前后端目录升级为 `apps/web + apps/api`
- Landing / Login / Navigation / Workspace / Advisor / History 多页面产品化
- 志愿推荐工作流与 AI Advisor 独立化
- 更完整的数据导入、部署、验证脚本
- 更贴近生产环境的项目组织方式

## 核心能力

### 1. 产品页面体系

- `Landing`：品牌首页，强调高校视觉氛围与产品定位
- `Login`：独立登录入口
- `Navigation`：考生画像与偏好录入
- `Workspace`：志愿推荐主工作台
- `Advisor`：独立 AI 顾问页面
- `History`：历史方案与记录页面

### 2. 志愿推荐能力

- 基于省份、分数、位次、科类/选科进行推荐
- 支持冲 / 稳 / 保分层推荐
- 支持院校、专业、城市、风险偏好等多维条件
- 支持结合当前画像进行志愿解释
- 推荐逻辑尽量落在真实数据，而不是纯模型猜测

### 3. AI Advisor

- 支持连续追问
- 支持围绕当前方案继续解释
- 支持学校、专业、就业、政策等问题
- 支持基于上下文延续对话，而不是每轮都重新开始
- 已增加对“继续 / 第二个 / 前两个 / 继续按就业说”这类短追问的承接能力

### 4. 数据与导入

- 支持一分一段、院校专业线、招生计划等数据导入脚本
- 支持后续逐步扩展到多省份、多年份
- 已准备数据导入模板与校验脚本

### 5. 账号与后台能力

- 登录用户可使用更完整的 Advisor 能力
- 管理端支持用户管理相关页面
- 游客模式与正式账号模式分离

## 技术栈

### 前端

- React 19
- Vite 7
- Framer Motion
- GSAP

### 后端

- Express 5
- Zod
- OpenAI Compatible SDK

### AI / 模型接入

- OpenAI
- DeepSeek
- 通义千问兼容模式

## 项目结构

```text
apps/
  api/                  Express API、AI、数据服务、模块化业务逻辑
  shared/               预留共享模块
  web/                  React 前端应用

data/
  import-templates/     数据导入模板

docs/
  deployment/           部署与公网演示文档
  design-system/        设计系统与视觉规范文档

preview/                设计预览与演示资源
scripts/                导入、校验、预览、截图等脚本
tests/e2e/              E2E 测试
tools/                  启动辅助与演示工具
```

## 前端结构

前端主目录：

```text
apps/web/src/
  app/
  components/
  modules/
  motion/
  pages/
  providers/
  styles/
  AppRoot.jsx
  main.jsx
```

页面目录重点包括：

- [apps/web/src/pages/landing](/D:/agent/study/GaokaoApp/apps/web/src/pages/landing)
- [apps/web/src/pages/auth](/D:/agent/study/GaokaoApp/apps/web/src/pages/auth)
- [apps/web/src/pages/navigation](/D:/agent/study/GaokaoApp/apps/web/src/pages/navigation)
- [apps/web/src/pages/workspace](/D:/agent/study/GaokaoApp/apps/web/src/pages/workspace)
- [apps/web/src/pages/advisor](/D:/agent/study/GaokaoApp/apps/web/src/pages/advisor)
- [apps/web/src/pages/history](/D:/agent/study/GaokaoApp/apps/web/src/pages/history)

## 后端结构

后端主目录：

```text
apps/api/
  modules/              模块化业务能力
  services/             数据服务、LLM、导入等服务层
  middleware/           中间件
  data/                 数据目录
  storage/              运行时存储
  app.js
  index.js
```

Advisor 相关模块主要位于：

- [apps/api/modules/advisor](/D:/agent/study/GaokaoApp/apps/api/modules/advisor)
- [apps/api/services/llmService.js](/D:/agent/study/GaokaoApp/apps/api/services/llmService.js)
- [apps/api/services/advisorFollowUpService.js](/D:/agent/study/GaokaoApp/apps/api/services/advisorFollowUpService.js)

## 本地开发

安装依赖：

```bash
npm install
```

启动前后端开发环境：

```bash
npm run dev
```

默认地址：

- 前端：[http://127.0.0.1:4173](http://127.0.0.1:4173)
- 后端健康检查：[http://127.0.0.1:3001/api/health](http://127.0.0.1:3001/api/health)

单独启动：

```bash
npm run dev:client
npm run dev:server
```

## 构建与运行

生产构建：

```bash
npm run build
```

启动后端服务：

```bash
npm start
```

## 校验脚本

语法检查：

```bash
npm run check
```

Lint：

```bash
npm run lint
```

Advisor 质量校验：

```bash
npm run verify:advisor-quality
```

Planner 质量校验：

```bash
npm run verify:planner-quality
```

前端综合校验：

```bash
npm run verify:frontend
```

## 环境变量

参考文件：

[.env.example](/D:/agent/study/GaokaoApp/.env.example)

常用配置：

```env
PORT=3001
DATA_DIR=

ADMIN_USERNAME=LYYzhiyuan
ADMIN_PASSWORD=CHANGE_ME_TO_A_STRONG_PASSWORD

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash

DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen-plus
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

说明：

- `DATA_DIR` 用于持久化数据库、上传文件和生成数据
- 生产环境建议显式配置 `DATA_DIR`
- `ADMIN_PASSWORD` 必须替换为强密码

## 部署文档

部署与公网演示文档位于：

- [docs/deployment/DEPLOYMENT.md](/D:/agent/study/GaokaoApp/docs/deployment/DEPLOYMENT.md)
- [docs/deployment/PUBLIC_DEMO.md](/D:/agent/study/GaokaoApp/docs/deployment/PUBLIC_DEMO.md)
- [docs/deployment/ACCESS_AND_USERS.md](/D:/agent/study/GaokaoApp/docs/deployment/ACCESS_AND_USERS.md)
- [docs/deployment/SERVER_PRODUCTION.md](/D:/agent/study/GaokaoApp/docs/deployment/SERVER_PRODUCTION.md)
- [docs/deployment/ZEABUR.md](/D:/agent/study/GaokaoApp/docs/deployment/ZEABUR.md)

## 数据与脚本

常用脚本包括：

- [scripts/import-gaokao-data.js](/D:/agent/study/GaokaoApp/scripts/import-gaokao-data.js)
- [scripts/generate-university-assets.js](/D:/agent/study/GaokaoApp/scripts/generate-university-assets.js)
- [scripts/verify-advisor-quality.mjs](/D:/agent/study/GaokaoApp/scripts/verify-advisor-quality.mjs)
- [scripts/verify-planner-quality.mjs](/D:/agent/study/GaokaoApp/scripts/verify-planner-quality.mjs)

## 当前定位

这个项目当前更接近：

- AI 高考志愿顾问产品原型
- 可持续扩展的志愿推荐工作台
- 具备继续走向生产环境的前后端基础

它已经不再只是单页 Demo，但也仍然处于持续重构与数据完善阶段。

## 下一步建议

如果继续往生产环境推进，优先级建议是：

1. 继续补强真实院校、专业、招生计划与学费数据
2. 继续完善 Advisor 的连续记忆、引用与工具调用质量
3. 补齐认证、RBAC、监控、日志与部署规范
4. 持续清理临时脚本和演示资产，保持仓库整洁
