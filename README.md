# 高考志愿智能体

面向广东考生与家长的高考志愿规划 Web 应用，支持根据省份、选科类别、分数、位次、兴趣、职业规划和现实约束，生成可解释的大学与专业填报方案。

## 主要能力

- 正式志愿推荐：输出冲 / 稳 / 保志愿表
- 聊天式 AI 志愿顾问：支持持续追问、解释推荐原因
- 多模型接入：支持 OpenAI、DeepSeek、通义千问兼容模式
- 真实数据导入：支持一分一段表与院校专业线导入
- 后台管理：登录、历史记录、数据上传
- 生产部署：支持 Docker 与 Render

## 广东 2025 真实数据

当前项目已经导入：

- 广东省 2025 普通类历史一分一段表
- 广东省 2025 普通类物理一分一段表
- 广东省 2025 本科批投档线数据

当前导入结果：

- `provinceScoreRankCount = 1171`
- `universityMajorLineCount = 5137`

数据来源为广东省教育考试院 2025 年官方公开附件整理。

## 技术栈

- 前端：React + Vite
- 后端：Express
- 数据存储：SQLite
- AI 接入：OpenAI Compatible API
- 部署：Render / Docker

## 本地开发

安装依赖：

```bash
npm.cmd install
```

启动开发环境：

```bash
npm.cmd run dev
```

前端默认地址：

- `http://localhost:5173`

后端默认地址：

- `http://localhost:3001`

## 生产构建

构建前端：

```bash
npm.cmd run build
```

启动生产服务：

```bash
npm.cmd start
```

生产访问地址：

- `http://localhost:3001`

## 数据导入

重新导入 CSV 数据：

```bash
npm.cmd run import:data
```

生成广东 2025 官方整理数据：

```bash
C:\\Users\\Administrator\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe scripts\\prepare-guangdong-2025-data.py
```

## 环境变量

参考 [\.env.example](D:\agent\study\GaokaoApp\.env.example)

```env
PORT=3001
DATA_DIR=
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123456

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash

DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen-plus
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

说明：

- 本地开发可不设置 `DATA_DIR`
- 在 Render 上建议配置 `DATA_DIR=/var/data/gaokao`
- 该目录将用于持久化数据库、导入文件和生成后的数据文件

## 关键目录

```text
src/                           React 前端
server/                        Express 后端
server/services/               推荐、聊天、导入、数据库服务
server/data/generated/         导入后生成的 JSON 数据
data/import/                   可导入 CSV 数据
data/official-downloads/       官方 PDF 与中间文件
scripts/prepare-guangdong-2025-data.py
deploy/                        部署说明
```

## Render 部署

仓库已包含：

- [render.yaml](D:\agent\study\GaokaoApp\render.yaml)
- [DEPLOYMENT.md](D:\agent\study\GaokaoApp\deploy\DEPLOYMENT.md)

当前 Render 配置已包含：

- `healthCheckPath: /api/health`
- Node 24 运行环境
- `/var/data` 持久化磁盘
- `DATA_DIR=/var/data/gaokao`

将项目推送到 GitHub 后，可直接在 Render 上创建 Web Service 并接入仓库部署。
