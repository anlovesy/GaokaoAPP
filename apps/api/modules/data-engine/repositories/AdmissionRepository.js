import { BaseRepository } from "./BaseRepository.js";

export class AdmissionRepository extends BaseRepository {
  getLatestYear({ provinceCode, trackType }) {
    const record = this.adapter.get(
      `
        SELECT MAX(year) AS latest_year
        FROM admission_record
        WHERE province_code = ?
          AND track_type = ?
      `,
      provinceCode,
      trackType
    );

    return record?.latest_year ? Number(record.latest_year) : null;
  }

  findBestHistoricalMatch({ provinceCode, trackType, universityName, majorName }) {
    return (
      this.adapter.get(
        `
          SELECT ar.*, u.name_zh AS university_name, m.major_name_zh AS major_name,
                 srr.raw_text AS subject_requirement, srr.rule_type,
                 srr.required_subjects_json, srr.optional_subjects_json,
                 srr.forbidden_subjects_json, srr.track_limit_json, srr.normalized_text
          FROM admission_record ar
          JOIN university u ON u.id = ar.university_id
          LEFT JOIN major m ON m.id = ar.major_id
          LEFT JOIN subject_requirement_rule srr ON srr.id = ar.subject_rule_id
          WHERE ar.province_code = ?
            AND ar.track_type = ?
            AND u.name_zh = ?
            AND (
              m.major_name_zh = ?
              OR m.major_name_zh LIKE ?
              OR ? LIKE '%' || m.major_name_zh || '%'
            )
          ORDER BY
            ar.year DESC,
            CASE
              WHEN m.major_name_zh = ? THEN 0
              WHEN m.major_name_zh LIKE ? THEN 1
              ELSE 2
            END,
            ar.min_rank ASC
          LIMIT 1
        `,
        provinceCode,
        trackType,
        universityName,
        majorName,
        `%${majorName}%`,
        majorName,
        majorName,
        `%${majorName}%`
      ) || null
    );
  }

  listByUniversity({ provinceCode, trackType, universityId, years = [], limit = 100 }) {
    const params = [universityId];
    const clauses = ["ar.university_id = ?"];

    if (provinceCode) {
      clauses.push("ar.province_code = ?");
      params.push(provinceCode);
    }

    if (trackType) {
      clauses.push("ar.track_type = ?");
      params.push(trackType);
    }

    if (years.length) {
      clauses.push(`ar.year IN (${years.map(() => "?").join(",")})`);
      params.push(...years);
    }

    params.push(limit);

    return this.adapter.all(
      `
        SELECT ar.*, u.name_zh AS university_name, m.major_name_zh AS major_name,
               srr.raw_text AS subject_requirement, srr.rule_type,
               srr.required_subjects_json, srr.optional_subjects_json,
               srr.forbidden_subjects_json, srr.track_limit_json, srr.normalized_text
        FROM admission_record ar
        JOIN university u ON u.id = ar.university_id
        LEFT JOIN major m ON m.id = ar.major_id
        LEFT JOIN subject_requirement_rule srr ON srr.id = ar.subject_rule_id
        WHERE ${clauses.join(" AND ")}
        ORDER BY ar.year DESC, ar.min_rank ASC
        LIMIT ?
      `,
      ...params
    );
  }

  listByMajor({ provinceCode, trackType, majorId, years = [], limit = 100 }) {
    const params = [majorId];
    const clauses = ["ar.major_id = ?"];

    if (provinceCode) {
      clauses.push("ar.province_code = ?");
      params.push(provinceCode);
    }

    if (trackType) {
      clauses.push("ar.track_type = ?");
      params.push(trackType);
    }

    if (years.length) {
      clauses.push(`ar.year IN (${years.map(() => "?").join(",")})`);
      params.push(...years);
    }

    params.push(limit);

    return this.adapter.all(
      `
        SELECT ar.*, u.name_zh AS university_name, m.major_name_zh AS major_name,
               srr.raw_text AS subject_requirement, srr.rule_type,
               srr.required_subjects_json, srr.optional_subjects_json,
               srr.forbidden_subjects_json, srr.track_limit_json, srr.normalized_text
        FROM admission_record ar
        JOIN university u ON u.id = ar.university_id
        LEFT JOIN major m ON m.id = ar.major_id
        LEFT JOIN subject_requirement_rule srr ON srr.id = ar.subject_rule_id
        WHERE ${clauses.join(" AND ")}
        ORDER BY ar.year DESC, ar.min_rank ASC
        LIMIT ?
      `,
      ...params
    );
  }

  search(filters = {}) {
    const {
      provinceCode,
      year,
      trackType,
      rankMin,
      rankMax,
      batchCode,
      universityIds = [],
      majorIds = [],
      limit = 120
    } = filters;

    const clauses = ["1 = 1"];
    const params = [];

    if (provinceCode) {
      clauses.push("ar.province_code = ?");
      params.push(provinceCode);
    }

    if (Number.isFinite(year)) {
      clauses.push("ar.year = ?");
      params.push(year);
    }

    if (trackType) {
      clauses.push("ar.track_type = ?");
      params.push(trackType);
    }

    if (Number.isFinite(rankMin)) {
      clauses.push("ar.min_rank >= ?");
      params.push(rankMin);
    }

    if (Number.isFinite(rankMax)) {
      clauses.push("ar.min_rank <= ?");
      params.push(rankMax);
    }

    if (batchCode) {
      clauses.push("ar.batch_code = ?");
      params.push(batchCode);
    }

    if (universityIds.length) {
      clauses.push(`ar.university_id IN (${universityIds.map(() => "?").join(",")})`);
      params.push(...universityIds);
    }

    if (majorIds.length) {
      clauses.push(`ar.major_id IN (${majorIds.map(() => "?").join(",")})`);
      params.push(...majorIds);
    }

    params.push(limit);

    return this.adapter.all(
      `
        SELECT ar.*, u.name_zh AS university_name, m.major_name_zh AS major_name,
               srr.raw_text AS subject_requirement, srr.rule_type,
               srr.required_subjects_json, srr.optional_subjects_json,
               srr.forbidden_subjects_json, srr.track_limit_json, srr.normalized_text
        FROM admission_record ar
        JOIN university u ON u.id = ar.university_id
        LEFT JOIN major m ON m.id = ar.major_id
        LEFT JOIN subject_requirement_rule srr ON srr.id = ar.subject_rule_id
        WHERE ${clauses.join(" AND ")}
        ORDER BY ar.year DESC, ar.min_rank ASC
        LIMIT ?
      `,
      ...params
    );
  }
}
