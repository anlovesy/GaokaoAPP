import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./csvService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const dataRoot = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : projectRoot;
const importDir = process.env.DATA_DIR
  ? path.join(dataRoot, "imports")
  : path.join(projectRoot, "data", "import");
const generatedDir = process.env.DATA_DIR
  ? path.join(dataRoot, "generated")
  : path.join(projectRoot, "server", "data", "generated");

const provinceScoreRankOutput = path.join(generatedDir, "provinceScoreRank.json");
const universityMajorLinesOutput = path.join(generatedDir, "universityMajorLines.json");

function splitSubjectField(value) {
  return String(value || "")
    .split(/[|,，/、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSubjectRule(row) {
  const raw = String(row.subject_requirement || "").trim();
  const requiredSubjects = splitSubjectField(row.required_subjects);
  const oneOfSubjects = splitSubjectField(row.one_of_subjects);
  const preferredSubjects = splitSubjectField(row.preferred_subjects);
  const forbiddenSubjects = splitSubjectField(row.forbidden_subjects);
  const allowedTracks = splitSubjectField(row.allowed_tracks || row.track || row.subject_track);
  const explicitRuleType = String(row.subject_requirement_type || "").trim();

  if (!requiredSubjects.length && (raw === "物理" || raw === "历史")) {
    requiredSubjects.push(raw);
  }

  if (!allowedTracks.length && (raw === "物理" || raw === "历史")) {
    allowedTracks.push(raw);
  }

  const ruleType =
    explicitRuleType ||
    (requiredSubjects.length
      ? "allOf"
      : oneOfSubjects.length
        ? "oneOf"
        : forbiddenSubjects.length
          ? "forbidden"
          : raw.includes("不限")
            ? "none"
            : raw
              ? "derived"
              : "unknown");

  return {
    raw,
    ruleType,
    requiredSubjects,
    oneOfSubjects,
    preferredSubjects,
    forbiddenSubjects,
    allowedTracks
  };
}

export function ensureDataDirectories() {
  fs.mkdirSync(importDir, { recursive: true });
  fs.mkdirSync(generatedDir, { recursive: true });
}

export function importAllCsvFiles() {
  ensureDataDirectories();
  const importFiles = fs.readdirSync(importDir).filter((file) => file.endsWith(".csv"));
  const provinceScoreRank = [];
  const universityMajorLines = [];

  for (const file of importFiles) {
    const rows = parseCsv(fs.readFileSync(path.join(importDir, file), "utf8"));
    if (file.startsWith("province_score_rank")) {
      rows.forEach((row) => {
        provinceScoreRank.push({
          province: row.province,
          year: Number(row.year),
          track: row.track,
          score: Number(row.score),
          rank: Number(row.rank)
        });
      });
    }

    if (file.startsWith("university_major_lines")) {
      rows.forEach((row) => {
        universityMajorLines.push({
          province: row.province,
          year: Number(row.year),
          track: row.track || row.subject_track || "",
          university: row.university,
          major: row.major,
          minScore: Number(row.min_score),
          minRank: Number(row.min_rank),
          batch: row.batch,
          admissionCount: Number(row.admission_count || 0),
          subjectRequirement: row.subject_requirement,
          subjectRule: normalizeSubjectRule(row),
          requiredSubjects: splitSubjectField(row.required_subjects),
          oneOfSubjects: splitSubjectField(row.one_of_subjects),
          preferredSubjects: splitSubjectField(row.preferred_subjects),
          forbiddenSubjects: splitSubjectField(row.forbidden_subjects),
          tuition: Number(row.tuition || 0),
          notes: row.notes || ""
        });
      });
    }
  }

  fs.writeFileSync(provinceScoreRankOutput, JSON.stringify(provinceScoreRank, null, 2), "utf8");
  fs.writeFileSync(universityMajorLinesOutput, JSON.stringify(universityMajorLines, null, 2), "utf8");

  return {
    provinceScoreRankCount: provinceScoreRank.length,
    universityMajorLineCount: universityMajorLines.length,
    output: {
      provinceScoreRankOutput,
      universityMajorLinesOutput
    }
  };
}

export function saveImportFile(fileName, content) {
  ensureDataDirectories();
  const safeName = path.basename(fileName);
  const filePath = path.join(importDir, safeName);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}
