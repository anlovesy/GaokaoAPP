import crypto from "node:crypto";
import { normalizeProvinceCode as normalizeCatalogProvinceCode } from "../provinceCatalog.js";

const _LEGACY_PROVINCE_CODE_MAP = new Map([
  ["北京", "BJ"],
  ["天津", "TJ"],
  ["河北", "HE"],
  ["山西", "SX"],
  ["内蒙古", "NM"],
  ["辽宁", "LN"],
  ["吉林", "JL"],
  ["黑龙江", "HL"],
  ["上海", "SH"],
  ["江苏", "JS"],
  ["浙江", "ZJ"],
  ["安徽", "AH"],
  ["福建", "FJ"],
  ["江西", "JX"],
  ["山东", "SD"],
  ["河南", "HA"],
  ["湖北", "HB"],
  ["湖南", "HN"],
  ["广东", "GD"],
  ["广西", "GX"],
  ["海南", "HI"],
  ["重庆", "CQ"],
  ["四川", "SC"],
  ["贵州", "GZ"],
  ["云南", "YN"],
  ["西藏", "XZ"],
  ["陕西", "SN"],
  ["甘肃", "GS"],
  ["青海", "QH"],
  ["宁夏", "NX"],
  ["新疆", "XJ"],
  ["骞夸笢", "GD"]
]);

const TRUE_VALUES = new Set(["1", "true", "yes", "y", "是"]);

export class DataImportService {
  constructor(adapter) {
    this.adapter = adapter;
  }

  importProvinceScoreRankRows({ fileName, rows }) {
    const normalizedRows = rows
      .map((row) => this.normalizeProvinceScoreRankRow(row))
      .filter(Boolean);

    if (!normalizedRows.length) {
      return this.buildEmptyImportResult("province_score_rank", fileName, rows.length);
    }

    this.assertSingleScope(normalizedRows, fileName);
    const scope = this.buildScope(normalizedRows[0]);
    const sourceId = this.createDataSource({
      sourceType: "csv",
      sourceName: fileName,
      provinceCode: scope.provinceCode,
      year: scope.year,
      version: `phase2-score-rank-${Date.now()}`
    });
    const jobId = this.createImportJob({
      jobType: "csv_import",
      provinceCode: scope.provinceCode,
      year: scope.year,
      datasetName: fileName,
      totalRows: rows.length
    });

    try {
      this.adapter.transaction(() => {
        this.upsertProvinceDimension({
          provinceCode: scope.provinceCode,
          provinceName: normalizedRows[0].provinceName,
          examMode: scope.examMode
        });
        this.upsertYearDimension(scope.year);

        this.adapter.run(
          `
            DELETE FROM score_rank_segment
            WHERE province_code = ?
              AND year = ?
              AND track_type = ?
          `,
          scope.provinceCode,
          scope.year,
          scope.trackType
        );

        for (const row of normalizedRows) {
          this.adapter.run(
            `
              INSERT INTO score_rank_segment (
                province_code, year, exam_mode, track_type, score,
                rank_min, rank_max, same_score_count, cumulative_count,
                source_id, created_at, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `,
            row.provinceCode,
            row.year,
            row.examMode,
            row.trackType,
            row.score,
            row.rank,
            row.rank,
            1,
            null,
            sourceId
          );
        }
      });

      this.finishImportJob(jobId, {
        status: "completed",
        successRows: normalizedRows.length,
        failedRows: rows.length - normalizedRows.length
      });

      return {
        datasetType: "province_score_rank",
        fileName,
        insertedRows: normalizedRows.length,
        skippedRows: rows.length - normalizedRows.length,
        sourceId,
        scope
      };
    } catch (error) {
      this.finishImportJob(jobId, {
        status: "failed",
        successRows: 0,
        failedRows: rows.length
      });
      throw error;
    }
  }

  importUniversityMajorLineRows({ fileName, rows }) {
    const normalizedRows = rows
      .map((row) => this.normalizeUniversityMajorLineRow(row))
      .filter(Boolean);

    if (!normalizedRows.length) {
      return this.buildEmptyImportResult("university_major_lines", fileName, rows.length);
    }

    this.assertSingleScope(normalizedRows, fileName);
    const scope = this.buildScope(normalizedRows[0]);
    const sourceId = this.createDataSource({
      sourceType: "csv",
      sourceName: fileName,
      provinceCode: scope.provinceCode,
      year: scope.year,
      version: `phase2-major-lines-${Date.now()}`
    });
    const jobId = this.createImportJob({
      jobType: "csv_import",
      provinceCode: scope.provinceCode,
      year: scope.year,
      datasetName: fileName,
      totalRows: rows.length
    });

    const universityCache = new Map();
    const majorCache = new Map();
    const subjectRuleCache = new Map();

    try {
      this.adapter.transaction(() => {
        this.upsertProvinceDimension({
          provinceCode: scope.provinceCode,
          provinceName: normalizedRows[0].provinceName,
          examMode: scope.examMode
        });
        this.upsertYearDimension(scope.year);

        this.adapter.run(
          `
            DELETE FROM admission_record
            WHERE province_code = ?
              AND year = ?
              AND track_type = ?
          `,
          scope.provinceCode,
          scope.year,
          scope.trackType
        );

        this.adapter.run(
          `
            DELETE FROM enrollment_plan
            WHERE province_code = ?
              AND year = ?
              AND track_type = ?
              AND plan_source_type = 'historical_inference'
          `,
          scope.provinceCode,
          scope.year,
          scope.trackType
        );

        for (const row of normalizedRows) {
          const universityId = this.getOrCreateUniversity(row, universityCache);
          const majorId = this.getOrCreateMajor(row, majorCache);
          const subjectRuleId = this.getOrCreateSubjectRule(row, subjectRuleCache);

          this.upsertBatchDimension({
            provinceCode: row.provinceCode,
            year: row.year,
            batchCode: row.batchCode,
            batchName: row.batchName
          });

          this.insertAdmissionRecord({
            row,
            universityId,
            majorId,
            subjectRuleId,
            sourceId
          });

          this.insertEnrollmentPlanRow({
            row,
            universityId,
            majorId,
            subjectRuleId,
            sourceId,
            inferredFromHistoricalLine: true
          });
        }
      });

      this.finishImportJob(jobId, {
        status: "completed",
        successRows: normalizedRows.length,
        failedRows: rows.length - normalizedRows.length
      });

      return {
        datasetType: "university_major_lines",
        fileName,
        insertedRows: normalizedRows.length,
        skippedRows: rows.length - normalizedRows.length,
        sourceId,
        scope,
        inferredEnrollmentPlanRows: normalizedRows.length
      };
    } catch (error) {
      this.finishImportJob(jobId, {
        status: "failed",
        successRows: 0,
        failedRows: rows.length
      });
      throw error;
    }
  }

  importEnrollmentPlanRows({ fileName, rows }) {
    const normalizedRows = rows.map((row) => this.normalizeEnrollmentPlanRow(row)).filter(Boolean);

    if (!normalizedRows.length) {
      return this.buildEmptyImportResult("enrollment_plan", fileName, rows.length);
    }

    this.assertSingleScope(normalizedRows, fileName);
    const scope = this.buildScope(normalizedRows[0]);
    const sourceId = this.createDataSource({
      sourceType: "csv",
      sourceName: fileName,
      provinceCode: scope.provinceCode,
      year: scope.year,
      version: `phase2-enrollment-plan-${Date.now()}`
    });
    const jobId = this.createImportJob({
      jobType: "csv_import",
      provinceCode: scope.provinceCode,
      year: scope.year,
      datasetName: fileName,
      totalRows: rows.length
    });

    const universityCache = new Map();
    const majorCache = new Map();
    const subjectRuleCache = new Map();

    try {
      this.adapter.transaction(() => {
        this.upsertProvinceDimension({
          provinceCode: scope.provinceCode,
          provinceName: normalizedRows[0].provinceName,
          examMode: scope.examMode
        });
        this.upsertYearDimension(scope.year);

        this.clearEnrollmentPlanRowsByScope({
          ...scope,
          planSourceType: "official_csv"
        });

        for (const row of normalizedRows) {
          const universityId = this.getOrCreateUniversity(row, universityCache);
          const majorId = this.getOrCreateMajor(row, majorCache);
          const subjectRuleId = this.getOrCreateSubjectRule(row, subjectRuleCache);

          this.upsertBatchDimension({
            provinceCode: row.provinceCode,
            year: row.year,
            batchCode: row.batchCode,
            batchName: row.batchName
          });

          this.insertEnrollmentPlanRow({
            row,
            universityId,
            majorId,
            subjectRuleId,
            sourceId,
            inferredFromHistoricalLine: false
          });
        }
      });

      this.finishImportJob(jobId, {
        status: "completed",
        successRows: normalizedRows.length,
        failedRows: rows.length - normalizedRows.length
      });

      return {
        datasetType: "enrollment_plan",
        fileName,
        insertedRows: normalizedRows.length,
        skippedRows: rows.length - normalizedRows.length,
        sourceId,
        scope
      };
    } catch (error) {
      this.finishImportJob(jobId, {
        status: "failed",
        successRows: 0,
        failedRows: rows.length
      });
      throw error;
    }
  }

  buildEmptyImportResult(datasetType, fileName, totalRows) {
    return {
      datasetType,
      fileName,
      insertedRows: 0,
      skippedRows: totalRows
    };
  }

  buildScope(row) {
    return {
      provinceCode: row.provinceCode,
      year: row.year,
      trackType: row.trackType,
      examMode: row.examMode
    };
  }

  clearEnrollmentPlanRowsBySourceType(planSourceType) {
    this.adapter.run(
      `
        DELETE FROM enrollment_plan
        WHERE plan_source_type = ?
      `,
      planSourceType
    );
  }

  clearEnrollmentPlanRowsByScope({ provinceCode, year, trackType, planSourceType }) {
    this.adapter.run(
      `
        DELETE FROM enrollment_plan
        WHERE province_code = ?
          AND year = ?
          AND track_type = ?
          AND plan_source_type = ?
      `,
      provinceCode,
      year,
      trackType,
      planSourceType
    );
  }

  assertSingleScope(rows, fileName) {
    const first = this.buildScope(rows[0]);
    const mixed = rows.some((row) => {
      const scope = this.buildScope(row);
      return (
        scope.provinceCode !== first.provinceCode ||
        scope.year !== first.year ||
        scope.trackType !== first.trackType
      );
    });

    if (mixed) {
      throw new Error(`文件 ${fileName} 同时包含多个省份、年份或科类，已拒绝导入`);
    }
  }

  normalizeProvinceScoreRankRow(row) {
    const provinceName = String(row.province || "").trim();
    const provinceCode = this.normalizeProvinceCode(provinceName);
    const year = Number(row.year);
    const score = Number(row.score);
    const rank = Number(row.rank);
    const trackType = this.normalizeTrackType(row.track);

    if (!provinceCode || !year || !trackType || !Number.isFinite(score) || !Number.isFinite(rank)) {
      return null;
    }

    return {
      provinceName,
      provinceCode,
      year,
      examMode: this.normalizeExamMode(row.exam_mode, trackType),
      trackType,
      score,
      rank
    };
  }

  normalizeUniversityMajorLineRow(row) {
    const provinceName = String(row.province || "").trim();
    const provinceCode = this.normalizeProvinceCode(provinceName);
    const year = Number(row.year);
    const trackType = this.normalizeTrackType(row.track || row.subject_track);
    const universityName = String(row.university || "").trim();
    const majorName = String(row.major || "").trim();
    const minScore = Number(row.min_score);
    const minRank = Number(row.min_rank);

    if (
      !provinceCode ||
      !year ||
      !trackType ||
      !universityName ||
      !majorName ||
      !Number.isFinite(minScore) ||
      !Number.isFinite(minRank)
    ) {
      return null;
    }

    const batchName = String(row.batch || "").trim() || "本科批";
    const notes = String(row.notes || "").trim();

    return {
      provinceName,
      provinceCode,
      year,
      examMode: this.normalizeExamMode(row.exam_mode, trackType),
      trackType,
      batchName,
      batchCode: this.normalizeBatchCode(batchName),
      universityName,
      universityCode:
        this.extractUniversityCode(notes) || this.createStableCode("UNIV", universityName),
      majorName,
      majorCode: this.createStableCode("MAJOR", majorName),
      majorGroupCode: this.extractMajorGroupCode(majorName, notes),
      minScore,
      minRank,
      planCount: this.extractPlanCount(notes),
      actualAdmitCount: Number(row.admission_count || 0) || null,
      tuitionFee: Number(row.tuition || 0) || null,
      subjectRequirement: String(row.subject_requirement || "").trim(),
      requiredSubjects: this.splitSubjectField(row.required_subjects),
      oneOfSubjects: this.splitSubjectField(row.one_of_subjects),
      preferredSubjects: this.splitSubjectField(row.preferred_subjects),
      forbiddenSubjects: this.splitSubjectField(row.forbidden_subjects),
      notes
    };
  }

  normalizeEnrollmentPlanRow(row) {
    const provinceName = String(row.province || "").trim();
    const provinceCode = this.normalizeProvinceCode(provinceName);
    const year = Number(row.year);
    const trackType = this.normalizeTrackType(row.track || row.subject_track);
    const universityName = String(row.university || "").trim();
    const majorName = String(row.major || row.plan_name || "").trim();
    const batchName = String(row.batch || "").trim() || "本科批";
    const notes = String(row.notes || row.admission_notes || "").trim();

    if (!provinceCode || !year || !trackType || !universityName || !majorName) {
      return null;
    }

    return {
      provinceName,
      provinceCode,
      year,
      examMode: this.normalizeExamMode(row.exam_mode, trackType),
      trackType,
      batchName,
      batchCode: this.normalizeBatchCode(batchName),
      universityName,
      universityCode:
        String(row.university_code || "").trim() ||
        this.extractUniversityCode(notes) ||
        this.createStableCode("UNIV", universityName),
      majorName,
      majorCode: String(row.major_code || "").trim() || this.createStableCode("MAJOR", majorName),
      majorGroupCode:
        String(row.major_group_code || "").trim() || this.extractMajorGroupCode(majorName, notes),
      planName: String(row.plan_name || majorName).trim(),
      planCount: Number(row.plan_count || row.admission_count || 0) || 0,
      tuitionFee: Number(row.tuition || 0) || null,
      durationYears: Number(row.duration_years || 0) || null,
      campusName: String(row.campus_name || "").trim() || null,
      isNewProgram: this.toBooleanFlag(row.is_new_program),
      isCooperativeProgram: this.toBooleanFlag(row.is_cooperative_program),
      isTargetedProgram: this.toBooleanFlag(row.is_targeted_program),
      subjectRequirement: String(row.subject_requirement || "").trim(),
      requiredSubjects: this.splitSubjectField(row.required_subjects),
      oneOfSubjects: this.splitSubjectField(row.one_of_subjects),
      preferredSubjects: this.splitSubjectField(row.preferred_subjects),
      forbiddenSubjects: this.splitSubjectField(row.forbidden_subjects),
      notes
    };
  }

  getOrCreateUniversity(row, cache) {
    const cacheKey = row.universityCode;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const existing = this.adapter.get(
      `
        SELECT id
        FROM university
        WHERE university_code = ?
      `,
      row.universityCode
    );

    if (existing) {
      cache.set(cacheKey, existing.id);
      return existing.id;
    }

    const matchedByName = this.adapter.get(
      `
        SELECT id, university_code
        FROM university
        WHERE name_zh = ?
          AND province_code = ?
        ORDER BY CASE WHEN university_code LIKE 'UNIV_%' THEN 1 ELSE 0 END, id ASC
        LIMIT 1
      `,
      row.universityName,
      row.provinceCode
    );

    if (matchedByName) {
      if (
        matchedByName.university_code &&
        String(matchedByName.university_code).startsWith("UNIV_") &&
        !String(row.universityCode).startsWith("UNIV_")
      ) {
        this.adapter.run(
          `
            UPDATE university
            SET university_code = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          row.universityCode,
          matchedByName.id
        );
      }

      cache.set(cacheKey, matchedByName.id);
      return matchedByName.id;
    }

    const result = this.adapter.run(
      `
        INSERT INTO university (
          university_code, name_zh, province_code, school_type, school_level,
          is_public, campus_count, tags_json, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      row.universityCode,
      row.universityName,
      row.provinceCode,
      "unknown",
      "unknown",
      "[]",
      JSON.stringify({
        importedFromStructuredData: true
      })
    );

    const universityId = Number(result.lastInsertRowid);
    cache.set(cacheKey, universityId);
    return universityId;
  }

  getOrCreateMajor(row, cache) {
    const cacheKey = row.majorCode;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const existing = this.adapter.get(
      `
        SELECT id
        FROM major
        WHERE major_code = ?
      `,
      row.majorCode
    );

    if (existing) {
      cache.set(cacheKey, existing.id);
      return existing.id;
    }

    const matchedByName = this.adapter.get(
      `
        SELECT id, major_code
        FROM major
        WHERE major_name_zh = ?
        ORDER BY CASE WHEN major_code LIKE 'MAJOR_%' THEN 1 ELSE 0 END, id ASC
        LIMIT 1
      `,
      row.majorName
    );

    if (matchedByName) {
      if (
        matchedByName.major_code &&
        String(matchedByName.major_code).startsWith("MAJOR_") &&
        !String(row.majorCode).startsWith("MAJOR_")
      ) {
        this.adapter.run(
          `
            UPDATE major
            SET major_code = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          row.majorCode,
          matchedByName.id
        );
      }

      cache.set(cacheKey, matchedByName.id);
      return matchedByName.id;
    }

    const result = this.adapter.run(
      `
        INSERT INTO major (
          major_code, major_name_zh, degree_type, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      row.majorCode,
      row.majorName,
      "undergraduate",
      JSON.stringify({
        importedFromStructuredData: true,
        majorGroupCode: row.majorGroupCode || null
      })
    );

    const majorId = Number(result.lastInsertRowid);
    cache.set(cacheKey, majorId);
    return majorId;
  }

  getOrCreateSubjectRule(row, cache) {
    const ruleType = this.normalizeSubjectRuleType(row.subjectRequirement, row.trackType);
    const normalizedText = this.buildNormalizedSubjectRuleText({
      subjectRequirement: row.subjectRequirement,
      requiredSubjects: row.requiredSubjects,
      oneOfSubjects: row.oneOfSubjects,
      preferredSubjects: row.preferredSubjects,
      forbiddenSubjects: row.forbiddenSubjects,
      trackType: row.trackType
    });
    const ruleCode = this.createStableCode("RULE", normalizedText);

    if (cache.has(ruleCode)) {
      return cache.get(ruleCode);
    }

    const existing = this.adapter.get(
      `
        SELECT id
        FROM subject_requirement_rule
        WHERE rule_code = ?
      `,
      ruleCode
    );

    if (existing) {
      cache.set(ruleCode, existing.id);
      return existing.id;
    }

    const result = this.adapter.run(
      `
        INSERT INTO subject_requirement_rule (
          rule_code, raw_text, rule_type, required_subjects_json,
          optional_subjects_json, forbidden_subjects_json, track_limit_json,
          normalized_text, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      ruleCode,
      row.subjectRequirement,
      ruleType,
      JSON.stringify(row.requiredSubjects || []),
      JSON.stringify([...(row.oneOfSubjects || []), ...(row.preferredSubjects || [])]),
      JSON.stringify(row.forbiddenSubjects || []),
      JSON.stringify([row.trackType]),
      normalizedText
    );

    const subjectRuleId = Number(result.lastInsertRowid);
    cache.set(ruleCode, subjectRuleId);
    return subjectRuleId;
  }

  insertAdmissionRecord({ row, universityId, majorId, subjectRuleId, sourceId }) {
    this.adapter.run(
      `
        INSERT INTO admission_record (
          province_code, year, track_type, batch_code, university_id, major_id,
          major_group_code, admission_type, min_score, min_rank, avg_score, avg_rank,
          max_score, max_rank, plan_count, actual_admit_count, tuition_fee,
          subject_rule_id, notes, source_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      row.provinceCode,
      row.year,
      row.trackType,
      row.batchCode,
      universityId,
      majorId,
      row.majorGroupCode,
      "regular",
      row.minScore,
      row.minRank,
      null,
      null,
      null,
      null,
      row.planCount,
      row.actualAdmitCount,
      row.tuitionFee,
      subjectRuleId,
      row.notes,
      sourceId
    );
  }

  insertEnrollmentPlanRow({
    row,
    universityId,
    majorId,
    subjectRuleId,
    sourceId,
    inferredFromHistoricalLine
  }) {
    const planKey = this.buildEnrollmentPlanKey(row, majorId);
    const planSourceType = inferredFromHistoricalLine ? "historical_inference" : "official_csv";

    if (planSourceType === "historical_inference") {
      const existingOfficialRow = this.adapter.get(
        `
          SELECT id
          FROM enrollment_plan
          WHERE province_code = ?
            AND year = ?
            AND track_type = ?
            AND batch_code = ?
            AND university_id = ?
            AND plan_key = ?
            AND plan_source_type = 'official_csv'
          LIMIT 1
        `,
        row.provinceCode,
        row.year,
        row.trackType,
        row.batchCode,
        universityId,
        planKey
      );

      if (existingOfficialRow) {
        return;
      }
    }

    this.adapter.run(
      `
        DELETE FROM enrollment_plan
        WHERE province_code = ?
          AND year = ?
          AND track_type = ?
          AND batch_code = ?
          AND university_id = ?
          AND plan_key = ?
          AND (
            plan_source_type = ?
            OR (? = 'official_csv' AND plan_source_type = 'historical_inference')
          )
      `,
      row.provinceCode,
      row.year,
      row.trackType,
      row.batchCode,
      universityId,
      planKey,
      planSourceType,
      planSourceType
    );

    this.adapter.run(
      `
        INSERT INTO enrollment_plan (
          province_code, year, batch_code, university_id, major_id, major_group_code,
          plan_key, plan_name, track_type, plan_count, tuition_fee, duration_years,
          campus_name, admission_notes, subject_rule_id, plan_source_type, is_new_program,
          is_cooperative_program, is_targeted_program, source_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      row.provinceCode,
      row.year,
      row.batchCode,
      universityId,
      majorId,
      row.majorGroupCode,
      planKey,
      row.planName || row.majorName,
      row.trackType,
      Number(row.planCount || 0),
      row.tuitionFee,
      row.durationYears || null,
      row.campusName || null,
      inferredFromHistoricalLine ? this.composeInferredPlanNotes(row.notes) : row.notes || null,
      subjectRuleId,
      planSourceType,
      row.isNewProgram ? 1 : 0,
      row.isCooperativeProgram ? 1 : 0,
      row.isTargetedProgram ? 1 : 0,
      sourceId
    );
  }

  buildEnrollmentPlanKey(row, majorId) {
    if (row.majorGroupCode) {
      // A group can contain many concrete majors; never let one major overwrite another.
      return `group:${row.majorGroupCode}:major:${majorId || "unknown"}`;
    }

    if (majorId) {
      return `major:${majorId}`;
    }

    const fallbackName = String(row.planName || row.majorName || "")
      .trim()
      .toLowerCase();
    return `name:${fallbackName}`;
  }

  upsertProvinceDimension({ provinceCode, provinceName, examMode }) {
    this.adapter.run(
      `
        INSERT INTO dim_province (code, name_zh, exam_mode, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(code) DO UPDATE SET
          name_zh = excluded.name_zh,
          exam_mode = excluded.exam_mode,
          updated_at = CURRENT_TIMESTAMP
      `,
      provinceCode,
      provinceName,
      examMode
    );
  }

  upsertYearDimension(year) {
    this.adapter.run(
      `
        INSERT INTO dim_year (year, is_current, is_open_for_query, created_at)
        VALUES (?, 0, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(year) DO NOTHING
      `,
      year
    );
  }

  upsertBatchDimension({ provinceCode, year, batchCode, batchName }) {
    this.adapter.run(
      `
        INSERT INTO dim_batch (
          province_code, year, batch_code, batch_name, sort_order, created_at
        )
        VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
        ON CONFLICT(province_code, year, batch_code) DO UPDATE SET
          batch_name = excluded.batch_name
      `,
      provinceCode,
      year,
      batchCode,
      batchName
    );
  }

  createDataSource({ sourceType, sourceName, provinceCode, year, version }) {
    const result = this.adapter.run(
      `
        INSERT INTO data_source (
          source_type, source_name, province_code, year, version, status, imported_at
        )
        VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
      `,
      sourceType,
      sourceName,
      provinceCode,
      year,
      version
    );

    return Number(result.lastInsertRowid);
  }

  createImportJob({ jobType, provinceCode, year, datasetName, totalRows }) {
    const result = this.adapter.run(
      `
        INSERT INTO import_job (
          job_type, province_code, year, dataset_name, status,
          total_rows, success_rows, failed_rows, started_at, created_at
        )
        VALUES (?, ?, ?, ?, 'running', ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      jobType,
      provinceCode,
      year,
      datasetName,
      totalRows
    );

    return Number(result.lastInsertRowid);
  }

  finishImportJob(jobId, { status, successRows, failedRows }) {
    this.adapter.run(
      `
        UPDATE import_job
        SET status = ?, success_rows = ?, failed_rows = ?, finished_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      status,
      successRows,
      failedRows,
      jobId
    );
  }

  normalizeProvinceCode(value) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return null;
    }

    return normalizeCatalogProvinceCode(normalized) || this.createStableCode("P", normalized);
  }

  normalizeTrackType(value) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return null;
    }

    if (normalized.includes("物理") || normalized.includes("鐗╃悊")) {
      return "physics";
    }

    if (normalized.includes("历史") || normalized.includes("鍘嗗彶")) {
      return "history";
    }

    if (normalized.includes("理科")) {
      return "science";
    }

    if (normalized.includes("文科")) {
      return "liberal_arts";
    }

    return this.createStableCode("TRACK", normalized).toLowerCase();
  }

  normalizeExamMode(examMode, trackType) {
    const normalized = String(examMode || "").trim();
    if (normalized) {
      return normalized;
    }

    if (trackType === "physics" || trackType === "history") {
      return "3+1+2";
    }

    return "traditional";
  }

  normalizeBatchCode(value) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "unknown_batch";
    }

    if (normalized.includes("本科") || normalized.includes("鏈")) {
      return "undergraduate_batch";
    }

    if (normalized.includes("专科") || normalized.includes("涓撶")) {
      return "junior_college_batch";
    }

    if (normalized.includes("提前") || normalized.includes("鎻愬墠")) {
      return "early_batch";
    }

    return this.createStableCode("BATCH", normalized).toLowerCase();
  }

  normalizeSubjectRuleType(subjectRequirement, trackType) {
    const text = String(subjectRequirement || "").trim();
    if (!text) {
      return "track_only";
    }

    if (text.includes("不限") || text.includes("涓嶉檺")) {
      return "none";
    }

    if (text.includes("或")) {
      return "one_of";
    }

    if (trackType === "physics" || trackType === "history") {
      return "track_only";
    }

    return "all_of";
  }

  extractUniversityCode(notes) {
    const text = String(notes || "");
    const matched = text.match(/(?:学校代码|院校代码)[:：]\s*(\d{4,6})/);
    return matched ? matched[1] : null;
  }

  extractMajorGroupCode(majorName, notes) {
    const directMatch = String(majorName || "").match(/(\d{2,4})/);
    if (directMatch) {
      return directMatch[1];
    }

    const noteMatch = String(notes || "").match(/(?:专业组)[:：]?\s*(\d{2,4})/);
    return noteMatch ? noteMatch[1] : null;
  }

  extractPlanCount(notes) {
    const matched = String(notes || "").match(/(?:计划数)[:：]\s*(\d+)/);
    return matched ? Number(matched[1]) : null;
  }

  buildNormalizedSubjectRuleText({
    subjectRequirement,
    requiredSubjects,
    oneOfSubjects,
    preferredSubjects,
    forbiddenSubjects,
    trackType
  }) {
    return JSON.stringify({
      raw: subjectRequirement || "",
      requiredSubjects: requiredSubjects || [],
      oneOfSubjects: oneOfSubjects || [],
      preferredSubjects: preferredSubjects || [],
      forbiddenSubjects: forbiddenSubjects || [],
      trackType
    });
  }

  splitSubjectField(value) {
    return String(value || "")
      .split(/[|,\s，、]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  composeInferredPlanNotes(notes) {
    const base = String(notes || "").trim();
    return base ? `${base};seeded_from=historical_line` : "seeded_from=historical_line";
  }

  toBooleanFlag(value) {
    if (typeof value === "boolean") {
      return value;
    }

    return TRUE_VALUES.has(
      String(value || "")
        .trim()
        .toLowerCase()
    );
  }

  createStableCode(prefix, value) {
    return `${prefix}_${crypto
      .createHash("sha1")
      .update(String(value || ""))
      .digest("hex")
      .slice(0, 12)}`;
  }
}
