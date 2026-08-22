# 数据架构

## 数据生命周期

```mermaid
flowchart TD
    OFFICIAL[Official exam authority and university sources] --> RAW[PDF / ZIP / web query / source notes]
    RAW --> PREP[Preparation and fetch scripts]
    PREP --> CSV[Normalized CSV in data/import]
    TEMPLATE[CSV templates] --> CSV
    CSV --> IMPORT[importService + CSV parser]
    IMPORT --> VALIDATE[Dataset type and scope validation]
    VALIDATE --> JOB[DataImportService transaction]

    JOB --> SOURCE[(data_source)]
    JOB --> IMPORTJOB[(import_job)]
    JOB --> UNIVERSITY[(university)]
    JOB --> MAJOR[(major)]
    JOB --> RANK[(score_rank_segment)]
    JOB --> ADMISSION[(admission_record)]
    JOB --> PLAN[(enrollment_plan)]
    JOB -. future data .-> POLICY[(province_policy / volunteer_rule)]
    JOB -. future data .-> CAREER[(career_outlook)]

    UNIVERSITY --> REPO[Repositories]
    MAJOR --> REPO
    RANK --> REPO
    ADMISSION --> REPO
    PLAN --> REPO
    POLICY --> REPO
    CAREER --> REPO

    REPO --> QUERY[Query Services]
    QUERY --> FACADE[RecommendationDataFacade]
    FACADE --> ADVISOR[Advisor Tool Router]
    FACADE --> DATAAPI[/api/data query endpoints]
    FACADE -. partial migration .-> PLANNER[Volunteer Planner]
```

## 当前数据来源

- 广东省 2025 普通类历史 / 物理一分一段官方材料及转换后的 CSV。
- 广东省 2025 本科历史 / 物理投档与院校专业组历史线材料及转换后的 CSV。
- 华南理工大学官方招生查询生成的广东 2026 物理类 29 条招生计划样本。
- 大学和专业基础维度由导入流程归一化建立；“大学表有记录”不意味着该大学拥有完整年份、省份和专业计划。

原始/转换文件在 `data/official-downloads/` 与 `data/import/`，模板在 `data/import-templates/`。

## 导入链路

1. `scripts/import-gaokao-data.js` 调用 `importAllCsvFiles()`。
2. `importService` 根据文件名识别 `province_score_rank`、`university_major_lines` 或 `enrollment_plan`。
3. CSV parser 生成行对象，`DataImportService` 进行字段标准化和单一 scope 校验。
4. 导入事务写入维度表、事实表、`data_source` 与 `import_job`。
5. 历史录取线会同时生成标记为 `historical_inference` 的计划行；它们不是官方当年招生计划。
6. 独立官方计划以 `official_csv` 标记导入，并可替代对应推断行。

当前导入服务记录成功/失败数量，但 `import_error_row` 尚未形成完整逐行错误治理；`data_source` 也没有 source URL、文件 checksum 和许可证等完整 lineage 字段。

## 分层

| 层            | 职责                                   | 当前实现                      |
| ------------- | -------------------------------------- | ----------------------------- |
| Schema        | 维度、事实、来源、任务、政策与职业表   | `dataEngineCore.sql.js`       |
| Adapter       | SQLite prepare/run/transaction         | `SqliteDataEngineAdapter.js`  |
| Repository    | 参数化数据访问                         | `repositories/`               |
| Query Service | 位次、录取、计划、大学、专业、政策查询 | `services/`                   |
| Facade        | 面向推荐/Advisor 的组合接口            | `RecommendationDataFacade.js` |
| Import        | CSV 标准化、scope 校验、事务写入       | `DataImportService.js`        |

## 当前覆盖（2026-08-22 只读统计）

| 表                   |  数量 | 范围                                  |
| -------------------- | ----: | ------------------------------------- |
| `university`         | 2,403 | 基础大学维度                          |
| `major`              |   102 | 基础专业维度                          |
| `score_rank_segment` | 1,171 | 广东 2025 历史 573、物理 598          |
| `admission_record`   | 5,137 | 广东 2025 历史 1,634、物理 3,503      |
| `enrollment_plan`    | 5,166 | 历史推断 5,137；2026 SCUT 官方样本 29 |
| `province_policy`    |     0 | 未导入                                |
| `volunteer_rule`     |     0 | 未导入                                |
| `career_outlook`     |     0 | 未导入                                |

## Planner 与 Data Engine 的关系

Advisor 工具已经主要通过 Data Engine Facade / Query Service 检索。Planner 仍以 `loadGeneratedGaokaoData()`、静态 `plannerData.js` 和多层 fallback 作为主召回来源，同时直接引用 `getDataEngine()` 补充结构化能力。

因此当前不是“所有推荐数据都经 Data Engine”的单一路径。Future 目标是让 Planner 的召回、规则与证据包统一建立在 Facade 上，并把静态 fallback 明确降级为测试/演示数据。

## 已知数据缺口

- 全国多省、多年份 2021-2026 历史数据。
- 2026 完整院校专业计划。
- 省级政策、批次和志愿规则。
- 可靠的选科要求版本管理。
- 可验证的职业、就业、薪资和深造数据。
- 录取结果标签和统计校准数据。
- source URL、抓取时间、checksum、license 和逐行错误审计。
