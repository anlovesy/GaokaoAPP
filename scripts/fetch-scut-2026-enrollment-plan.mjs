import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(
  projectRoot,
  "data",
  "import",
  "enrollment_plan_2026_guangdong_physics_scut.csv"
);

const planSourceUrl = "https://admission.scut.edu.cn/30820/list.htm";
const queryUrl =
  "https://admission.scut.edu.cn/_web/_apps/commonquery/commonquery/api/commonqueryCacheResult/24.rst?_p=YXM9MzQ4JnQ9MzM1MSZwPTEmbT1OJg__&mobileTemplate=false";
const tuitionSourceUrl = "https://admission.scut.edu.cn/2026/0528/c30824a628133/page.htm";

const queryBody =
  "cq24s220=%E5%B9%BF%E4%B8%9C&cq24s221=2026&cq24s222=%E7%90%86%E5%B7%A5%2F%E7%89%A9%E7%90%86%E7%B1%BB&cq24s223=%E6%99%AE%E9%80%9A%E7%B1%BB";

const response = await fetch(queryUrl, {
  method: "POST",
  body: queryBody,
  headers: {
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    referer:
      "https://admission.scut.edu.cn/_web/_apps/commonquery/commonquery/api/queryMatch/24.rst",
    "user-agent": "GaokaoApp official-data importer"
  }
});

if (!response.ok) {
  throw new Error(`SCUT plan endpoint returned HTTP ${response.status}`);
}

const html = await response.text();
const rows = parseRows(html);

if (rows.length < 10) {
  throw new Error(`SCUT plan endpoint returned too few rows: ${rows.length}`);
}

const output = [
  [
    "province",
    "year",
    "track",
    "batch",
    "university",
    "major",
    "major_group_code",
    "plan_name",
    "plan_count",
    "subject_requirement",
    "required_subjects",
    "one_of_subjects",
    "preferred_subjects",
    "forbidden_subjects",
    "tuition",
    "duration_years",
    "campus_name",
    "is_new_program",
    "is_cooperative_program",
    "is_targeted_program",
    "notes"
  ],
  ...rows.map(toCsvRow)
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${output.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`,
  "utf8"
);

console.log(
  JSON.stringify({ outputPath, rowCount: rows.length, planSourceUrl, tuitionSourceUrl }, null, 2)
);

function parseRows(sourceHtml) {
  const cleanHtml = sourceHtml.replace(/<!--[\s\S]*?-->/g, "");
  return cleanHtml
    .split(/<tr[^>]*>/)
    .slice(1)
    .map((block) =>
      [...block.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/g)].map(([, value]) =>
        stripHtml(value)
      )
    )
    .filter((row) => row.length === 7 && row[0] !== "省份")
    .map(([province, sourceTrack, category, major, planCount, subjects, group]) => ({
      province,
      sourceTrack,
      category,
      major,
      planCount,
      subjects,
      group
    }));
}

function toCsvRow(row) {
  const subjectParts = row.subjects
    .split("+")
    .map((item) => item.trim())
    .filter(Boolean);
  const requiredSubjects = subjectParts.filter((item) => item !== "不限");
  const tuition = resolveTuition(row.major);
  const tuitionNote = resolveTuitionNote(row.major, tuition);
  const notes = [
    `官方招生计划查询：${planSourceUrl}`,
    "查询范围：广东 / 2026 / 理工/物理类 / 普通类",
    `学费依据：${tuitionSourceUrl}`,
    tuitionNote
  ].join(";");

  return [
    row.province,
    "2026",
    "物理",
    "本科批",
    "华南理工大学",
    row.major,
    row.group.replace("组", ""),
    row.major,
    Number(row.planCount),
    row.subjects,
    requiredSubjects.join("|"),
    "",
    "",
    "",
    tuition,
    4,
    "",
    0,
    row.major.includes("中外合作办学") ? 1 : 0,
    0,
    notes
  ];
}

function resolveTuition(major) {
  if (major.includes("工业设计（中外合作办学）")) {
    return 68000;
  }

  if (major.includes("临床医学类")) {
    return 7660;
  }

  if (/经济|金融|法学|大数据管理与应用/.test(major)) {
    return 6060;
  }

  return 6850;
}

function resolveTuitionNote(major, tuition) {
  if (major === "软件工程") {
    return `收费标准为 ${tuition} 元/生·学年；软件工程 3—4 年级为 16000 元/生·学年`;
  }

  if (major.includes("工业设计（中外合作办学）")) {
    return "中外合作办学专业收费标准为 68000 元/生·学年";
  }

  if (major.includes("临床医学类")) {
    return "医学类专业收费标准为 7660 元/生·学年";
  }

  if (/经济|金融|法学|大数据管理与应用/.test(major)) {
    return "文科类专业收费标准按 6060 元/生·学年记录";
  }

  return "理工外语体育类专业收费标准为 6850 元/生·学年";
}

function stripHtml(value) {
  return String(value)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
