import { getUniversityProfile } from "../universityProfiles.js";

export function buildUniversityGallery(result) {
  const grouped = new Map();

  collectPlanSchools(result).forEach((school) => {
    const key = school.university;
    const profile = getUniversityProfile(school.university);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        university: school.university,
        city: school.city,
        heroMajor: school.major,
        tierLabel: school.tierLabel,
        tierClass: school.tierClass,
        recommendationCount: 1,
        bestConfidence: Number(school.confidence || 0),
        schools: [school],
        profile
      });
      return;
    }

    existing.recommendationCount += 1;
    existing.schools.push(school);

    if (Number(school.confidence || 0) >= existing.bestConfidence) {
      existing.bestConfidence = Number(school.confidence || 0);
      existing.heroMajor = school.major;
      existing.tierLabel = school.tierLabel;
      existing.tierClass = school.tierClass;
      existing.city = school.city || existing.city;
    }
  });

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      schools: item.schools.sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))
    }))
    .sort((a, b) => b.bestConfidence - a.bestConfidence);
}

export function collectPlanSchools(result) {
  if (!result) {
    return [];
  }

  const planSchools = (result.applicationPlan || []).flatMap((tier) =>
    (tier.schools || []).map((school) => ({
      ...school,
      tierLabel: tier.tierLabel,
      tierClass: tier.tierClass,
      tierKey: tier.tier
    }))
  );

  const backupSchools = (result.backupOptions || []).map((school) => ({
    ...school,
    tierLabel: school.tier ? `${school.tier}层候补` : "候补备选",
    tierClass: school.tierClass || "steady",
    tierKey: school.tier || "backup"
  }));

  return [...planSchools, ...backupSchools];
}

export function resolveSchoolRankValue(school) {
  return school?.minRank || school?.threshold || "--";
}
