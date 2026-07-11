import { SqliteDataEngineAdapter } from "../adapters/sqlite/SqliteDataEngineAdapter.js";
import { ScoreRankRepository } from "../repositories/ScoreRankRepository.js";
import { AdmissionRepository } from "../repositories/AdmissionRepository.js";
import { EnrollmentPlanRepository } from "../repositories/EnrollmentPlanRepository.js";
import { UniversityRepository } from "../repositories/UniversityRepository.js";
import { MajorRepository } from "../repositories/MajorRepository.js";
import { PolicyRepository } from "../repositories/PolicyRepository.js";
import { RecommendationDataFacade } from "../facade/RecommendationDataFacade.js";
import { RankQueryService } from "../services/RankQueryService.js";
import { AdmissionQueryService } from "../services/AdmissionQueryService.js";
import { PlanQueryService } from "../services/PlanQueryService.js";
import { UniversityQueryService } from "../services/UniversityQueryService.js";
import { MajorQueryService } from "../services/MajorQueryService.js";
import { PolicyQueryService } from "../services/PolicyQueryService.js";
import { DataImportService } from "../services/DataImportService.js";

export function createDataEngine(database) {
  const adapter = new SqliteDataEngineAdapter(database);

  const repositories = {
    scoreRank: new ScoreRankRepository(adapter),
    admission: new AdmissionRepository(adapter),
    enrollmentPlan: new EnrollmentPlanRepository(adapter),
    university: new UniversityRepository(adapter),
    major: new MajorRepository(adapter),
    policy: new PolicyRepository(adapter)
  };

  const services = {
    dataImport: new DataImportService(adapter),
    rankQuery: new RankQueryService(repositories.scoreRank),
    admissionQuery: new AdmissionQueryService(repositories.admission),
    planQuery: new PlanQueryService(repositories.enrollmentPlan),
    universityQuery: new UniversityQueryService(repositories.university, repositories.admission),
    majorQuery: new MajorQueryService(repositories.major, repositories.admission),
    policyQuery: new PolicyQueryService(repositories.policy)
  };

  const facade = new RecommendationDataFacade({
    rankQueryService: services.rankQuery,
    admissionQueryService: services.admissionQuery,
    planQueryService: services.planQuery,
    universityQueryService: services.universityQuery,
    majorQueryService: services.majorQuery,
    policyQueryService: services.policyQuery
  });

  return {
    adapter,
    repositories,
    services,
    facade
  };
}
