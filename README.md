# 高考志愿智能体

这是一个面向生产工作的高考志愿规划 Web 应用，支持：

- 手机 / 电脑端访问
- 正式志愿推荐
- 聊天式 AI 志愿顾问
- OpenAI / DeepSeek / 通义千问多模型接入
- 真实高考数据导入
- Docker / Render 部署

## 已实现能力

### 志愿规划

- 输入学生省份、分数、位次、兴趣、职业规划、城市偏好、学费上限
- 输出冲 / 稳 / 保正式志愿表
- 输出备选志愿和高风险提醒
- 支持打印版导出

### 聊天式 AI 顾问

- 生成方案后，可继续聊天追问
- 支持问：
  - 为什么推荐某个学校 / 专业
  - 学校优先还是专业优先
  - 怎么调成更保守 / 更冲刺
  - 哪些专业更适合就业 / 读研

### 多模型接入

支持以下模型提供方：

- OpenAI
- DeepSeek
- 通义千问（DashScope Compatible Mode）

### 真实数据导入

支持导入：

- 各省一分一段表
- 各院校专业录取最低分 / 最低位次

导入后，推荐会优先参考导入数据，而不是只使用演示模型。

## 目录结构

```text
src/                        React 前端
server/                     Express 后端
server/services/            规划、聊天、多模型、数据服务
server/data/generated/      导入后生成的 JSON 数据
scripts/import-gaokao-data.js  数据导入脚本
data/import/                真实 CSV 数据放置目录
data/import-templates/      CSV 模板
deploy/                     部署文档
```

## 本地运行

### 安装依赖

```bash
npm.cmd install
```

### 开发模式

```bash
npm.cmd run dev
```

访问：

- 前端：<http://localhost:5173>
- 后端：<http://localhost:3001>

### 生产模式

```bash
npm.cmd run build
npm.cmd start
```

访问：

- <http://localhost:3001>

## 一键批处理

可直接双击：

- [dev-start.bat](D:\agent\study\GaokaoApp\dev-start.bat) 开发启动
- [build-prod.bat](D:\agent\study\GaokaoApp\build-prod.bat) 生产构建
- [start-prod.bat](D:\agent\study\GaokaoApp\start-prod.bat) 生产启动

## 环境变量

参考 [\.env.example](D:\agent\study\GaokaoApp\.env.example)

```env
PORT=3001

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash

DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen-plus
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

说明：

- 不配置模型密钥也能运行
- 没配置时自动退回本地规则模式

## 导入真实高考数据

### 第一步：准备 CSV

把真实数据文件放到：

```text
data/import/
```

建议命名：

- `province_score_rank_2026.csv`
- `university_major_lines_2026.csv`

模板参考：

- [province_score_rank_template.csv](D:\agent\study\GaokaoApp\data\import-templates\province_score_rank_template.csv)
- [university_major_lines_template.csv](D:\agent\study\GaokaoApp\data\import-templates\university_major_lines_template.csv)

### 第二步：执行导入

```bash
npm.cmd run import:data
```

导入后会生成：

- [provinceScoreRank.json](D:\agent\study\GaokaoApp\server\data\generated\provinceScoreRank.json)
- [universityMajorLines.json](D:\agent\study\GaokaoApp\server\data\generated\universityMajorLines.json)

### 当前已导入的真实数据

当前项目已经导入：

- 广东省 2025 年普通类历史一分一段数据
- 广东省 2025 年普通类物理一分一段数据

来源：

- 广东省教育考试院 2025-06-26 官方附件压缩包

说明：

- 目前已经接入广东 2025 位次数据
- 但院校专业录取最低位次的 2025 全量官方结构化数据仍需继续整理或补充源文件

## 发布成公网链接

当前仓库已经补充：

- [Dockerfile](D:\agent\study\GaokaoApp\Dockerfile)
- [render.yaml](D:\agent\study\GaokaoApp\render.yaml)
- [DEPLOYMENT.md](D:\agent\study\GaokaoApp\deploy\DEPLOYMENT.md)

### 推荐方式

1. 推到 GitHub
2. 部署到 Render
3. 配置环境变量
4. 获取公网访问链接

## 当前限制

- 还没有用户登录系统
- 还没有数据库持久化聊天记录和历史方案
- 还没有后台上传界面，目前真实数据导入仍通过 CSV + 脚本完成
- 没有直接在当前本地机器上自动生成永久公网链接，需要部署到云平台后获得外部访问地址

## 下一步建议

如果继续往正式产品走，最值得继续做的是：

1. 增加登录、账号和历史方案保存
2. 增加后台数据上传页
3. 接入数据库
4. 增加 Excel / PDF 导出
5. 接入官方最新年度数据清洗流程
