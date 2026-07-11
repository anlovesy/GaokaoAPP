export class PolicyQueryService {
  constructor(policyRepository) {
    this.policyRepository = policyRepository;
  }

  getProvinceVolunteerRules({ provinceCode, year, batchCode }) {
    return this.policyRepository.listVolunteerRules({ provinceCode, year, batchCode });
  }

  getProvincePolicySummary({ provinceCode, year, policyType, limit }) {
    return this.policyRepository.listProvincePolicies({
      provinceCode,
      year,
      policyType,
      limit
    });
  }
}
