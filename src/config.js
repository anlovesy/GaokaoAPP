export const provinceOptions = [
  "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江", "上海",
  "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南",
  "广东", "广西", "海南", "重庆", "四川", "贵州", "云南", "西藏", "陕西",
  "甘肃", "青海", "宁夏", "新疆"
];

export const trackOptions = ["物理", "历史"];

export const interestOptions = [
  { id: "technology", label: "技术 / 编程" },
  { id: "medicine", label: "医学 / 健康" },
  { id: "finance", label: "金融 / 商业" },
  { id: "law", label: "法律 / 公共治理" },
  { id: "engineering", label: "工程 / 制造" },
  { id: "education", label: "教育 / 心理" },
  { id: "media", label: "传媒 / 表达" },
  { id: "design", label: "设计 / 创意" },
  { id: "language", label: "语言 / 国际化" },
  { id: "agriculture", label: "农学 / 环境" }
];

export const filterOptions = [
  {
    key: "schoolTags",
    label: "院校偏好",
    options: [
      { value: "985", label: "优先 985" },
      { value: "211", label: "优先 211" },
      { value: "doubleFirstClass", label: "优先双一流" },
      { value: "provincialCapital", label: "优先省会城市" },
      { value: "tier1", label: "优先一线 / 新一线" }
    ]
  },
  {
    key: "majorNeeds",
    label: "专业偏好",
    options: [
      { value: "stableEmployment", label: "重视就业稳定" },
      { value: "graduateFriendly", label: "重视读研深造" },
      { value: "hotMajors", label: "接受热门竞争专业" },
      { value: "coldMajors", label: "可接受冷门但稳妥专业" },
      { value: "noAdjustment", label: "尽量不服从调剂" }
    ]
  },
  {
    key: "subjectConstraints",
    label: "现实约束",
    options: [
      { value: "outOfProvinceOk", label: "接受省外" },
      { value: "cityPriority", label: "城市优先" },
      { value: "majorPriority", label: "专业优先" },
      { value: "publicOnly", label: "优先公办" }
    ]
  }
];

export const defaultFormState = {
  province: "广东",
  track: "物理",
  score: 612,
  rank: 18818,
  risk: "balanced",
  aiProvider: "auto",
  preferredCities: "广州、深圳",
  careerPlan: "希望进入人工智能、数据分析或互联网产品方向，兼顾就业质量和大城市发展机会",
  notes: "主要服务广东考生，希望优先考虑广东和大湾区院校，也接受省外强校",
  maxTuition: 12000,
  interests: ["technology", "finance"],
  schoolTags: ["doubleFirstClass"],
  majorNeeds: ["stableEmployment", "graduateFriendly"],
  subjectConstraints: ["outOfProvinceOk", "majorPriority"]
};
