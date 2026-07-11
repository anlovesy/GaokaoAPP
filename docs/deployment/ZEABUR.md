# Zeabur 上线说明

## 适用场景

如果你在 Render 被绑卡拦住，或者更希望使用对国内用户更友好的平台，可以直接改用 Zeabur。

当前仓库已经满足 Zeabur 的基础部署条件：

- 已包含 `Dockerfile`
- 前后端已整合为单个 Node 服务
- 默认内置广东 2025 真实数据
- 支持后续再补环境变量接入大模型

## 上线步骤

1. 打开 [Zeabur](https://zeabur.com/)
2. 登录并创建一个新 Project
3. 选择 `Deploy New Service`
4. 选择 `GitHub`
5. 导入仓库 `anlovesy/GaokaoAPP`
6. 让平台自动识别 `Dockerfile`
7. 等待第一次构建完成

## 必填环境变量

至少建议配置：

```env
ADMIN_USERNAME=你的后台账号
ADMIN_PASSWORD=你的后台密码
```

如果你要启用聊天式 AI 顾问，再补其中一组或多组：

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash

DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen-plus
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

## 可选环境变量

```env
PORT=3001
DATA_DIR=/data/gaokao
```

说明：

- `PORT` 一般不需要手动改，平台通常会自动注入
- `DATA_DIR` 用于保存数据库、上传文件和生成后的结构化数据

## 持久化存储建议

如果 Zeabur 支持给当前服务挂载持久化存储卷，建议：

1. 新建一个 Volume
2. 挂载到服务内，例如 `/data`
3. 把环境变量 `DATA_DIR` 设为 `/data/gaokao`

这样可以持久保存：

- 后台账号数据库
- 登录令牌
- 志愿历史记录
- 聊天历史
- 后台上传的 CSV 数据

如果你暂时不挂载持久化存储：

- 应用仍然可以正常启动
- 首页、推荐、聊天、真实广东 2025 数据都可以用
- 但服务重建后，后台上传和历史记录可能丢失

## 健康检查

部署完成后，优先检查：

- `/api/health`
- `/api/meta/data-status`

期望看到：

- `ok: true`
- `2025`
- `广东`
- `历史`
- `物理`

## 首次上线检查

1. 打开首页，确认手机和电脑端都能正常访问
2. 登录后台
3. 检查推荐接口是否可用
4. 检查聊天区是否可用
5. 检查数据状态是否识别到广东 2025 数据

## 当前项目默认能力

即使你还没有配置模型 Key，系统也可以：

- 生成正式志愿推荐
- 使用本地规则做基础分析
- 读取广东 2025 已导入数据

配置模型 Key 后，聊天式 AI 志愿顾问体验会更完整。
