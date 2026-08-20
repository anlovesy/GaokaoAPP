# 数据导入目录

把真实高考数据 CSV 放到本目录，然后执行：

```bash
npm run import:data
```

## Official enrollment plan refresh

The repository includes a reproducible official-data importer for the current SCUT sample:

```bash
npm run data:scut:2026
npm run import:data
```

It writes `enrollment_plan_2026_guangdong_physics_scut.csv` from the official SCUT admissions query. The imported rows contain concrete majors, plan counts, subject requirements, major groups and tuition. Source URLs and scope are recorded in `data/official-downloads/scut-2026-guangdong-physics-plan.md`.
This CSV is a 29-row SCUT sample for Guangdong 2026 physics-track admissions, not a complete nationwide admissions database.

Do not convert historical admission-line rows whose major is only a group label into concrete majors or tuition values. Add a verified official plan source first.

建议文件命名：

- `province_score_rank_2026.csv`
- `university_major_lines_2026.csv`

可参考上一级 `import-templates` 目录中的模板格式。
