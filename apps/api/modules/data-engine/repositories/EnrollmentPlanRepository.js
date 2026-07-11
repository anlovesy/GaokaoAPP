import { BaseRepository } from "./BaseRepository.js";

export class EnrollmentPlanRepository extends BaseRepository {
  listByUniversity({ provinceCode, year, universityId, limit = 100 }) {
    return this.adapter.all(
      `
        SELECT ep.*, u.name_zh AS university_name, m.major_name_zh AS major_name,
               srr.rule_type, srr.normalized_text
        FROM enrollment_plan ep
        JOIN university u ON u.id = ep.university_id
        LEFT JOIN major m ON m.id = ep.major_id
        LEFT JOIN subject_requirement_rule srr ON srr.id = ep.subject_rule_id
        WHERE ep.province_code = ?
          AND ep.year = ?
          AND ep.university_id = ?
        ORDER BY
          CASE ep.plan_source_type
            WHEN 'official_csv' THEN 0
            WHEN 'historical_inference' THEN 1
            ELSE 9
          END,
          ep.plan_count DESC,
          ep.id ASC
        LIMIT ?
      `,
      provinceCode,
      year,
      universityId,
      limit
    );
  }

  search(filters = {}) {
    const {
      provinceCode,
      year,
      trackType,
      batchCode,
      universityId,
      keyword,
      limit = 120
    } = filters;

    const clauses = ["1 = 1"];
    const params = [];

    if (provinceCode) {
      clauses.push("ep.province_code = ?");
      params.push(provinceCode);
    }

    if (Number.isFinite(year)) {
      clauses.push("ep.year = ?");
      params.push(year);
    }

    if (trackType) {
      clauses.push("(ep.track_type = ? OR ep.track_type IS NULL OR ep.track_type = '')");
      params.push(trackType);
    }

    if (batchCode) {
      clauses.push("ep.batch_code = ?");
      params.push(batchCode);
    }

    if (universityId) {
      clauses.push("ep.university_id = ?");
      params.push(universityId);
    }

    if (keyword) {
      clauses.push("(u.name_zh LIKE ? OR m.major_name_zh LIKE ? OR ep.plan_name LIKE ?)");
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    params.push(limit);

    return this.adapter.all(
      `
        SELECT ep.*, u.name_zh AS university_name, m.major_name_zh AS major_name,
               srr.rule_type, srr.normalized_text
        FROM enrollment_plan ep
        JOIN university u ON u.id = ep.university_id
        LEFT JOIN major m ON m.id = ep.major_id
        LEFT JOIN subject_requirement_rule srr ON srr.id = ep.subject_rule_id
        WHERE ${clauses.join(" AND ")}
        ORDER BY
          CASE ep.plan_source_type
            WHEN 'official_csv' THEN 0
            WHEN 'historical_inference' THEN 1
            ELSE 9
          END,
          ep.plan_count DESC,
          ep.id ASC
        LIMIT ?
      `,
      ...params
    );
  }
}
