import { BaseRepository } from "./BaseRepository.js";

export class UniversityRepository extends BaseRepository {
  search({ keyword, provinceCode, cityCode, limit = 40 } = {}) {
    const clauses = ["1 = 1"];
    const params = [];

    if (keyword) {
      clauses.push("(name_zh LIKE ? OR short_name LIKE ?)");
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (provinceCode) {
      clauses.push("province_code = ?");
      params.push(provinceCode);
    }

    if (cityCode) {
      clauses.push("city_code = ?");
      params.push(cityCode);
    }

    params.push(limit);

    return this.adapter.all(
      `
        SELECT *
        FROM (
          SELECT *,
                 ROW_NUMBER() OVER (
                   PARTITION BY name_zh, COALESCE(province_code, '')
                   ORDER BY CASE WHEN university_code LIKE 'UNIV_%' THEN 1 ELSE 0 END, id DESC
                 ) AS rn
          FROM university
          WHERE ${clauses.join(" AND ")}
        ) ranked
        WHERE rn = 1
        ORDER BY is_double_first_class DESC, is_211 DESC, is_985 DESC, name_zh ASC
        LIMIT ?
      `,
      ...params
    );
  }

  getById(universityId) {
    const record = this.adapter.get("SELECT * FROM university WHERE id = ?", universityId);
    if (!record) {
      return null;
    }

    return {
      ...record,
      tags: this.parseJson(record.tags_json, []),
      metadata: this.parseJson(record.metadata_json, {})
    };
  }
}
