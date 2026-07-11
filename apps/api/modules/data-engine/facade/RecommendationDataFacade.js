export class RecommendationDataFacade {
  constructor({
    rankQueryService,
    admissionQueryService,
    planQueryService,
    universityQueryService,
    majorQueryService,
    policyQueryService
  }) {
    this.rankQueryService = rankQueryService;
    this.admissionQueryService = admissionQueryService;
    this.planQueryService = planQueryService;
    this.universityQueryService = universityQueryService;
    this.majorQueryService = majorQueryService;
    this.policyQueryService = policyQueryService;
  }

  buildCandidateSnapshot(profile) {
    const year = Number(profile.year || new Date().getFullYear());
    const scoreReference = this.rankQueryService.getRankByScore({
      provinceCode: profile.provinceCode,
      year,
      trackType: profile.trackType,
      score: Number(profile.score || 0)
    });

    const policyContext = this.policyQueryService.getProvinceVolunteerRules({
      provinceCode: profile.provinceCode,
      year,
      batchCode: profile.batchCode
    });

    return {
      provinceCode: profile.provinceCode,
      year,
      examMode: profile.examMode,
      trackType: profile.trackType,
      score: Number(profile.score || 0),
      rank: Number(profile.rank || scoreReference?.rank_min || 0),
      selectedSubjects: Array.isArray(profile.selectedSubjects) ? profile.selectedSubjects : [],
      scoreRankReference: scoreReference
        ? {
            exact: Number(scoreReference.score) === Number(profile.score || 0),
            matchedScore: Number(scoreReference.score),
            matchedRankMin: Number(scoreReference.rank_min),
            matchedRankMax: Number(scoreReference.rank_max)
          }
        : null,
      policyContext
    };
  }

  buildAdmissionEvidence({ provinceCode, year, trackType, rankMin, rankMax, limit }) {
    return this.admissionQueryService.searchAdmissionRecords({
      provinceCode,
      year,
      trackType,
      rankMin,
      rankMax,
      limit
    });
  }

  buildUniversitySnapshot({ universityId, provinceCode, year, trackType }) {
    return this.universityQueryService.getUniversityAdmissionSnapshot({
      universityId,
      provinceCode,
      year,
      trackType
    });
  }

  buildMajorSnapshot({ majorId, provinceCode, year, trackType }) {
    return this.majorQueryService.getMajorAdmissionSnapshot({
      majorId,
      provinceCode,
      year,
      trackType
    });
  }

  buildEligiblePlans({ provinceCode, year, trackType, keyword, universityId, batchCode }) {
    return this.planQueryService.searchPlans({
      provinceCode,
      year,
      trackType,
      keyword,
      universityId,
      batchCode
    });
  }
}
