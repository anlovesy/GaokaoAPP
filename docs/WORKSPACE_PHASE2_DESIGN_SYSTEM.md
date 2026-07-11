# Workspace Phase 2 Design System

## Objective

把 Workspace 从单页设计稿升级为可复用的组件系统母版，为 University、Volunteer、AI Advisor 和 Motion System 提供统一来源。

## Core Subject

产品对象不是 Dashboard，而是：

`AI Decision Workspace`

它的单一任务不是“展示信息”，而是：

`帮助用户把复杂变量整理成可执行的志愿顺序`

---

## Layout System

### Desktop Ratio

- Left: `18%`
- Center: `60%`
- Right: `22%`

### Layout Principle

- 左侧提供人物语境
- 中间承担主叙事与主操作
- 右侧承担 AI 思考与快速干预

### Spacing

- Outer padding: `48 - 64`
- Column gap: `28 - 32`
- Major block gap: `32 - 40`
- Micro spacing: `12 - 16`

---

## Core Components

### 1. Candidate Capsule

结构：

- Portrait
- Persona Summary
- Current Goal
- Three Strengths
- Decision Preference
- Current Strategy
- CTA

规则：

- 不做资料列表
- 不做表单容器
- 不做多标签堆叠
- 通过留白和标题建立层级

### 2. Decision Universe

结构：

- Eyebrow
- Hero Title
- Supporting Line
- Bezier Path
- Variable Nodes
- Animated Dot
- Short Explanation

节点语义：

- Score
- Rank
- Interest
- City
- AI
- University
- Decision

规则：

- Hero 是推导，不是结果
- Path 是主视觉，不是说明插图
- Animated Dot 表示当前推导进度

### 3. Today’s Insight

结构：

- Eyebrow
- One Core Conclusion
- 2-3 Judgments

规则：

- 一句结论必须足够有判断
- 每条判断最多两行
- 不写成长说明
- 更像 Editorial Note，不像 PPT 模块

### 4. Confidence Block

结构：

- Label
- Confidence Statement
- Rating
- Last Updated

规则：

- 不用 Excel 大百分比做主视觉
- 用判断表达可信度
- 强调“状态”，不是“报表”

### 5. Decision Timeline

结构：

- Vertical Path
- School Image
- School Name
- City
- Probability
- Risk Level
- Expand Hint

状态：

- Default
- Hover
- Expanded

规则：

- 不做普通列表
- 不做纯表格
- 每个学校都应该像决策节点
- Hover 展开完整分析，点击进入更深层信息

### 6. AI Studio

结构：

- Large Orb
- Current Thinking
- Current Focus
- Quick Suggestion
- Input

规则：

- 不像手机聊天框
- 不像微信
- 不像客服
- 更像 OpenAI Desktop / Raycast 控制中心

### 7. Orb Input

结构：

- Minimal Glass Input Plane
- Soft Border
- Orb Submit Trigger

规则：

- 不做传统输入框
- 输入行为应属于 AI Studio 的一部分

---

## Surface Rules

### Surfaces

- Base canvas: warm white / fog gray
- Main planes: translucent white
- Deep planes: navy dark glass

### Radius

- Major surface: `32 - 40`
- Mid component: `24 - 30`
- Pills: `18 - 24`

### Border

- Hairline only
- Very low contrast

### Shadow

- Minimal
- Use glow and blur instead of hard shadows

---

## State Rules

### Default

- Quiet
- Spacious
- Low-contrast surface hierarchy

### Hover

- Lift by 4-8px
- Slight scale or image zoom
- Increase contrast and glow

### Focus

- Soft bloom
- Slight border emphasis

### Expanded

- Panel grows in place
- Supporting details fade in
- No sudden layout jumps

### Loading

- Path drawing
- Orb pulse
- Dot drift

---

## Timeline Rules

### Image Ratio

- Default node thumb: `96 x 46`
- Rounded `16`

### Metadata Order

- Name
- City
- Probability
- Risk

### Risk Language

- Low
- Medium
- High

不用冷冰冰的等级代号作为唯一表达。

---

## Brand Mapping

所有组件都必须映射到统一母题：

- Orbit
- Path
- Connection
- Decision

映射方式：

- Candidate Capsule = decision context
- Decision Universe = reasoning path
- Today’s Insight = judgment
- Timeline = ordered decision
- AI Studio = orbit core

---

## Exit Criteria

如果 Phase 2 完成，应该达到：

1. 单独看任一组件也能识别品牌
2. University / Volunteer / Advisor 可直接继承规则
3. 页面不再依赖 Dashboard 逻辑拼装
4. Motion 可以直接挂接到组件状态上
