export class RankQueryService {
  constructor(scoreRankRepository) {
    this.scoreRankRepository = scoreRankRepository;
  }

  getRankByScore({ provinceCode, year, trackType, score }) {
    return (
      this.scoreRankRepository.findExactScore({ provinceCode, year, trackType, score }) ||
      this.scoreRankRepository.findNearestScore({ provinceCode, year, trackType, score })
    );
  }

  getScoreByRankRange({ provinceCode, year, trackType, rank }) {
    return this.scoreRankRepository.findScoreByRank({ provinceCode, year, trackType, rank });
  }

  getScoreSegments({ provinceCode, year, trackType, scoreMin, scoreMax, limit }) {
    return this.scoreRankRepository.listSegments({
      provinceCode,
      year,
      trackType,
      scoreMin,
      scoreMax,
      limit
    });
  }
}
