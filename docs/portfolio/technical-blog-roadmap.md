# 技术博客路线

## 写作原则

- 每篇只把代码中存在的部分写成“已实现”。
- “部分实现”必须同时写出缺口。
- “未来规划”使用设计提案语态，并给出验证标准。
- 所有数据数量、测试结果和架构名都固定到 commit/date，避免长期漂移。
- 不使用 RAG、MCP、Multi-Agent、Autonomous Agent 等当前不存在的标签引流。

## Blog 01：《为什么高考志愿推荐不能直接交给 LLM》

**状态：已实现，可优先发布**

核心论点：高风险、强时效决策中，LLM 参数知识不能替代数据检索和规则约束。

文章结构：

1. 直接生成的幻觉、时效和不可复现问题。
2. Candidate Profile、历史位次、规则过滤和风险分层的职责。
3. GaokaoAPP 如何让确定性 Planner 决定候选，让 LLM 只生成摘要。
4. provider 未配置/失败时为什么仍可返回方案。
5. 当前数据限制与正式核验边界。

代码证据：`generateVolunteerPlan`、`generateStructuredPlanningSummary`、local summary fallback。

不要声称：算法已经产生真实录取概率，或系统可用于全国正式填报。

## Blog 02：《从规则推荐到 Advisor Workflow》

**状态：已实现**

核心论点：一个 AI 应用不只需要聊天接口，还需要将业务状态、工具证据和回答策略组合成可测试运行时。

文章结构：

1. Planner 和 Advisor 的职责为什么分离。
2. Runtime 从 session merge 到 persistence 的完整顺序。
3. Context 与 Memory 如何承接“继续”“第二个”等短追问。
4. Deterministic Workflow 的优点：可控、可复现、易做回归测试。
5. 为什么当前不称为 autonomous Agent。

代码证据：`AdvisorRuntime`、`ContextBuilder`、`MemoryEngine`、质量脚本。

## Blog 03：《GaokaoAPP Data Engine 的数据建模》

**状态：部分实现**

已实现：关系 Schema、Repository、Query Service、Facade、事务 CSV 导入、source/job metadata、广东 2025 backfill 和 SCUT 2026 样本。

未完成：全国多年份数据、完整 lineage、逐行错误治理、Planner 全量迁移、migration/backup。

文章结构：

1. 为什么位次、录取线、计划、政策必须分实体。
2. `historical_inference` 与 `official_csv` 的边界。
3. Repository / Query Service / Facade 的职责。
4. 数据导入的 scope replacement 与事务。
5. 当前覆盖表和下一阶段数据治理。

## Blog 04：《Tool Router、Citation 与 Reflection》

**状态：部分实现**

已实现：固定 Tool Recipes、进程内 Router、Evidence bundle、Citation Formatter、八类 Reflection check 和 API meta。

未完成：模型 tool calls、typed schema、可点击来源、前端 Trace、Reflection recovery loop。

文章结构：

1. 从 intent 到 fixed recipe 的实际执行方式。
2. 各工具返回 evidence/citations/invocations 的 contract。
3. Citation 为什么目前只是 metadata，不是完整 provenance。
4. Reflection 能发现什么，为什么现在不能自我修复。
5. 从确定性 Router 迁移到受控 model-driven loop 的方案。

标题或摘要不得把当前 Router 写成“LLM 动态 Tool Calling”。

## Blog 05：《如何为 Agent 建立离线评测体系》

**状态：部分实现，需先补评测基线再发布完整版**

当前已有：8 个 Advisor 场景的规则断言、10 个 Planner 画像的数据完整度扫描、Playwright smoke。

当前缺少：固定数据库 snapshot、LLM judge 校准、工具选择 precision/recall、citation correctness、trajectory metrics、跨模型稳定性和成本/延迟指标。

文章结构：

1. 为什么只看“回答像不像人”不够。
2. Intent、tool plan、entity focus、evidence、citation、answer 六层指标。
3. 当前 quality script 的实现与一个失败案例。
4. deterministic checks 与 LLM-as-judge 的分工。
5. 未来 eval dataset、regression gate 和观测指标。

## Blog 06：《从 AI Demo 到生产级 AI Application》

**状态：未来规划为主**

可写现状：Express/React、SQLite、RBAC、session rotation、Docker/Caddy、healthcheck、fallback 和现有测试。

必须明确尚未完成：CI/CD、migration、backup、rate limit、structured logs、tracing、metrics、LLM budget、timeout/retry/circuit breaker、数据发布治理。

文章结构：

1. “能跑的 Demo”和“可运营系统”的差异。
2. 现有 production foundation。
3. 安全、数据、模型和部署四类风险清单。
4. 可观测性和 SLO 设计。
5. 分阶段生产化路线与验收门槛。

## 建议发布顺序

1. Blog 01：建立项目技术立场。
2. Blog 02：展示 Agent-like Runtime 能力。
3. Blog 03：展示数据工程深度。
4. Blog 04：坦诚解释 Tool Router 与 Agent 边界。
5. Blog 05：补齐评测后发布。
6. Blog 06：在 CI、observability 和安全加固后更新成实践复盘。

## 每篇发布前验证

- 引用的文件与函数仍存在。
- 数据数量重新执行只读统计。
- 质量脚本重新运行并记录 commit。
- Future 内容没有使用完成时态。
- 截图来自对应 commit，且不泄露 token、账号或个人信息。
