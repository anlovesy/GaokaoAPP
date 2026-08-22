# Advisor Runtime 技术说明

## 目标与边界

Advisor Runtime 将“围绕当前志愿方案追问”拆为可单独测试的处理阶段。当前实现强调可预测性和证据约束，因此执行图由代码控制。

准确表述：

- 已实现：Agent-like Advisor Workflow、状态上下文、确定性 Planner、工具路由、证据、Citation metadata、Reflection metadata、持久化和多模型生成。
- 未实现：模型原生 tool calls、动态 Agent Loop、durable state machine、自动 replan/recovery、RAG、MCP、Multi-Agent。

## Runtime 装配

`apps/api/app.js` 通过 `createAdvisorRuntime` 注入以下依赖：

| 组件                    | 职责                                             |
| ----------------------- | ------------------------------------------------ |
| `ContextBuilder`        | 从方案、会话和历史构建当前上下文包               |
| `MemoryEngine`          | 提取稳定画像、偏好、Workspace 和对话信号         |
| `IntentRecognizer`      | 关键词计分与启发式意图识别                       |
| `AdvisorPlanner`        | 根据意图和上下文生成固定工具计划                 |
| `EntityResolver`        | 从消息和数据表解析大学、专业、政策主题与对比对象 |
| `AdvisorToolRouter`     | 执行进程内数据工具并收集证据                     |
| `AdvisorResponsePolicy` | 根据意图、证据强度和焦点约束回答形态             |
| `PersonaEngine`         | 生成 `xuefeng` / `gentle` 模式提示               |
| `CitationFormatter`     | 规范化、去重和摘要引用                           |
| `ReflectionEngine`      | 对回复做规则质量检查                             |
| `generateAdvisorReply`  | 模型调用、本地 fallback 与最终文本生成           |
| DB functions            | 加载/保存聊天历史                                |

依赖显式注入让质量脚本可以直接构建 Runtime，并替换持久化方法，避免依赖 HTTP 路由。

## Context

`ContextBuilder.build` 生成：

- `profile`：省份、科类、分数、位次、选科、考生类型和风险标签；
- `workspace`：诊断、摘要、冲稳保首个锚点和层级数量；
- `session`：会话 ID、是否追问、消息数量和上一条助手回复预览；
- `history`：最近 3 条会话摘要；
- `recentMessages`：最近 12 条合并消息；
- `planningNarrative`：注入 LLM 的结构化上下文文本。

Context Builder 不访问向量数据库，也不执行语义检索。

## Memory

`MemoryEngine` 每轮从 `planningContext`、合并消息、当前会话和最近历史重新构建 snapshot：

- stable profile memory；
- preference memory；
- workspace memory；
- conversation signals；
- compressed memory and conversation summaries。

持久状态来自 SQLite `chat_history` 中的消息；Memory snapshot 本身没有独立表或跨用户知识库。此设计适合当前场景，但未来需要定义可更新、可删除、可解释的长期记忆 contract。

## Intent

Intent Catalog 包含：学校推荐、专业推荐、院校查询、政策咨询、就业咨询、考研规划、风险分析和生涯规划。

识别方式分两层：

1. 正则启发式优先识别政策、就业、考研、比较和风险表达。
2. 关键词包含计分选择最高意图；无命中时回到 `general_follow_up`。

confidence 是规则命中等级，不是模型概率。推荐/风险意图还会检查省份、科类、分数、位次是否缺失。

## Planner

`AdvisorPlanner` 读取 `TOOL_RECIPES`：

| 意图                      | 默认工具                              |
| ------------------------- | ------------------------------------- |
| school recommendation     | workspace、admission、enrollment plan |
| major recommendation      | workspace、major、employment          |
| university lookup         | workspace、university、admission      |
| policy consulting         | policy、knowledge base                |
| employment / postgraduate | major、employment、knowledge base     |
| risk analysis             | workspace、admission、enrollment plan |
| career planning           | workspace、major、employment          |

Planner 会因“学费”、录取风险或已有 Workspace 增补工具，并生成 clarify / answer 模式。它没有调用 LLM，也没有动态搜索工具目录。

## Tool Router

Router 目前支持：

- `workspace_data`：当前画像、冲稳保锚点和摘要；
- `admission_database`：历史录取位次/分数；
- `enrollment_plan_database`：计划数、学费、选科和批次；
- `university_database`：大学档案与历史记录；
- `major_database`：专业档案、历史记录与对比支持；
- `policy_database`：省级政策和志愿规则；
- `employment_database`：复用专业表内的职业路径与深造方向；
- `knowledge_base`：当前方案摘要和诊断，不是外部 RAG 知识库。

每次 invocation 只记录 `toolName`、`ok` 和 `itemCount`。工具是同步本地函数，没有参数 Schema、超时预算、权限声明、幂等键或独立错误 contract。

特别说明：`career_outlook` 当前为 0 行，employment tool 不应被表述为就业率/薪资数据库。

## Response Policy 与 LLM

Response Policy 根据 response focus、证据强度、意图、对比对象和决策框架生成系统提示。Persona Engine 叠加表达模式。`generateAdvisorReply` 将 Context、Plan、Evidence 和 Policy 作为 override 传入。

Provider 选择：

1. 显式 provider；
2. `auto` 按 OpenAI → DeepSeek → Qwen 顺序选择首个已配置 provider；
3. 无配置时使用 local fallback；
4. provider 请求失败时捕获错误并返回 local fallback 与 provider status。

OpenAI 使用 Responses API，DeepSeek 与 Qwen 使用 OpenAI-compatible Chat Completions。当前 fallback 提高可用性，但没有跨 provider 自动轮询重试；一次选定 provider 失败后直接回本地结果。

## Citation

工具先生成 `{ sourceType, label }`。Citation Formatter 在回复生成后去重，并转换为带 ID 和 display 的列表。Citation 会进入 API `meta`，但当前 label 主要是内部可读描述，不包含 URL、文档版本、页码、checksum 或可点击证据定位。

## Reflection

Reflection 执行八类检查：

- external evidence presence；
- profile completeness；
- reply grounding；
- citation coverage；
- workspace anchor alignment；
- comparison coverage；
- reply specificity；
- reply genericity。

中等严重度问题会把状态标为 `warn` 和 `reviewRequired: true`。Runtime 不读取该结果决定重试，因此 Reflection 是观测机制，不是自我修复循环。

## Persistence

- 有 `sessionId`：`saveChatSessionHistory`。
- 无 `sessionId`：`saveChatHistory`。
- 每轮将 assistant reply 合入消息并裁剪到最多 20 条。
- `chat_history` 保存 user、session、provider、messages JSON、reply text 和时间。

## 当前风险与后续演进

- 给工具定义统一的 typed contract、JSON Schema 和错误枚举。
- 将 intent、plan、tool start/end、observation、reflection 作为 Agent Event 持久化。
- 引入 max steps、deadline、retry policy 和 recoverable/non-recoverable 分类。
- 让 Reflection 可以触发有限 replan，而非无限自循环。
- 将 Citation 扩展为 source URL、year、record ID、version、field-level evidence。
- 为 Memory 增加显式写入策略、冲突解决、TTL 与用户删除能力。
- 前端展示工具、证据、引用、风险边界和记忆变更。
