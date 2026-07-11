import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDataEngine } from "./dbService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");
const runtimeGeneratedDir = process.env.DATA_DIR
  ? path.join(path.resolve(process.env.DATA_DIR), "generated")
  : path.join(apiRoot, "data", "generated");
const bundledGeneratedDir = path.join(apiRoot, "data", "generated");

const provinceScoreRankCandidates = [
  path.join(runtimeGeneratedDir, "provinceScoreRank.json"),
  path.join(bundledGeneratedDir, "provinceScoreRank.json")
];

const universityMajorLinesCandidates = [
  path.join(runtimeGeneratedDir, "universityMajorLines.json"),
  path.join(bundledGeneratedDir, "universityMajorLines.json")
];

let structuredDataCache = {
  expiresAt: 0,
  data: null
};

export function invalidateGeneratedGaokaoDataCache() {
  structuredDataCache = {
    expiresAt: 0,
    data: null
  };
}

export function loadGeneratedGaokaoData() {
  const structuredData = loadStructuredGaokaoData();

  return {
    provinceScoreRank:
      structuredData.provinceScoreRank.length > 0
        ? structuredData.provinceScoreRank
        : readFirstJson(provinceScoreRankCandidates, []),
    universityMajorLines:
      structuredData.universityMajorLines.length > 0
        ? structuredData.universityMajorLines
        : readFirstJson(universityMajorLinesCandidates, [])
  };
}

export function getDataStatus() {
  const data = loadGeneratedGaokaoData();
  const years = new Set(data.universityMajorLines.map((item) => item.year));
  const provinces = new Set(data.universityMajorLines.map((item) => item.province));
  const tracks = new Set(data.universityMajorLines.map((item) => item.track).filter(Boolean));

  return {
    imported: data.universityMajorLines.length > 0 || data.provinceScoreRank.length > 0,
    provinceScoreRankCount: data.provinceScoreRank.length,
    universityMajorLineCount: data.universityMajorLines.length,
    availableYears: [...years].sort(),
    provinces: [...provinces].sort(),
    tracks: [...tracks].sort()
  };
}

export function getLatestProvinceYear(data, province, track) {
  const relationalMatch = getLatestProvinceYearFromRelational(province, track);
  if (relationalMatch) {
    return relationalMatch;
  }

  const candidates = data.provinceScoreRank
    .filter((item) => item.province === province && (!track || !item.track || item.track === track))
    .map((item) => Number(item.year))
    .filter(Boolean);

  return candidates.length ? Math.max(...candidates) : null;
}

export function getLatestUniversityYear(data, province, track) {
  const relationalMatch = getLatestUniversityYearFromRelational(province, track);
  if (relationalMatch) {
    return relationalMatch;
  }

  const candidates = data.universityMajorLines
    .filter((item) => item.province === province && (!track || !item.track || item.track === track))
    .map((item) => Number(item.year))
    .filter(Boolean);

  return candidates.length ? Math.max(...candidates) : null;
}

export function findNearbyScoreRank(data, province, track, score) {
  const relationalMatch = findNearbyScoreRankFromRelational(province, track, score);
  if (relationalMatch) {
    return relationalMatch;
  }

  const latestYear = getLatestProvinceYear(data, province, track);
  if (!latestYear) {
    return null;
  }

  const scopedRows = data.provinceScoreRank.filter(
    (item) =>
      item.province === province &&
      item.year === latestYear &&
      (!track || !item.track || item.track === track)
  );

  if (!scopedRows.length) {
    return null;
  }

  const exact = scopedRows.find((item) => Number(item.score) === Number(score));
  if (exact) {
    return exact;
  }

  return (
    scopedRows
      .slice()
      .sort(
        (a, b) =>
          Math.abs(Number(a.score) - Number(score)) - Math.abs(Number(b.score) - Number(score))
      )[0] || null
  );
}

export function findHistoricalMajorLine(data, province, track, university, major) {
  const relationalMatch = findHistoricalMajorLineFromRelational(province, track, university, major);
  if (relationalMatch) {
    return relationalMatch;
  }

  const scopedMatches = data.universityMajorLines.filter(
    (item) =>
      item.province === province &&
      item.university === university &&
      (!track || !item.track || item.track === track)
  );

  const majorMatches = scopedMatches
    .filter(
      (item) => item.major === major || item.major.includes(major) || major.includes(item.major)
    )
    .sort((a, b) => b.year - a.year);

  if (majorMatches[0]) {
    return majorMatches[0];
  }

  const fallbackMatches = scopedMatches.slice().sort((a, b) => {
    if (b.year !== a.year) {
      return b.year - a.year;
    }

    return a.minRank - b.minRank;
  });

  return fallbackMatches[0] || null;
}

function readJsonSafely(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readFirstJson(filePaths, fallback) {
  for (const filePath of filePaths) {
    const data = readJsonSafely(filePath, null);
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  }

  return fallback;
}

function loadStructuredGaokaoData() {
  if (structuredDataCache.data && structuredDataCache.expiresAt > Date.now()) {
    return structuredDataCache.data;
  }

  const adapter = getDataEngine().adapter;
  const provinceScoreRank = adapter
    .all(
      `
        SELECT province_code, year, track_type, score, rank_min
        FROM score_rank_segment
        ORDER BY year DESC, score DESC
      `
    )
    .map((row) => ({
      province: denormalizeProvinceCode(row.province_code),
      year: Number(row.year),
      track: denormalizeTrackType(row.track_type),
      score: Number(row.score),
      rank: Number(row.rank_min)
    }))
    .filter((row) => row.province && row.track);

  const universityMajorLines = adapter
    .all(
      `
        SELECT ar.*, u.name_zh AS university_name, m.major_name_zh AS major_name,
               srr.raw_text AS subject_requirement, srr.rule_type,
               srr.required_subjects_json, srr.optional_subjects_json,
               srr.forbidden_subjects_json, srr.track_limit_json
        FROM admission_record ar
        JOIN university u ON u.id = ar.university_id
        LEFT JOIN major m ON m.id = ar.major_id
        LEFT JOIN subject_requirement_rule srr ON srr.id = ar.subject_rule_id
        ORDER BY ar.year DESC, ar.min_rank ASC
      `
    )
    .map((row) => ({
      province: denormalizeProvinceCode(row.province_code),
      year: Number(row.year),
      track: denormalizeTrackType(row.track_type),
      university: row.university_name,
      major: row.major_name,
      minScore: Number(row.min_score || 0),
      minRank: Number(row.min_rank || 0),
      batch: denormalizeBatchCode(row.batch_code),
      admissionCount: Number(row.actual_admit_count || row.plan_count || 0),
      subjectRequirement: row.subject_requirement || "",
      subjectRule: {
        raw: row.subject_requirement || "",
        ruleType: row.rule_type || "unknown",
        requiredSubjects: parseJsonArray(row.required_subjects_json),
        oneOfSubjects: parseJsonArray(row.optional_subjects_json),
        preferredSubjects: [],
        forbiddenSubjects: parseJsonArray(row.forbidden_subjects_json),
        allowedTracks: parseJsonArray(row.track_limit_json).map(denormalizeTrackType)
      },
      requiredSubjects: parseJsonArray(row.required_subjects_json),
      oneOfSubjects: parseJsonArray(row.optional_subjects_json),
      preferredSubjects: [],
      forbiddenSubjects: parseJsonArray(row.forbidden_subjects_json),
      tuition: Number(row.tuition_fee || 0),
      notes: row.notes || ""
    }))
    .filter((row) => row.province && row.track && row.university && row.major);

  const data = {
    provinceScoreRank,
    universityMajorLines
  };

  structuredDataCache = {
    data,
    expiresAt: Date.now() + 15_000
  };

  return data;
}

function getLatestProvinceYearFromRelational(province, track) {
  const scope = normalizeRelationalScope(province, track);
  if (!scope) {
    return null;
  }

  return getDataEngine().repositories.scoreRank.getLatestYear(scope);
}

function getLatestUniversityYearFromRelational(province, track) {
  const scope = normalizeRelationalScope(province, track);
  if (!scope) {
    return null;
  }

  return getDataEngine().repositories.admission.getLatestYear(scope);
}

function findNearbyScoreRankFromRelational(province, track, score) {
  const scope = normalizeRelationalScope(province, track);
  if (!scope) {
    return null;
  }

  const latestYear = getDataEngine().repositories.scoreRank.getLatestYear(scope);
  if (!latestYear) {
    return null;
  }

  const exactOrNearest =
    getDataEngine().repositories.scoreRank.findExactScore({
      ...scope,
      year: latestYear,
      score: Number(score)
    }) ||
    getDataEngine().repositories.scoreRank.findNearestScore({
      ...scope,
      year: latestYear,
      score: Number(score)
    });

  if (!exactOrNearest) {
    return null;
  }

  return {
    province,
    year: latestYear,
    track,
    score: Number(exactOrNearest.score),
    rank: Number(exactOrNearest.rank_min)
  };
}

function findHistoricalMajorLineFromRelational(province, track, university, major) {
  const scope = normalizeRelationalScope(province, track);
  if (!scope) {
    return null;
  }

  const record = getDataEngine().repositories.admission.findBestHistoricalMatch({
    ...scope,
    universityName: university,
    majorName: major
  });

  if (!record) {
    return null;
  }

  return {
    province,
    year: Number(record.year),
    track,
    university: record.university_name,
    major: record.major_name,
    minScore: Number(record.min_score || 0),
    minRank: Number(record.min_rank || 0),
    batch: denormalizeBatchCode(record.batch_code),
    admissionCount: Number(record.actual_admit_count || record.plan_count || 0),
    subjectRequirement: record.subject_requirement || "",
    subjectRule: {
      raw: record.subject_requirement || "",
      ruleType: record.rule_type || "unknown",
      requiredSubjects: parseJsonArray(record.required_subjects_json),
      oneOfSubjects: parseJsonArray(record.optional_subjects_json),
      preferredSubjects: [],
      forbiddenSubjects: parseJsonArray(record.forbidden_subjects_json),
      allowedTracks: parseJsonArray(record.track_limit_json).map(denormalizeTrackType)
    },
    requiredSubjects: parseJsonArray(record.required_subjects_json),
    oneOfSubjects: parseJsonArray(record.optional_subjects_json),
    preferredSubjects: [],
    forbiddenSubjects: parseJsonArray(record.forbidden_subjects_json),
    tuition: Number(record.tuition_fee || 0),
    notes: record.notes || ""
  };
}

function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeProvinceCodeSafe(value) {
  const normalized = String(value || "").trim();

  if (normalized === "广东" || normalized === "骞夸笢") {
    return "GD";
  }

  return null;
}

function normalizeTrackTypeSafe(value) {
  const normalized = String(value || "").trim();

  if (normalized === "物理" || normalized === "鐗╃悊") {
    return "physics";
  }

  if (normalized === "历史" || normalized === "鍘嗗彶") {
    return "history";
  }

  return null;
}

function normalizeProvinceCodeStrict(value) {
  const normalized = String(value || "").trim();

  if (normalized === "\u5e7f\u4e1c" || normalized === "骞夸笢") {
    return "GD";
  }

  return null;
}

function normalizeTrackTypeStrict(value) {
  const normalized = String(value || "").trim();

  if (normalized === "\u7269\u7406" || normalized === "鐗╃悊") {
    return "physics";
  }

  if (normalized === "\u5386\u53f2" || normalized === "鍘嗗彶") {
    return "history";
  }

  return null;
}

function normalizeRelationalScope(province, track) {
  const provinceCode = normalizeProvinceCodeStrict(province);
  const trackType = normalizeTrackTypeStrict(track);

  if (!provinceCode || !trackType) {
    return null;
  }

  return {
    provinceCode,
    trackType
  };
}

function normalizeProvinceCode(value) {
  const normalized = String(value || "").trim();

  switch (normalized) {
    case "广东":
    case "骞夸笢":
      return "GD";
    default:
      return null;
  }
}

function normalizeTrackType(value) {
  const normalized = String(value || "").trim();

  if (normalized === "物理" || normalized === "鐗╃悊") {
    return "physics";
  }

  if (normalized === "历史" || normalized === "鍘嗗彶") {
    return "history";
  }

  return null;
}

function denormalizeProvinceCode(value) {
  if (value === "GD") {
    return "广东";
  }

  return null;
}

function denormalizeTrackType(value) {
  if (value === "physics") {
    return "物理";
  }

  if (value === "history") {
    return "历史";
  }

  return String(value || "");
}

function denormalizeBatchCode(value) {
  if (value === "undergraduate_batch") {
    return "本科批";
  }

  return String(value || "");
}
