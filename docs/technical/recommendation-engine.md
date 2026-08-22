# Recommendation Engine 技术说明

## 设计原则

推荐引擎遵循一条核心边界：**LLM 不决定最终志愿表**。院校专业召回、规则过滤、排序、冲稳保分层和备选方案均由 `plannerService.js` 的确定性逻辑完成。

## 输入画像

HTTP schema 定义以下关键字段：

- 核心成绩：province、examMode、track、selectedSubjects、score、rank；
- 风险与预算：risk、maxTuition、willingAdjustment；
- 方向偏好：interests、careerPlan、majorNeeds、personalityTags；
- 院校偏好：preferredCities、schoolTags；
- 限制条件：candidateType、specialPlans、healthNotes、subjectConstraints、englishScore。

`normalizeProfile` 会填充默认值，并在可用时通过一分一段数据从分数推导位次。用户显式位次优先。

## 专业方向匹配

系统将兴趣标签、职业计划、备注、专业需求和性格标签合并为 keyword pool，再对 `majorDirections` 和别名关键词计分。Top directions 用于：

- 历史院校专业记录匹配；
- 静态大学优势专业匹配；
- 专业详情与推荐理由；
- Planner summary 和 Advisor planning context。

这是可解释的关键词规则，不是 embedding 召回或学习排序模型。

## 数据召回

推荐池由三路合并：

1. `buildDataDrivenRecommendations`：使用 `loadGeneratedGaokaoData()` 中的导入数据。
2. `scoreSchools`：对静态 `universityCatalog` 和方向数据评分，作为 fallback。
3. `buildRescueRecommendations`：在低分段或候选不足时补充可报学校。

合并时按大学/专业等稳定字段去重，再进入 V3 tier normalization。当前 `plannerService.js` 也引用 Data Engine 以补充结构化计划/专业能力，但并未完成所有数据读取的 Facade 化。

## 规则过滤

主要过滤与约束包括：

- 科类和结构化/文本选科要求；
- 医学、特殊计划等启发式科目边界；
- 学费上限；
- 城市和院校标签；
- 专业方向；
- 中外合作、定向和特殊类型项目；
- 英语成绩、健康说明与服从调剂相关条件。

实现同时包含 strict 与 relaxed preference 路径。硬约束应保持阻断，软偏好在候选不足时可放宽，并追加原因说明。

当前政策与志愿规则表为空，部分复杂选科边界只能依赖结构化计划字段和启发式规则；这也是 Advisor policy-boundary 质量场景未完全通过的根因之一。

## 排序

候选综合考虑：

- 当前位次与历史最低位次的距离；
- 风险偏好对应的 tier configuration；
- 专业方向匹配；
- 城市、院校标签和用户偏好；
- 历史记录数与数据完整度；
- 低分段 rescue bonus；
- 软偏好放宽惩罚。

代码中存在多个历史版本辅助函数，当前输出链路最终进入 `normalizeRecommendationPoolForPlanV3` 和 `buildApplicationPlanV3`。`plannerService.js` 体积较大，后续应拆分召回、约束、评分、分层和解释模块，并删除不可达旧版本逻辑。

## 冲稳保

V3 使用 `resolvePlanTierMetrics`：

- 计算 `rankGap = historicalMinRank - candidateRank`；
- 根据当前位次、低分段和历史类稀疏度动态计算 safe / steady / rush margins；
- 在 strict window 外允许受控 fallback window；
- 按层级执行数量目标、排序和 backfill；
- 生成 backup options。

风险偏好会改变可接受区间和推荐策略。输出层级为 rush / steady / safe，并附推荐理由、位次差、confidence、学费、城市与专业细节。

## Confidence 的含义

`buildPlanConfidence` 根据 tier、位次差和动态区间生成规则分数，并设置不同层级 floor。它可以用于相对排序和 UI 风险提示，但不满足概率语义：

- 没有真实录取标签训练；
- 没有 train/test split；
- 没有 calibration curve、Brier score 或分桶命中率；
- 没有跨年份回测。

因此文档、Demo 和 UI 都不应将 confidence 称为“录取概率”。

## LLM Summary

推荐结果生成后，系统先构建 local summary，再可选调用 `generateStructuredPlanningSummary`。模型只返回 overview、strategy、careerAdvice 和 riskAlerts。JSON 解析失败、provider 未配置或请求失败时使用 local summary。

模型输出不回写 recommendation pool，也不会改变学校、专业、层级或 confidence。

## 输出

主要结构：

- normalized profile；
- summary；
- diagnosis；
- majorDirections；
- applicationPlan；
- backupOptions；
- riskAlerts；
- meta：analysisMode、providerStatus、dataSource、latestProvinceYear、latestUniversityYear。

该结果保存到 `plans.result_json`，也作为 Advisor 的 `planningContext`。

## 评测现状

`scripts/verify-planner-quality.mjs` 通过 API 对广东物理/历史不同分数和位次画像检查：

- 三层推荐覆盖；
- 学费缺失；
- 城市缺失；
- 专业详情缺失；
- API failure。

它是规则质量扫描，不是录取效果评估。Future 应增加固定数据快照、golden cases、约束 violation rate、层级稳定性、年度回测与概率校准。

## 优先重构

1. 将 Data Engine 设为唯一真实数据读取层。
2. 把 `plannerService.js` 拆成 recall、eligibility、ranking、tiering、explanation。
3. 将政策/选科/志愿规则版本化为可测试 hard constraints。
4. 为每条推荐生成字段级 evidence bundle。
5. 建立真实结果回测与 calibration，而不是继续调启发式 confidence。
