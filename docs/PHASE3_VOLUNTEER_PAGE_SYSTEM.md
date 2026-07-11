# Phase 3 Volunteer Page System

## Objective

把“志愿方案页”从 Workspace 的一个区块，升级为独立的品牌页面。

它的任务不是解释系统，而是：

`帮助用户排序、比较、确认和输出自己的志愿结构`

## Page Role

Volunteer Page 应该像：

- a strategic sequencing board
- a decision editor
- an ordered recommendation canvas

不应该像：

- 表格页
- 传统后台管理页
- 普通拖拽看板
- 说明型教育页面

---

## Core Layout

### Desktop

- Left rail: `16%`
- Main board: `62%`
- Right assist rail: `22%`

### Purpose

- Left：决策上下文与排序模式
- Center：志愿排序主舞台
- Right：AI 建议、冲稳保状态与输出动作

---

## Core Sections

### 1. Volunteer Hero

内容：

- Eyebrow
- 主标题
- 一句说明
- 当前方案状态

作用：

- 告诉用户这不是一张静态结果表，而是一张正在被整理的志愿顺序

### 2. Sequence Board

内容：

- Rush Lane
- Steady Lane
- Safe Lane
- 每个 lane 内的学校序列

规则：

- 不做普通表格
- 以轨道 / lane / decision sequence 表达结构
- 每个节点应具备：
  - 图片
  - 学校名
  - 城市
  - 专业方向
  - 录取概率
  - 风险等级

### 3. Comparison Strip

内容：

- 当前选中学校对比
- 顺位差异
- 风险差异
- 城市/专业取舍提示

规则：

- 是辅助带状区，不是重卡片区
- 更像 editorial comparison strip

### 4. Decision Actions

内容：

- Print
- Export
- Send to Advisor
- Rebalance

规则：

- 动作必须克制
- 不允许出现后台式工具条

### 5. AI Assist Rail

内容：

- Current Suggestion
- Risk Alert
- Quick Compare
- Final Check

作用：

- 作为排序过程中的副脑

---

## State Logic

### Default

- 显示当前冲稳保结构
- 高亮当前主承接位

### Hover

- 节点抬升
- 显示简版分析

### Focus

- 展示学校完整摘要

### Expanded

- 展开对比、风险与专业详情

---

## Visual Language

Volunteer Page 继承：

- Orbit
- Path
- Connection
- Decision

映射：

- Lanes = decision paths
- School cards = ordered nodes
- AI assist = secondary orbit logic
- Comparison strip = connection layer

---

## Exit Criteria

完成后应达到：

1. 用户一眼就能看出“这是一张可编辑的志愿顺序页”
2. 页面属于 ZHIXU 同一品牌语言
3. 看上去像产品，而不是后台
4. 可以直接与 University / Advisor 页面衔接
