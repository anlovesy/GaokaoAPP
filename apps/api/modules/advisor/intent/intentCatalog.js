export const INTENT_DEFINITIONS = [
  {
    key: "school_recommendation",
    description: "推荐学校",
    patterns: ["学校", "院校", "大学", "志愿表", "冲", "稳", "保", "保底"]
  },
  {
    key: "major_recommendation",
    description: "推荐专业",
    patterns: ["专业", "选专业", "专业组", "调剂", "转专业"]
  },
  {
    key: "university_lookup",
    description: "查询院校",
    patterns: ["这所学校", "这个学校", "院校详情", "大学怎么样", "学校怎么样"]
  },
  {
    key: "policy_consulting",
    description: "查询政策",
    patterns: ["政策", "批次", "规则", "招生章程", "选科要求"]
  },
  {
    key: "employment_consulting",
    description: "就业咨询",
    patterns: ["就业", "工作", "前景", "薪资", "行业"]
  },
  {
    key: "postgraduate_planning",
    description: "考研规划",
    patterns: ["考研", "读研", "保研", "深造", "研究生"]
  },
  {
    key: "risk_analysis",
    description: "风险分析",
    patterns: ["风险", "稳不稳", "概率", "滑档", "录取率", "能不能上"]
  },
  {
    key: "career_planning",
    description: "生涯规划",
    patterns: ["职业规划", "未来方向", "四年规划", "适合做什么"]
  }
];

export const TOOL_RECIPES = {
  school_recommendation: ["workspace_data", "admission_database", "enrollment_plan_database"],
  major_recommendation: ["workspace_data", "major_database", "employment_database"],
  university_lookup: ["workspace_data", "university_database", "admission_database"],
  policy_consulting: ["policy_database", "knowledge_base"],
  employment_consulting: ["major_database", "employment_database", "knowledge_base"],
  postgraduate_planning: ["major_database", "employment_database", "knowledge_base"],
  risk_analysis: ["workspace_data", "admission_database", "enrollment_plan_database"],
  career_planning: ["workspace_data", "major_database", "employment_database"],
  general_follow_up: ["workspace_data", "knowledge_base"]
};

export function getIntentDefinition(key) {
  return INTENT_DEFINITIONS.find((item) => item.key === key) || null;
}
