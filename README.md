# 高考志愿智能平台

一个面向高考生、家长和志愿填报顾问的智能志愿平台，重点服务广东考生。

它不是单纯的“分数换学校”工具，而是一个带有完整前端工作台、志愿推荐引擎、聊天式 AI 顾问、账号体系、历史记录和数据导入能力的可落地项目。

## 项目特点

- 三页式产品结构：平台介绍页、独立登录页、正式工作台
- 广东优先：重点适配广东新高考、专业组、选科限制、冲稳保逻辑
- 聊天式 AI 顾问：支持连续追问、记忆最近上下文、解释“为什么这么填”
- 志愿推荐更贴近实战：考虑分数、位次、选科、城市、兴趣、职业规划、风险偏好
- 冲稳保分层推荐：尽量做到层级清晰，减少滑档风险
- 游客体验 + 正式账号：游客可体验一次正式方案，登录后可持续使用
- 多模型接入：支持 OpenAI、DeepSeek、通义千问兼容模式
- 后台能力：用户管理、密码管理、历史记录、数据导入
- 可本地运行、可生产构建、可部署到 Render / Zeabur / 自有服务器

## 当前已实现的核心能力

### 1. 三页式前端

- 首页：平台介绍与能力展示
- 登录页：独立账号登录入口
- 工作台页：学生画像、志愿输入、推荐结果、账户中心
- 独立 AI 顾问页：单独的顾问工作区，不和主工作台挤在同一页面

### 2. 智能志愿推荐

- 根据省份、分数、位次、选科生成志愿建议
- 结合兴趣、人格标签、职业规划、城市偏好调整推荐
- 输出冲 / 稳 / 保三个层级的院校与专业建议
- 重点控制低分段“无校可报”的问题
- 尽量让保底层更接近高把握度，降低滑档概率
- 支持结合专业组风险、调剂风险做解释

### 3. AI 志愿顾问

- 聊天式交互
- 可结合当前志愿表继续追问
- 可解释“为什么推荐这个学校 / 专业”
- 支持连续问答，不再每轮都从头回答
- 对短追问如“继续”“展开”“1+2”“第一条细说”做延续处理
- 支持更强的“老师式”表达风格

### 4. 账号、历史记录、游客逻辑

- 登录后可保存志愿方案和聊天记录
- 可恢复最近一次会话和规划结果
- 游客模式默认只开放一次正式志愿体验
- 后台支持管理员和顾问两类角色

### 5. 数据导入与数据结构

- 支持一分一段表导入
- 支持院校专业分数线结构导入
- 已内置演示规则和导入后的结构化数据读取能力
- 项目中已经准备了广东 2025 相关数据整理脚本与导入链路

## 当前适合的使用场景

- 广东高考生自己做第一版志愿草案
- 家长和学生一起讨论学校、专业、城市取舍
- 志愿填报老师 / 顾问做咨询辅助
- 搭建自己的高考志愿 SaaS / 工作室平台原型

## 技术栈

- 前端：React 19 + Vite
- 后端：Express
- 数据存储：SQLite
- AI 接入：OpenAI Compatible API
- 构建：Vite
- 部署：Render / Zeabur / 自建服务器

## 本地开发

安装依赖：

```bash
npm.cmd install
```

启动开发环境：

```bash
npm.cmd run dev
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

## 生产构建

构建前端：

```bash
npm.cmd run build
```

启动生产服务：

```bash
npm.cmd start
```

默认生产访问地址：

- `http://localhost:3001`

说明：

- 后端会托管 `dist` 下的前端静态资源
- 所以生产模式下通常直接访问 `3001` 端口即可

## 代码检查

```bash
npm.cmd run check
```

## 环境变量

参考文件：

[.env.example](/D:/agent/study/GaokaoApp/.env.example)

推荐配置：

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

- `DATA_DIR` 用于持久化数据库、上传文件和生成后的结构化数据
- 本地开发可不设置 `DATA_DIR`
- 生产部署建议设置持久化目录
- `ADMIN_USERNAME` 默认可设为 `LYYzhiyuan`
- `ADMIN_PASSWORD` 必须改成你自己的强密码

## 默认账号逻辑

项目不是把账号密码写死在前端，而是走后端环境变量和数据库逻辑。

管理员账号：

- 用户名通常来自 `ADMIN_USERNAME`
- 密码来自 `ADMIN_PASSWORD`
- 启动后端时会自动检查并初始化管理员账号

角色说明：

- `admin`：管理员，可管理用户、查看更完整记录
- `advisor`：普通顾问账号，可正常使用系统

游客模式：

- 未登录用户可进入游客模式
- 默认只开放一次正式志愿方案体验
- 连续聊天、上下文记忆、历史记录更适合登录后使用

## AI 模型接入

当前已支持：

- OpenAI
- DeepSeek
- 通义千问兼容模式

后端会自动读取已配置的可用模型，并在前端展示。

如果没有配置任何在线模型：

- 系统会回退到本地规则式顾问回复
- 仍可演示连续追问和志愿解释逻辑

## 广东 2025 数据

项目已围绕广东考生做了重点优化，并准备了 2025 相关数据整理与导入链路。

你可以关注这些目录和脚本：

- [scripts/prepare-guangdong-2025-data.py](/D:/agent/study/GaokaoApp/scripts/prepare-guangdong-2025-data.py)
- [server/data/generated](/D:/agent/study/GaokaoApp/server/data/generated)
- [data/import](/D:/agent/study/GaokaoApp/data/import)

重新导入数据：

```bash
npm.cmd run import:data
```

如果要重新生成广东 2025 整理数据，可使用项目里的 Python 脚本。

## 公网临时演示

如果你只是想临时给别人一个公网链接演示，可以使用项目里已经准备好的脚本：

- [start-public-demo.cmd](/D:/agent/study/GaokaoApp/start-public-demo.cmd)
- [stop-public-demo.cmd](/D:/agent/study/GaokaoApp/stop-public-demo.cmd)

更详细说明：

- [deploy/PUBLIC_DEMO.md](/D:/agent/study/GaokaoApp/deploy/PUBLIC_DEMO.md)
- [deploy/ACCESS_AND_USERS.md](/D:/agent/study/GaokaoApp/deploy/ACCESS_AND_USERS.md)

## 部署说明

### Render

项目已包含 Render 配置：

- [render.yaml](/D:/agent/study/GaokaoApp/render.yaml)
- [deploy/DEPLOYMENT.md](/D:/agent/study/GaokaoApp/deploy/DEPLOYMENT.md)

当前 Render 配置包含：

- `healthCheckPath: /api/health`
- Node 24
- `/var/data` 持久化磁盘
- `DATA_DIR=/var/data/gaokao`

### Zeabur

如果 Render 因绑卡等问题不方便继续，推荐看：

- [deploy/ZEABUR.md](/D:/agent/study/GaokaoApp/deploy/ZEABUR.md)

### 自建服务器 / 长期生产

如果你后续准备正式商用、长期使用，建议看：

- [deploy/SERVER_PRODUCTION.md](/D:/agent/study/GaokaoApp/deploy/SERVER_PRODUCTION.md)

## 项目目录

```text
src/                           React 前端
server/                        Express 后端
server/services/               推荐、聊天、导入、数据库服务
server/data/generated/         结构化数据
data/import/                   可导入 CSV 数据
data/official-downloads/       官方数据与中间文件
scripts/                       数据整理脚本
deploy/                        部署与演示说明
tools/                         公网演示和辅助工具
```

## 当前项目定位

这个项目现在已经不是单纯的 Demo。

它更像一个可以继续打磨成：

- 高考志愿填报顾问平台
- 志愿工作室接单工具
- 家长 / 学生咨询系统
- 可部署的商业化原型

## 后续建议

如果你准备继续把它做强，优先级建议是：

1. 继续补强广东 2025 真实院校专业数据
2. 继续优化 AI 顾问的人设、追问质量和推荐解释
3. 增加更细的后台运营能力，例如用户审核、套餐、权限控制
4. 做更正式的部署方案和域名上线
