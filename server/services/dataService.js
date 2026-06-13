import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const generatedDir = path.join(projectRoot, "server", "data", "generated");
const provinceScoreRankPath = path.join(generatedDir, "provinceScoreRank.json");
const universityMajorLinesPath = path.join(generatedDir, "universityMajorLines.json");

export function loadGeneratedGaokaoData() {
  return {
    provinceScoreRank: readJsonSafely(provinceScoreRankPath, []),
    universityMajorLines: readJsonSafely(universityMajorLinesPath, [])
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

export function findHistoricalMajorLine(data, province, track, university, major) {
  const scopedMatches = data.universityMajorLines
    .filter(
      (item) =>
        item.province === province &&
        item.university === university &&
        (!track || !item.track || item.track === track)
    );

  const majorMatches = scopedMatches
    .filter(
      (item) =>
        (item.major === major || item.major.includes(major) || major.includes(item.major))
    )
    .sort((a, b) => b.year - a.year);

  if (majorMatches[0]) {
    return majorMatches[0];
  }

  const fallbackMatches = scopedMatches
    .slice()
    .sort((a, b) => {
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
