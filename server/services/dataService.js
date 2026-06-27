import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const runtimeGeneratedDir = process.env.DATA_DIR
  ? path.join(path.resolve(process.env.DATA_DIR), "generated")
  : path.join(projectRoot, "server", "data", "generated");
const bundledGeneratedDir = path.join(projectRoot, "server", "data", "generated");

const provinceScoreRankCandidates = [
  path.join(runtimeGeneratedDir, "provinceScoreRank.json"),
  path.join(bundledGeneratedDir, "provinceScoreRank.json")
];

const universityMajorLinesCandidates = [
  path.join(runtimeGeneratedDir, "universityMajorLines.json"),
  path.join(bundledGeneratedDir, "universityMajorLines.json")
];

export function loadGeneratedGaokaoData() {
  return {
    provinceScoreRank: readFirstJson(provinceScoreRankCandidates, []),
    universityMajorLines: readFirstJson(universityMajorLinesCandidates, [])
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
  const candidates = data.provinceScoreRank
    .filter((item) => item.province === province && (!track || !item.track || item.track === track))
    .map((item) => Number(item.year))
    .filter(Boolean);

  return candidates.length ? Math.max(...candidates) : null;
}

export function getLatestUniversityYear(data, province, track) {
  const candidates = data.universityMajorLines
    .filter((item) => item.province === province && (!track || !item.track || item.track === track))
    .map((item) => Number(item.year))
    .filter(Boolean);

  return candidates.length ? Math.max(...candidates) : null;
}

export function findNearbyScoreRank(data, province, track, score) {
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
