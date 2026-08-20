import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./csvService.js";
import { getDataEngine } from "./dbService.js";
import { invalidateGeneratedGaokaoDataCache } from "./dataService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..", "..");
const apiRoot = path.resolve(__dirname, "..");
const dataRoot = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : projectRoot;
const importDir = process.env.DATA_DIR
  ? path.join(dataRoot, "imports")
  : path.join(projectRoot, "data", "import");
const generatedDir = process.env.DATA_DIR
  ? path.join(dataRoot, "generated")
  : path.join(apiRoot, "data", "generated");

const provinceScoreRankOutput = path.join(generatedDir, "provinceScoreRank.json");
const universityMajorLinesOutput = path.join(generatedDir, "universityMajorLines.json");

function splitSubjectField(value) {
  return String(value || "")
    .split(/[|,\s，、]+/)
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

  if (!requiredSubjects.length && (raw === "物理" || raw === "历史" || raw === "鐗╃悊" || raw === "鍘嗗彶")) {
    requiredSubjects.push(raw);
  }

  if (!allowedTracks.length && (raw === "物理" || raw === "历史" || raw === "鐗╃悊" || raw === "鍘嗗彶")) {
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
          : raw.includes("不限") || raw.includes("涓嶉檺")
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

  const importFiles = fs
    .readdirSync(importDir)
    .filter((file) => file.endsWith(".csv"))
    .sort((a, b) => getDatasetPriority(a) - getDatasetPriority(b) || a.localeCompare(b));

  const provinceScoreRank = [];
  const universityMajorLines = [];
  const relationalImports = [];
  const dataImportService = getDataEngine().services.dataImport;
  let enrollmentPlanCount = 0;

  for (const file of importFiles) {
    const datasetType = datasetTypeFromFileName(file);
    if (!datasetType) {
      continue;
    }

    const rows = parseCsv(fs.readFileSync(path.join(importDir, file), "utf8"));

    if (datasetType === "province_score_rank") {
      rows.forEach((row) => {
        provinceScoreRank.push({
          province: row.province,
          year: Number(row.year),
          track: row.track,
          score: Number(row.score),
          rank: Number(row.rank)
        });
      });

      relationalImports.push(
        dataImportService.importProvinceScoreRankRows({
          fileName: file,
          rows
        })
      );

      continue;
    }

    if (datasetType === "university_major_lines") {
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

      const result = dataImportService.importUniversityMajorLineRows({
        fileName: file,
        rows
      });
      relationalImports.push(result);
      enrollmentPlanCount += Number(result.inferredEnrollmentPlanRows || 0);
      continue;
    }

    if (datasetType === "enrollment_plan") {
      const result = dataImportService.importEnrollmentPlanRows({
        fileName: file,
        rows
      });
      relationalImports.push(result);
      enrollmentPlanCount += Number(result.insertedRows || 0);
    }
  }

  fs.writeFileSync(provinceScoreRankOutput, JSON.stringify(provinceScoreRank, null, 2), "utf8");
  fs.writeFileSync(
    universityMajorLinesOutput,
    JSON.stringify(universityMajorLines, null, 2),
    "utf8"
  );

  invalidateGeneratedGaokaoDataCache();

  return {
    provinceScoreRankCount: provinceScoreRank.length,
    universityMajorLineCount: universityMajorLines.length,
    enrollmentPlanCount,
    relationalImports,
    output: {
      provinceScoreRankOutput,
      universityMajorLinesOutput
    }
  };
}

export function importCsvFile({ filePath, fileName, datasetType }) {
  const normalizedDatasetType = normalizeDatasetType(datasetType);
  if (!normalizedDatasetType) {
    throw new Error("无效的数据集类型");
  }

  assertDatasetTypeMatchesFileName(fileName, normalizedDatasetType);

  const fileScope = path.resolve(filePath);
  const allowedImportRoot = path.resolve(importDir);
  if (fileScope !== allowedImportRoot && !fileScope.startsWith(`${allowedImportRoot}${path.sep}`)) {
    throw new Error("导入文件必须位于受控导入目录内");
  }

  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  const result = importRowsByDatasetType({
    fileName,
    datasetType: normalizedDatasetType,
    rows
  });
  invalidateGeneratedGaokaoDataCache();

  return {
    ...result,
    importedDatasetType: normalizedDatasetType,
    importedRowCount: Number(result.insertedRows || 0)
  };
}

export function assertDatasetTypeMatchesFileName(fileName, datasetType) {
  const normalizedDatasetType = normalizeDatasetType(datasetType);
  const inferredDatasetType = datasetTypeFromFileName(fileName);
  if (normalizedDatasetType && inferredDatasetType && inferredDatasetType !== normalizedDatasetType) {
    throw new Error(
      `文件名显示为 ${inferredDatasetType}，但请求类型为 ${normalizedDatasetType}，请修正后重试`
    );
  }

  if (normalizedDatasetType && !inferredDatasetType) {
    throw new Error(
      `文件名必须以 ${normalizedDatasetType}_ 开头，以确保导入类型与实际文件一致`
    );
  }
}

function importRowsByDatasetType({ fileName, datasetType, rows }) {
  const dataImportService = getDataEngine().services.dataImport;

  if (datasetType === "province_score_rank") {
    return dataImportService.importProvinceScoreRankRows({ fileName, rows });
  }

  if (datasetType === "university_major_lines") {
    return dataImportService.importUniversityMajorLineRows({ fileName, rows });
  }

  return dataImportService.importEnrollmentPlanRows({ fileName, rows });
}

function normalizeDatasetType(value) {
  return ["province_score_rank", "university_major_lines", "enrollment_plan"].includes(value)
    ? value
    : null;
}

function datasetTypeFromFileName(fileName) {
  const normalized = path.basename(String(fileName || "")).toLowerCase();
  if (/^province_score_rank_\d{4}(?:_[a-z0-9-]+)*\.csv$/.test(normalized)) {
    return "province_score_rank";
  }

  if (/^university_major_lines_\d{4}(?:_[a-z0-9-]+)*\.csv$/.test(normalized)) {
    return "university_major_lines";
  }

  if (/^enrollment_plan_\d{4}(?:_[a-z0-9-]+)*\.csv$/.test(normalized)) {
    return "enrollment_plan";
  }

  return null;
}

function getDatasetPriority(fileName) {
  if (datasetTypeFromFileName(fileName) === "province_score_rank") {
    return 1;
  }

  if (datasetTypeFromFileName(fileName) === "university_major_lines") {
    return 2;
  }

  if (datasetTypeFromFileName(fileName) === "enrollment_plan") {
    return 3;
  }

  return 9;
}

export function saveImportFile(fileName, content) {
  ensureDataDirectories();
  const originalName = path.basename(fileName);
  const safeName = originalName;
  const filePath = path.join(importDir, safeName);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}
