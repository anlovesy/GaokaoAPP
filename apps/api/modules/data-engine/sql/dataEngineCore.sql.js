export const DATA_ENGINE_CORE_SQL = `
  CREATE TABLE IF NOT EXISTS dim_province (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name_zh TEXT NOT NULL,
    name_en TEXT,
    exam_mode TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dim_year (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL UNIQUE,
    is_current INTEGER NOT NULL DEFAULT 0,
    is_open_for_query INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dim_batch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province_code TEXT NOT NULL,
    year INTEGER NOT NULL,
    batch_code TEXT NOT NULL,
    batch_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(province_code, year, batch_code)
  );

  CREATE TABLE IF NOT EXISTS dim_subject (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_code TEXT NOT NULL UNIQUE,
    subject_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS data_source (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    province_code TEXT,
    year INTEGER,
    version TEXT,
    file_path TEXT,
    checksum TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    imported_by TEXT
  );

  CREATE TABLE IF NOT EXISTS import_job (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL,
    province_code TEXT,
    year INTEGER,
    dataset_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total_rows INTEGER NOT NULL DEFAULT 0,
    success_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    error_report_path TEXT,
    started_at TEXT,
    finished_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS import_error_row (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    row_number INTEGER NOT NULL,
    raw_payload_json TEXT NOT NULL,
    error_message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES import_job(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subject_requirement_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_code TEXT NOT NULL UNIQUE,
    raw_text TEXT,
    rule_type TEXT NOT NULL,
    required_subjects_json TEXT,
    optional_subjects_json TEXT,
    forbidden_subjects_json TEXT,
    track_limit_json TEXT,
    normalized_text TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS university (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    university_code TEXT NOT NULL UNIQUE,
    name_zh TEXT NOT NULL,
    name_en TEXT,
    short_name TEXT,
    province_code TEXT,
    city_code TEXT,
    school_type TEXT,
    school_level TEXT,
    is_985 INTEGER NOT NULL DEFAULT 0,
    is_211 INTEGER NOT NULL DEFAULT 0,
    is_double_first_class INTEGER NOT NULL DEFAULT 0,
    is_public INTEGER NOT NULL DEFAULT 1,
    is_ministry_affiliated INTEGER NOT NULL DEFAULT 0,
    campus_count INTEGER NOT NULL DEFAULT 1,
    website TEXT,
    description TEXT,
    tags_json TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS university_alias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    university_id INTEGER NOT NULL,
    alias_name TEXT NOT NULL,
    UNIQUE(university_id, alias_name),
    FOREIGN KEY(university_id) REFERENCES university(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS major (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    major_code TEXT NOT NULL UNIQUE,
    major_name_zh TEXT NOT NULL,
    major_name_en TEXT,
    discipline_category TEXT,
    discipline_subcategory TEXT,
    degree_type TEXT,
    study_years INTEGER,
    description TEXT,
    core_courses_json TEXT,
    career_paths_json TEXT,
    postgraduate_directions_json TEXT,
    industry_tags_json TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS major_alias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    major_id INTEGER NOT NULL,
    alias_name TEXT NOT NULL,
    UNIQUE(major_id, alias_name),
    FOREIGN KEY(major_id) REFERENCES major(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS university_advantage_major (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    university_id INTEGER NOT NULL,
    major_id INTEGER NOT NULL,
    tag_type TEXT NOT NULL,
    weight_score REAL NOT NULL DEFAULT 0,
    UNIQUE(university_id, major_id, tag_type),
    FOREIGN KEY(university_id) REFERENCES university(id) ON DELETE CASCADE,
    FOREIGN KEY(major_id) REFERENCES major(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS score_rank_segment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province_code TEXT NOT NULL,
    year INTEGER NOT NULL,
    exam_mode TEXT NOT NULL,
    track_type TEXT NOT NULL,
    score INTEGER NOT NULL,
    rank_min INTEGER NOT NULL,
    rank_max INTEGER NOT NULL,
    same_score_count INTEGER NOT NULL DEFAULT 1,
    cumulative_count INTEGER,
    source_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(province_code, year, track_type, score),
    FOREIGN KEY(source_id) REFERENCES data_source(id)
  );

  CREATE TABLE IF NOT EXISTS admission_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province_code TEXT NOT NULL,
    year INTEGER NOT NULL,
    track_type TEXT NOT NULL,
    batch_code TEXT NOT NULL,
    university_id INTEGER NOT NULL,
    major_id INTEGER,
    major_group_code TEXT,
    admission_type TEXT,
    min_score INTEGER,
    min_rank INTEGER,
    avg_score INTEGER,
    avg_rank INTEGER,
    max_score INTEGER,
    max_rank INTEGER,
    plan_count INTEGER,
    actual_admit_count INTEGER,
    tuition_fee INTEGER,
    subject_rule_id INTEGER,
    notes TEXT,
    source_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(university_id) REFERENCES university(id),
    FOREIGN KEY(major_id) REFERENCES major(id),
    FOREIGN KEY(subject_rule_id) REFERENCES subject_requirement_rule(id),
    FOREIGN KEY(source_id) REFERENCES data_source(id)
  );

  CREATE TABLE IF NOT EXISTS enrollment_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province_code TEXT NOT NULL,
    year INTEGER NOT NULL,
    batch_code TEXT NOT NULL,
    university_id INTEGER NOT NULL,
    major_id INTEGER,
    major_group_code TEXT,
    plan_key TEXT,
    plan_name TEXT,
    track_type TEXT,
    plan_count INTEGER NOT NULL DEFAULT 0,
    tuition_fee INTEGER,
    duration_years INTEGER,
    campus_name TEXT,
    admission_notes TEXT,
    subject_rule_id INTEGER,
    plan_source_type TEXT NOT NULL DEFAULT 'official_csv',
    is_new_program INTEGER NOT NULL DEFAULT 0,
    is_cooperative_program INTEGER NOT NULL DEFAULT 0,
    is_targeted_program INTEGER NOT NULL DEFAULT 0,
    source_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(university_id) REFERENCES university(id),
    FOREIGN KEY(major_id) REFERENCES major(id),
    FOREIGN KEY(subject_rule_id) REFERENCES subject_requirement_rule(id),
    FOREIGN KEY(source_id) REFERENCES data_source(id)
  );

  CREATE TABLE IF NOT EXISTS industry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    industry_code TEXT NOT NULL UNIQUE,
    industry_name TEXT NOT NULL,
    industry_category TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS career_outlook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    major_id INTEGER NOT NULL,
    industry_code TEXT,
    employment_rate REAL,
    avg_salary_1y REAL,
    avg_salary_3y REAL,
    avg_salary_5y REAL,
    hotness_score REAL,
    growth_score REAL,
    postgraduate_rate REAL,
    public_exam_rate REAL,
    abroad_rate REAL,
    source_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(major_id) REFERENCES major(id),
    FOREIGN KEY(source_id) REFERENCES data_source(id)
  );

  CREATE TABLE IF NOT EXISTS province_policy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province_code TEXT NOT NULL,
    year INTEGER NOT NULL,
    exam_mode TEXT NOT NULL,
    policy_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content_markdown TEXT,
    structured_rules_json TEXT,
    effective_date TEXT,
    source_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(source_id) REFERENCES data_source(id)
  );

  CREATE TABLE IF NOT EXISTS volunteer_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province_code TEXT NOT NULL,
    year INTEGER NOT NULL,
    batch_code TEXT NOT NULL,
    volunteer_mode TEXT NOT NULL,
    parallel_count INTEGER,
    can_adjust INTEGER NOT NULL DEFAULT 0,
    risk_notes TEXT,
    rule_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(province_code, year, batch_code, volunteer_mode)
  );

  CREATE INDEX IF NOT EXISTS idx_dim_batch_province_year_sort
    ON dim_batch(province_code, year, sort_order);

  CREATE INDEX IF NOT EXISTS idx_data_source_province_year
    ON data_source(province_code, year);

  CREATE INDEX IF NOT EXISTS idx_import_job_dataset_status
    ON import_job(dataset_name, status, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_subject_requirement_rule_type
    ON subject_requirement_rule(rule_type);

  CREATE INDEX IF NOT EXISTS idx_university_name_zh
    ON university(name_zh);

  CREATE INDEX IF NOT EXISTS idx_university_province_city
    ON university(province_code, city_code);

  CREATE INDEX IF NOT EXISTS idx_major_name_zh
    ON major(major_name_zh);

  CREATE INDEX IF NOT EXISTS idx_score_rank_segment_scope_score
    ON score_rank_segment(province_code, year, track_type, score);

  CREATE INDEX IF NOT EXISTS idx_score_rank_segment_scope_rank
    ON score_rank_segment(province_code, year, track_type, rank_min, rank_max);

  CREATE INDEX IF NOT EXISTS idx_admission_record_scope_rank
    ON admission_record(province_code, year, track_type, min_rank);

  CREATE INDEX IF NOT EXISTS idx_admission_record_university_scope
    ON admission_record(university_id, province_code, year, track_type);

  CREATE INDEX IF NOT EXISTS idx_admission_record_major_scope
    ON admission_record(major_id, province_code, year, track_type);

  CREATE INDEX IF NOT EXISTS idx_enrollment_plan_scope_university
    ON enrollment_plan(province_code, year, university_id);

  CREATE INDEX IF NOT EXISTS idx_enrollment_plan_scope_batch
    ON enrollment_plan(province_code, year, track_type, batch_code);

  CREATE INDEX IF NOT EXISTS idx_career_outlook_major_year
    ON career_outlook(major_id, year);

  CREATE INDEX IF NOT EXISTS idx_province_policy_scope
    ON province_policy(province_code, year, policy_type);

  CREATE INDEX IF NOT EXISTS idx_volunteer_rule_scope
    ON volunteer_rule(province_code, year, batch_code);
`;
