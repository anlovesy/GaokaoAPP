export class PlanQueryService {
  constructor(enrollmentPlanRepository) {
    this.enrollmentPlanRepository = enrollmentPlanRepository;
  }

  getCurrentPlansByUniversity({ provinceCode, year, universityId, limit }) {
    return this.enrollmentPlanRepository.listByUniversity({
      provinceCode,
      year,
      universityId,
      limit
    });
  }

  searchPlans(filters) {
    return this.enrollmentPlanRepository.search(filters);
  }
}
