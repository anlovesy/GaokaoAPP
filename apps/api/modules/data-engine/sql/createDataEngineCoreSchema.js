import { DATA_ENGINE_CORE_SQL } from "./dataEngineCore.sql.js";

export function createDataEngineCoreSchema(database) {
  database.exec(DATA_ENGINE_CORE_SQL);
  ensureEnrollmentPlanColumns(database);
}

function ensureEnrollmentPlanColumns(database) {
  const columns = database.prepare("PRAGMA table_info(enrollment_plan)").all();
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("plan_key")) {
    database.exec("ALTER TABLE enrollment_plan ADD COLUMN plan_key TEXT");
  }

  if (!columnNames.has("plan_source_type")) {
    database.exec(
      "ALTER TABLE enrollment_plan ADD COLUMN plan_source_type TEXT NOT NULL DEFAULT 'official_csv'"
    );
  }

  database.exec(`
    UPDATE enrollment_plan
    SET
      plan_key = COALESCE(
        CASE
          WHEN plan_key LIKE 'group:%' OR plan_key LIKE 'major:%' OR plan_key LIKE 'name:%' THEN
            plan_key
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(major_group_code, '') IS NOT NULL THEN 'group:' || major_group_code
          ELSE NULL
        END,
        CASE
          WHEN major_id IS NOT NULL THEN 'major:' || major_id
          ELSE 'name:' || COALESCE(NULLIF(plan_name, ''), 'unknown')
        END
      ),
      plan_source_type = CASE
        WHEN admission_notes LIKE '%seeded_from=historical_line%' THEN 'historical_inference'
        WHEN plan_source_type IS NULL OR plan_source_type = '' THEN 'official_csv'
        ELSE plan_source_type
      END
    WHERE
      plan_key IS NULL
      OR plan_key = ''
      OR (
        plan_key NOT LIKE 'group:%'
        AND plan_key NOT LIKE 'major:%'
        AND plan_key NOT LIKE 'name:%'
      )
      OR (
        admission_notes LIKE '%seeded_from=historical_line%'
        AND plan_source_type <> 'historical_inference'
      )
      OR (
        (plan_source_type IS NULL OR plan_source_type = '')
        AND admission_notes NOT LIKE '%seeded_from=historical_line%'
      )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_enrollment_plan_lookup_key
      ON enrollment_plan(
        province_code, year, track_type, batch_code, university_id, plan_key, plan_source_type
      )
  `);
}
