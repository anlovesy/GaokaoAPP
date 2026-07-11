import { BaseRepository } from "./BaseRepository.js";

export class PolicyRepository extends BaseRepository {
  listProvincePolicies({ provinceCode, year, policyType, limit = 40 } = {}) {
    const clauses = ["province_code = ?", "year = ?"];
    const params = [provinceCode, year];

    if (policyType) {
      clauses.push("policy_type = ?");
      params.push(policyType);
    }

    params.push(limit);

    return this.adapter.all(
      `
        SELECT *
        FROM province_policy
        WHERE ${clauses.join(" AND ")}
        ORDER BY effective_date DESC, id DESC
        LIMIT ?
      `,
      ...params
    );
  }

  listVolunteerRules({ provinceCode, year, batchCode }) {
    const clauses = ["province_code = ?", "year = ?"];
    const params = [provinceCode, year];

    if (batchCode) {
      clauses.push("batch_code = ?");
      params.push(batchCode);
    }

    return this.adapter.all(
      `
        SELECT *
        FROM volunteer_rule
        WHERE ${clauses.join(" AND ")}
        ORDER BY id ASC
      `,
      ...params
    );
  }
}
