# Data Engine 技术说明

## 目标

Data Engine 将高考领域数据从 Planner 的文件读取和静态目录中抽离，提供可扩展的关系模型、参数化查询和业务 Facade。当前基础分层已实现，数据覆盖和 Planner 迁移尚未完成。

## Schema

### 维度与元数据

- `dim_province`、`dim_year`、`dim_batch`、`dim_subject`；
- `data_source`、`import_job`、`import_error_row`；
- `subject_requirement_rule`。

### 大学与专业

- `university`、`university_alias`；
- `major`、`major_alias`；
- `university_advantage_major`。

### 招生事实

- `score_rank_segment`；
- `admission_record`；
- `enrollment_plan`。

### 设计但尚未填充的领域

- `industry`、`career_outlook`；
- `province_policy`；
- `volunteer_rule`。

Schema 包含常用 province/year/track/rank/university/major 索引，并启用 SQLite foreign keys。

## Adapter 与 Repository

`SqliteDataEngineAdapter` 封装 prepared statement、`run/get/all` 和 transaction。Repository 按实体拆分：

- ScoreRankRepository；
- AdmissionRepository；
- EnrollmentPlanRepository；
- UniversityRepository；
- MajorRepository；
- PolicyRepository。

Repository 不负责 HTTP 和 LLM 表达；Query Service 在其上组合领域查询。

## Query Service

- `RankQueryService`：按分数或位次查询一分一段。
- `AdmissionQueryService`：按省份、年份、科类和位次窗口搜索录取记录。
- `PlanQueryService`：搜索招生计划和大学当前计划。
- `UniversityQueryService`：大学搜索和录取快照。
- `MajorQueryService`：专业搜索和录取快照。
- `PolicyQueryService`：省级政策与志愿规则。

`RecommendationDataFacade` 对外提供 candidate snapshot、admission evidence、university snapshot、major snapshot 和 eligible plans，避免上层直接依赖 SQL。

## Import Pipeline

```text
CSV file
→ importService file/type validation
→ csvService parser
→ DataImportService row normalization
→ single province/year/track scope assertion
→ transaction
→ dimensions + facts + source/job metadata
→ cache invalidation
```

支持三种 dataset：

- `province_score_rank`；
- `university_major_lines`；
- `enrollment_plan`。

关键行为：

- 同 scope 的一分一段和历史线在事务中替换，避免重复叠加。
- 历史线导入会生成 `historical_inference` 计划行，只用于兼容查询，不能表述为官方计划。
- 官方计划以 `official_csv` 标记，并按稳定 plan key 更新/插入。
- 大学、专业和选科规则通过缓存与 stable code 归一化。
- 导入任务记录 total/success/failed rows 和状态。

## 数据来源与可追溯性

当前仓库保存广东 2025 官方 PDF/文本材料、转换 CSV，以及 SCUT 2026 官方样本的 source note。数据库 `data_source` 记录 source type/name、province/year、version 和 imported time。

仍缺少：

- source URL 与发布机构结构化字段；
- 下载时间、内容 checksum 和原始文件 hash；
- license / usage policy；
- parser version 与 transform version；
- 每个字段的 provenance；
- `import_error_row` 的完整写入和重放工具。

## 当前数据覆盖

| 表                 |  行数 | 说明                                     |
| ------------------ | ----: | ---------------------------------------- |
| university         | 2,403 | 基础维度                                 |
| major              |   102 | 基础维度                                 |
| score_rank_segment | 1,171 | GD 2025 history + physics                |
| admission_record   | 5,137 | GD 2025 history + physics                |
| enrollment_plan    | 5,166 | 5,137 inferred + 29 SCUT official sample |
| province_policy    |     0 | 空                                       |
| volunteer_rule     |     0 | 空                                       |
| career_outlook     |     0 | 空                                       |

统计时间为 2026-08-22，来源为对当前 `app.db` 的只读 SQL 查询。

## API 使用

`apps/api/app.js` 提供 university、major、plan 和 admission 等数据查询路由，使用 Zod 解析可选筛选参数。Admin upload 先做 RBAC，再保存文件并调用 `importCsvFile`。

Advisor 的 Entity Resolver 和 Tool Router 通过 `getDataEngine()` 使用查询服务与 Facade。Policy tool 能执行查询，但当前 policy/rule 表为空；employment tool 当前读取 major 表的 career path 字段，而非空的 `career_outlook` 表。

## 与 Planner 的关系

Data Engine 的模块 README 仍明确写着“不替换 existing planner APIs yet”。当前 Planner：

- 主链路读取 `loadGeneratedGaokaoData()`；
- 使用 `plannerData.js` 的静态目录；
- 具有 rescue/fallback；
- 局部引用 `getDataEngine()`。

因此 Data Engine 已服务 Advisor 和数据 API，但不是 Planner 唯一事实来源。迁移时应先固定现有推荐回归集，再逐步将召回和字段补全改为 Facade，避免一次性改变冲稳保行为。

## 数据是否足以真实推荐

当前数据足以支撑广东 2025 场景下的数据驱动原型和推荐算法演示，但不足以承担真实填报产品承诺：

- 单一年份无法建模趋势与波动；
- 2026 正式计划覆盖几乎为空；
- 政策、规则和 career 数据为空；
- 缺少真实录取结果做 probability calibration；
- 缺少全国省份差异和批次规则。

## Future

1. 定义 source manifest、checksum、parser version 和 field lineage。
2. 完成广东 2021-2026，再扩展代表性省份。
3. 导入政策、志愿规则与选科要求，并建立生效时间。
4. 建立导入 staging、逐行错误、质量阈值和原子发布。
5. Planner 全量迁移到 Facade。
6. 建立备份、恢复、migration 和数据版本回滚。
