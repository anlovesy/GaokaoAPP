from __future__ import annotations

import csv
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OFFICIAL_DIR = ROOT / "data" / "official-downloads"
IMPORT_DIR = ROOT / "data" / "import"

HISTORY_SCORE_TEXT = OFFICIAL_DIR / "gd2025-history.txt"
PHYSICS_SCORE_TEXT = OFFICIAL_DIR / "gd2025-physics.txt"
HISTORY_LINES_PDF = OFFICIAL_DIR / "gd2025-undergrad-history-lines.pdf"
PHYSICS_LINES_PDF = OFFICIAL_DIR / "gd2025-undergrad-physics-lines.pdf"

HISTORY_SCORE_CSV = IMPORT_DIR / "province_score_rank_2025_history.csv"
PHYSICS_SCORE_CSV = IMPORT_DIR / "province_score_rank_2025_physics.csv"
HISTORY_LINES_CSV = IMPORT_DIR / "university_major_lines_2025_guangdong_history.csv"
PHYSICS_LINES_CSV = IMPORT_DIR / "university_major_lines_2025_guangdong_physics.csv"

TRACK_LABELS = {
    "history": "历史",
    "physics": "物理",
}

SCORE_PATTERN = re.compile(r"^(\d+)(?:（含以上）)?\s+\d+\s+(\d+)\s+\d+\s+\d+$")
LINE_PATTERN = re.compile(r"^(\d{5})\s+(.+?)\s+(\d{3})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$")
EMPTY_LINE_PATTERN = re.compile(r"^(\d{5})\s+(.+?)\s+(\d{3})\s+(\d+)\s+0\s+-\s+-$")


def main() -> None:
    IMPORT_DIR.mkdir(parents=True, exist_ok=True)
    history_score_rows = build_score_rows(HISTORY_SCORE_TEXT, TRACK_LABELS["history"])
    physics_score_rows = build_score_rows(PHYSICS_SCORE_TEXT, TRACK_LABELS["physics"])
    history_line_rows = build_line_rows(HISTORY_LINES_PDF, TRACK_LABELS["history"])
    physics_line_rows = build_line_rows(PHYSICS_LINES_PDF, TRACK_LABELS["physics"])

    write_csv(
        HISTORY_SCORE_CSV,
        ["province", "year", "track", "score", "rank"],
        history_score_rows,
    )
    write_csv(
        PHYSICS_SCORE_CSV,
        ["province", "year", "track", "score", "rank"],
        physics_score_rows,
    )
    write_csv(
        HISTORY_LINES_CSV,
        [
            "province",
            "year",
            "track",
            "university",
            "major",
            "min_score",
            "min_rank",
            "batch",
            "admission_count",
            "subject_requirement",
            "tuition",
            "notes",
        ],
        history_line_rows,
    )
    write_csv(
        PHYSICS_LINES_CSV,
        [
            "province",
            "year",
            "track",
            "university",
            "major",
            "min_score",
            "min_rank",
            "batch",
            "admission_count",
            "subject_requirement",
            "tuition",
            "notes",
        ],
        physics_line_rows,
    )

    print(
        {
            "historyScoreRows": len(history_score_rows),
            "physicsScoreRows": len(physics_score_rows),
            "historyLineRows": len(history_line_rows),
            "physicsLineRows": len(physics_line_rows),
        }
    )


def build_score_rows(path: Path, track: str) -> list[dict[str, str | int]]:
    text = path.read_text(encoding="utf-8")
    rows: list[dict[str, str | int]] = []

    for line in text.splitlines():
        line = line.strip()
        match = SCORE_PATTERN.match(line)
        if not match:
            continue

        score = int(match.group(1))
        rank = int(match.group(2))
        rows.append(
            {
                "province": "广东",
                "year": 2025,
                "track": track,
                "score": score,
                "rank": rank,
            }
        )

    rows.sort(key=lambda item: int(item["score"]), reverse=True)
    return rows


def build_line_rows(path: Path, track: str) -> list[dict[str, str | int]]:
    reader = PdfReader(str(path))
    rows: list[dict[str, str | int]] = []

    for page in reader.pages:
        text = page.extract_text() or ""
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line or not re.match(r"^\d{5}\s+", line):
                continue

            match = LINE_PATTERN.match(line)
            if match:
                school_code, university, group_code, plan_count, admission_count, min_score, min_rank = match.groups()
                rows.append(
                    {
                        "province": "广东",
                        "year": 2025,
                        "track": track,
                        "university": university,
                        "major": f"专业组 {group_code}",
                        "min_score": int(min_score),
                        "min_rank": int(min_rank),
                        "batch": "本科批",
                        "admission_count": int(admission_count),
                        "subject_requirement": track,
                        "tuition": 0,
                        "notes": f"院校代码:{school_code};专业组:{group_code};计划数:{plan_count}",
                    }
                )
                continue

            empty_match = EMPTY_LINE_PATTERN.match(line)
            if empty_match:
                school_code, university, group_code, plan_count = empty_match.groups()
                rows.append(
                    {
                        "province": "广东",
                        "year": 2025,
                        "track": track,
                        "university": university,
                        "major": f"专业组 {group_code}",
                        "min_score": 0,
                        "min_rank": 0,
                        "batch": "本科批",
                        "admission_count": 0,
                        "subject_requirement": track,
                        "tuition": 0,
                        "notes": f"院校代码:{school_code};专业组:{group_code};计划数:{plan_count};未投满",
                    }
                )

    return [row for row in rows if int(row["min_rank"]) > 0 and int(row["min_score"]) > 0]


def write_csv(path: Path, headers: list[str], rows: list[dict[str, str | int]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
