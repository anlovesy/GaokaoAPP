# Interview Notes

以下回答面向 AI Agent Engineer、AI Application Engineer 和 LLM Application Engineer 面试。建议先给结论，再说明代码设计、取舍和下一步，不回避当前边界。

## 1. 为什么不用 LLM 直接推荐？

**回答：** 因为志愿推荐是高风险、强时效、强约束问题。学校专业、位次、选科和招生计划必须来自可核验数据；LLM 参数知识无法保证年份、省份和规则正确。

项目中 `generateVolunteerPlan` 先完成画像标准化、数据召回、约束过滤、排序和冲稳保。LLM 只在最后接收既有结果，生成 overview、strategy、careerAdvice 和 riskAlerts；调用失败时回退本地摘要，推荐结果不变。

这个边界带来可复现性和可降级性。短板是当前规则仍是启发式，数据只有广东 2025 为主，也没有真实录取概率校准。

## 2. Advisor 为什么采用 Deterministic Workflow？

**回答：** 当前阶段更需要可控和可评测，而不是最大自治。意图到工具的映射固定后，可以明确断言“政策问题必须查 policy tool”“学费问题必须查 enrollment plan”，也方便在没有模型密钥时跑离线回归。

Runtime 仍保留 Agent 的关键边界：Context、Memory、Intent、Planner、Tool Router、Evidence、Policy、LLM、Citation、Reflection 和 Persistence。下一步可以在保持 tool contract 和 guardrail 的前提下替换决策层，而不用重写所有数据工具。

代价是泛化能力有限，新表达或复合任务可能命不中关键词，执行也只能一轮完成。

## 3. Tool Router 为什么不是动态 Tool Calling？

**回答：** 当前 `AdvisorPlanner` 从 `TOOL_RECIPES` 取工具名，`AdvisorToolRouter` 用 `switch` 执行本地函数。这是有意选择的第一阶段架构，不应包装成模型 tool calls。

原因有三点：数据表和政策覆盖尚不完整；工具还没有 JSON Schema、权限和错误 contract；系统尚未建立 max steps、timeout、recovery 和 trajectory eval。此时直接开放动态循环，会扩大不可控面。

升级顺序应是 typed tools → 参数校验/授权 → event trace → max-step/deadline → 单轮 model tool call → 受控多轮 loop → recovery eval。

## 4. 为什么使用 SQLite？

**回答：** 当前目标是单实例求职作品集和低成本演示。SQLite 提供事务、索引、外键、prepared statement 和单文件持久化，不需要额外数据库服务；Node 24 内置 `node:sqlite`，部署也更简单。

项目用同一个 `app.db` 保存认证、会话、方案和领域数据，并通过 `DATA_DIR` 挂载持久卷。这个选择不代表 SQLite 适合所有生产负载。需要多实例写入、横向扩展或更复杂分析时，应迁移 PostgreSQL，并补 migration、backup、connection pool 和一致性方案。

## 5. Data Engine 为什么没有直接替换 Planner？

**回答：** Planner 已有大量召回、fallback、约束和冲稳保行为，直接替换数据访问会同时改变输入数据与算法结果，回归风险很高。

因此新 Data Engine 先与旧路径共存：Schema、Repository、Query Service 和 Facade 服务数据 API 与 Advisor；Planner 仍读取 generated data 和静态 catalog，并局部使用 Data Engine。迁移前要先固定 golden profiles 和当前输出，再按 rank → admission → plan → policy 顺序替换，每一步比较 tier coverage、constraint violations 和推荐稳定性。

这是阶段性技术债，不是最终架构。

## 6. 如何解决 LLM 幻觉？

**回答：** 当前做了多层限制，但不能说已经彻底解决。

已实现：

- 推荐结果由确定性代码生成；
- Advisor 根据 intent 检索 Workspace/Data Engine 证据；
- Response Policy 将 evidence 和回答焦点注入 prompt；
- Citation metadata 记录证据类型；
- Reflection 检查 grounding、citation coverage 和具体性；
- 无模型/模型失败时有本地 fallback；
- 文案要求不承诺录取，并提醒正式核验。

不足：Citation 缺 source URL/版本/页码，Reflection 不会重试，policy/career 数据为空，前端也未显示证据。下一步要做 field-level provenance、claim-evidence matching、证据不足拒答和受控 replan。

## 7. 当前项目最大的技术短板？

**回答：** 最大短板不是 UI，而是数据覆盖和 Agent 闭环还不够硬。

最关键的五项：

1. 真实数据主要只有广东 2025，2026 计划只有 SCUT 样本。
2. Policy、volunteer rule、career outlook 表为空。
3. Planner 与 Data Engine 未统一，`plannerService.js` 体积过大。
4. Tool Router 是固定配方，没有 typed model tool calling、loop 和 recovery。
5. 没有生产级 CI、observability、migration、backup、rate limiting 和 LLM budget。

回答短板时同时给出按数据基础 → Agent runtime → grounded recommendation → production 的路线，体现优先级判断。

## 8. 如果继续做，如何升级成真正 Agent？

**回答：** 我不会先把 Router 改成 while loop，而会先建立工具和状态协议。

1. 为每个 tool 定义 name、description、JSON Schema、authorization、timeout、idempotency 和 typed result。
2. 引入 durable Agent State：goal、messages、plan、observations、citations、step count、deadline、status。
3. 记录 plan/tool/observation/reflection event，先获得 trajectory visibility。
4. 让模型在单轮内选择工具，参数通过 Zod/JSON Schema 校验。
5. 增加 max steps、deadline、token/cost budget 和 allowlist。
6. Reflection 只对 recoverable failure 触发有限 replan，其余明确停止或要求澄清。
7. 用离线 trajectory eval 验证 tool selection、argument correctness、citation correctness 和 task completion。

只有这些完成后，才适合称为 model-driven Agent Runtime。

## 9. 如何做离线评测？

**回答：** 分层评测比只打最终回答分更有效。

- Intent：分类准确率、缺失字段识别。
- Entity：大学/专业解析 precision、comparison completeness。
- Plan：正确工具集合、无多余高成本工具。
- Tool：参数正确、查询 scope 正确、超时与错误分类。
- Evidence：记录是否支持 claim、年份和省份是否匹配。
- Answer：事实一致、引用覆盖、风险免责声明、拒答质量。
- Trajectory：step count、replan rate、success rate、latency、token/cost。
- Recommendation：hard constraint violation、tier stability、backtest hit rate、calibration。

当前 Advisor quality script 已有 8 个规则场景，Planner script 有 10 个画像扫描；下一步要固定数据库 snapshot、增加 golden expected metadata，并把 deterministic assertions 与人工/LLM judge 分开。

## 10. 如何生产化？

**回答：** 按风险面推进，而不是只做 Docker 化。

- **数据**：source manifest、checksum、staging、质量阈值、版本发布、回滚和多年份覆盖。
- **Agent**：typed tools、deadline、retry、circuit breaker、event trace、成本预算和 eval gate。
- **应用**：拆分 oversized services、统一错误模型、幂等与并发策略。
- **安全**：CORS allowlist、rate limit、登录防爆破、CSRF 策略、移除 localStorage bearer token、secret rotation。
- **数据库**：migration、自动备份、恢复演练和容量监控。
- **可观测性**：structured logs、request/trace IDs、OpenTelemetry、metrics、alerts 和 provider dashboard。
- **交付**：CI lint/check/build/e2e/eval，staging，镜像扫描，受控发布和 rollback。

当前 Docker、Caddy、healthcheck、persistent volume、RBAC 和 session rotation 是生产基础，但不等于 production ready。

## 一分钟项目总结

> GaokaoAPP 是一个数据驱动的高考决策系统。我没有让 LLM 直接生成志愿，而是用确定性 Planner 处理位次、约束、排序和冲稳保，再用 Advisor Runtime 把当前方案、会话记忆和数据工具组织成有证据的追问流程。当前工具路由是固定配方，Citation 和 Reflection 已在后端形成 metadata，但还没有 model-driven loop 和前端 Trace。项目同时覆盖 React/Express、SQLite Data Engine、多模型 fallback、RBAC、质量脚本和 Docker/Caddy。它现在最需要补的是多年份真实数据、Planner 数据统一、Agent state/recovery 和生产可观测性。

## 面试中不要使用的表述

- “Fully Autonomous Agent”。
- “LLM 会自主选择工具”。
- “完整全国 2021-2026 数据库”。
- “真实录取概率”。
- “完整 RAG / MCP / Multi-Agent”。
- “用户已经能看到 Citation 和 Reflection”。
- “已经 production ready”。
