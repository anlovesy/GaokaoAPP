export class AdmissionQueryService {
  constructor(admissionRepository) {
    this.admissionRepository = admissionRepository;
  }

  getAdmissionHistoryByUniversity({ provinceCode, trackType, universityId, years, limit }) {
    return this.admissionRepository.listByUniversity({
      provinceCode,
      trackType,
      universityId,
      years,
      limit
    });
  }

  getAdmissionHistoryByMajor({ provinceCode, trackType, majorId, years, limit }) {
    return this.admissionRepository.listByMajor({
      provinceCode,
      trackType,
      majorId,
      years,
      limit
    });
  }

  searchAdmissionRecords(filters) {
    return this.admissionRepository.search(filters);
  }
}
