export class MajorQueryService {
  constructor(majorRepository, admissionRepository) {
    this.majorRepository = majorRepository;
    this.admissionRepository = admissionRepository;
  }

  searchMajors(filters) {
    return this.majorRepository.search(filters);
  }

  getMajorProfile(majorId) {
    return this.majorRepository.getById(majorId);
  }

  getMajorAdmissionSnapshot({ majorId, provinceCode, year, trackType }) {
    const history = this.admissionRepository.listByMajor({
      majorId,
      provinceCode,
      trackType,
      years: [year, year - 1, year - 2].filter((value) => Number.isFinite(value) && value > 0),
      limit: 24
    });

    return {
      major: this.majorRepository.getById(majorId),
      history
    };
  }
}
