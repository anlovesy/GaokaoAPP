export class UniversityQueryService {
  constructor(universityRepository, admissionRepository) {
    this.universityRepository = universityRepository;
    this.admissionRepository = admissionRepository;
  }

  searchUniversities(filters) {
    return this.universityRepository.search(filters);
  }

  getUniversityProfile(universityId) {
    return this.universityRepository.getById(universityId);
  }

  getUniversityAdmissionSnapshot({ universityId, provinceCode, year, trackType }) {
    const history = this.admissionRepository.listByUniversity({
      universityId,
      provinceCode,
      trackType,
      years: [year, year - 1, year - 2].filter((value) => Number.isFinite(value) && value > 0),
      limit: 24
    });

    return {
      university: this.universityRepository.getById(universityId),
      history
    };
  }
}
