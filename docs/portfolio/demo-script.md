# 90 秒求职 Demo 脚本

## Demo 目标

用 90 秒说明 GaokaoAPP 的核心工程判断：**推荐由确定性算法和招生数据完成，LLM 负责解释与追问；当前 Advisor 是可评测的确定性工作流，不是自主 Agent。**

演示前准备：

- 使用一个已有历史方案的登录测试账号；
- 选择当前数据较完整的广东 2025 物理类画像；
- 提前确认本地 API、Web 与所选模型状态；也可显式使用 local provider 演示降级；
- 不在现场导入数据，不依赖临时网络抓取；
- 浏览器保持 1440 × 900 左右，关闭开发者工具和无关标签页。

## Current Demo（当前可以真实演示）

### 0-10s：项目定位

画面：Landing 或考生画像入口。

讲稿：

> GaokaoAPP 是一个高考志愿 AI Decision System。它不让 LLM 直接选学校，而是先用真实招生数据和确定性规则生成冲稳保，再让 Advisor 基于方案和证据解释。

证明点：产品不是独立 Chat 页面，有完整决策入口。

### 10-25s：输入考生画像

画面：Candidate Profile / Navigation。

操作：快速展示省份、物理类、分数、位次、选科、风险偏好、城市与专业方向，点击生成。

讲稿：

> 画像不只有分数，还包括位次、选科、预算、城市、专业方向和调剂意愿。后端用 Zod 校验，位次优先参与判断。

避免：不要声称系统支持全国真实推荐；选广东画像。

### 25-40s：生成冲稳保方案

画面：Decision Workspace。

操作：快速扫过冲、稳、保层级和方案摘要，展开一条学校/专业。

讲稿：

> 候选先经过数据召回、选科和偏好过滤，再按当前位次与历史最低位次的差值进入冲稳保。LLM 不会修改学校、专业和层级，只负责摘要。

避免：界面 confidence 不要讲成录取概率，称“规则置信分”或“相对风险分”。

### 40-55s：展示数据与推荐依据

画面：院校详情、专业信息或 Workspace 推荐理由。

操作：指出历史年份、最低位次、计划/学费字段和风险理由中当前确实显示的部分。

讲稿：

> 当前数据库以广东 2025 历史和物理数据为主，另有 2026 华南理工大学 29 条官方计划样本。历史线和官方计划在数据模型里分开标记。

避免：不要声称全国 2021-2026 完整覆盖，也不要把 `historical_inference` 当官方招生计划。

### 55-70s：Advisor 追问

画面：Advisor。

建议问题：

> 中山大学和深圳大学怎么选？如果更看重就业，继续说。

讲稿：

> Advisor 会继承当前方案和会话，识别比较与就业意图，按固定工具配方检索大学、专业和历史录取证据，再交给模型表达。模型不可用时会降级到本地回答。

避免：不要说“模型自主决定调用哪些工具”。

### 70-80s：说明 Workflow 与数据边界

画面：README 中 Agent Architecture Mermaid，或 IDE 中 `AdvisorRuntime.js` 的主链路。

讲稿：

> 当前是 Deterministic Agent Runtime：Context、Memory、Intent、Planner、Tool Router、Citation 和 Reflection 都已模块化，但工具路由由规则控制。Reflection 会报告证据问题，目前不会自动重试。

避免：当前 UI 不展示完整 Agent Trace、Citation 和 Reflection，不要在产品画面中假装存在。

### 80-90s：历史方案与收束

画面：History，恢复一条历史方案。

讲稿：

> 方案和聊天会持久化，用户可以恢复历史版本。这个项目展示的是从数据、推荐、Agent-like Workflow 到认证、测试和部署的完整 AI 应用工程。

## 现场备用路径

- 外部模型超时：切换 local provider，并说明 fallback 是设计能力。
- 当前账号无历史：提前生成一条方案，不现场创建管理员账号。
- Advisor 数据不足：选当前 Workspace 中真实存在的两个学校追问。
- 页面刷新：登录后从 History 恢复方案。

## Demo 中必须主动说明的限制

- 当前真实数据主要是广东 2025，2026 只有 SCUT 样本。
- 当前 Tool Router 由确定性逻辑控制。
- Citation / Reflection 后端已有 metadata，前端未完整展示。
- confidence 未做真实录取概率校准。
- 正式填报必须核验考试院和高校官方数据。

## Future Demo（完成后才能演示）

以下镜头不能出现在 Current Demo：

1. Agent Trace 时间线：展示 intent、plan、tool start/end、observation、reflection 和 token/latency。
2. 可点击 Citation：定位 source URL、年份、记录 ID、文件 checksum 和原文页码。
3. Model-driven Tool Calling：模型基于 typed tool schema 选择工具，并受 max steps / timeout 控制。
4. Recovery：工具超时或证据不足后有限 replan，再次生成答案。
5. Recommendation Evidence Bundle：每条学校专业展示数据来源、规则命中、风险变化与政策校验。
6. 校准面板：用历史回测展示不同风险分桶的真实命中表现。

完成对应代码、测试和 UI 后，才能将这些能力移动到 Current Demo。

## 作品集交付清单

- 90 秒无剪辑核心流程视频；
- 3-5 分钟架构讲解视频；
- 4 张版本化截图：Profile、Workspace、Advisor、History；
- README 架构图；
- 一份 Advisor quality 输出和一份 Planner quality 输出；
- 不包含真实密钥、真实用户信息或不可公开的招生材料。
