import { BaseRepository } from "./BaseRepository.js";

export class MajorRepository extends BaseRepository {
  search({ keyword, category, degreeType, limit = 40 } = {}) {
    const clauses = ["1 = 1"];
    const params = [];

    if (keyword) {
      clauses.push("(major_name_zh LIKE ? OR discipline_category LIKE ?)");
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (category) {
      clauses.push("discipline_category = ?");
      params.push(category);
    }

    if (degreeType) {
      clauses.push("degree_type = ?");
      params.push(degreeType);
    }

    params.push(limit);

    return this.adapter.all(
      `
        SELECT *
        FROM (
          SELECT *,
                 ROW_NUMBER() OVER (
                   PARTITION BY major_name_zh
                   ORDER BY CASE WHEN major_code LIKE 'MAJOR_%' THEN 1 ELSE 0 END, id DESC
                 ) AS rn
          FROM major
          WHERE ${clauses.join(" AND ")}
        ) ranked
        WHERE rn = 1
        ORDER BY major_name_zh ASC
        LIMIT ?
      `,
      ...params
    );
  }

  getById(majorId) {
    const record = this.adapter.get("SELECT * FROM major WHERE id = ?", majorId);
    if (!record) {
      return null;
    }

    return {
      ...record,
      coreCourses: this.parseJson(record.core_courses_json, []),
      careerPaths: this.parseJson(record.career_paths_json, []),
      postgraduateDirections: this.parseJson(record.postgraduate_directions_json, []),
      industryTags: this.parseJson(record.industry_tags_json, []),
      metadata: this.parseJson(record.metadata_json, {})
    };
  }
}
