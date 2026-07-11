import { BaseRepository } from "./BaseRepository.js";

export class ScoreRankRepository extends BaseRepository {
  getLatestYear({ provinceCode, trackType }) {
    const record = this.adapter.get(
      `
        SELECT MAX(year) AS latest_year
        FROM score_rank_segment
        WHERE province_code = ?
          AND track_type = ?
      `,
      provinceCode,
      trackType
    );

    return record?.latest_year ? Number(record.latest_year) : null;
  }

  findExactScore({ provinceCode, year, trackType, score }) {
    return (
      this.adapter.get(
        `
          SELECT province_code, year, exam_mode, track_type, score, rank_min, rank_max,
                 same_score_count, cumulative_count
          FROM score_rank_segment
          WHERE province_code = ?
            AND year = ?
            AND track_type = ?
            AND score = ?
        `,
        provinceCode,
        year,
        trackType,
        score
      ) || null
    );
  }

  findNearestScore({ provinceCode, year, trackType, score }) {
    return (
      this.adapter.get(
        `
          SELECT province_code, year, exam_mode, track_type, score, rank_min, rank_max,
                 same_score_count, cumulative_count
          FROM score_rank_segment
          WHERE province_code = ?
            AND year = ?
            AND track_type = ?
          ORDER BY ABS(score - ?) ASC
          LIMIT 1
        `,
        provinceCode,
        year,
        trackType,
        score
      ) || null
    );
  }

  findScoreByRank({ provinceCode, year, trackType, rank }) {
    return (
      this.adapter.get(
        `
          SELECT province_code, year, exam_mode, track_type, score, rank_min, rank_max,
                 same_score_count, cumulative_count
          FROM score_rank_segment
          WHERE province_code = ?
            AND year = ?
            AND track_type = ?
            AND rank_min <= ?
            AND rank_max >= ?
          ORDER BY score DESC
          LIMIT 1
        `,
        provinceCode,
        year,
        trackType,
        rank,
        rank
      ) || null
    );
  }

  listSegments({ provinceCode, year, trackType, scoreMin, scoreMax, limit = 200 }) {
    const clauses = ["province_code = ?", "year = ?", "track_type = ?"];
    const params = [provinceCode, year, trackType];

    if (Number.isFinite(scoreMin)) {
      clauses.push("score >= ?");
      params.push(scoreMin);
    }

    if (Number.isFinite(scoreMax)) {
      clauses.push("score <= ?");
      params.push(scoreMax);
    }

    params.push(limit);

    return this.adapter.all(
      `
        SELECT province_code, year, exam_mode, track_type, score, rank_min, rank_max,
               same_score_count, cumulative_count
        FROM score_rank_segment
        WHERE ${clauses.join(" AND ")}
        ORDER BY score DESC
        LIMIT ?
      `,
      ...params
    );
  }
}
