export const provinceOptions = [
  "北京",
  "天津",
  "河北",
  "山西",
  "内蒙古",
  "辽宁",
  "吉林",
  "黑龙江",
  "上海",
  "江苏",
  "浙江",
  "安徽",
  "福建",
  "江西",
  "山东",
  "河南",
  "湖北",
  "湖南",
  "广东",
  "广西",
  "海南",
  "重庆",
  "四川",
  "贵州",
  "云南",
  "西藏",
  "陕西",
  "甘肃",
  "青海",
  "宁夏",
  "新疆"
];

export const provinceExamModeMap = {
  北京: "3+3",
  天津: "3+3",
  上海: "3+3",
  浙江: "3+3",
  山东: "3+3",
  海南: "3+3",
  河北: "3+1+2",
  辽宁: "3+1+2",
  江苏: "3+1+2",
  福建: "3+1+2",
  湖北: "3+1+2",
  湖南: "3+1+2",
  广东: "3+1+2",
  重庆: "3+1+2",
  黑龙江: "3+1+2",
  吉林: "3+1+2",
  安徽: "3+1+2",
  江西: "3+1+2",
  广西: "3+1+2",
  贵州: "3+1+2",
  甘肃: "3+1+2"
};

export const trackOptions = ["物理", "历史"];

export const subjectOptions = ["化学", "生物", "政治", "地理"];

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

export const personalityTagOptions = [
  { value: "research", label: "喜欢分析研究" },
  { value: "handsOn", label: "动手能力强" },
  { value: "communication", label: "善于表达沟通" },
  { value: "care", label: "愿意帮助他人" },
  { value: "leadership", label: "希望带团队" },
  { value: "discipline", label: "做事细致稳定" },
  { value: "creative", label: "创意表达强" },
  { value: "resilient", label: "能接受高强度学习" }
];

export const candidateTypeOptions = [
  { value: "general", label: "普通考生" },
  { value: "rural", label: "农村 / 县域考生" },
  { value: "special", label: "可能有专项计划资格" },
  { value: "repeat", label: "复读 / 往届经历" }
];

export const specialPlanOptions = [
  { value: "nationalSpecial", label: "关注国家专项" },
  { value: "localSpecial", label: "关注地方专项" },
  { value: "collegeSpecial", label: "关注高校专项" },
  { value: "teacherProgram", label: "关注公费师范 / 定向" }
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
    label: "专业策略",
    options: [
      { value: "stableEmployment", label: "重视就业稳定" },
      { value: "graduateFriendly", label: "重视读研深造" },
      { value: "hotMajors", label: "接受热门竞争专业" },
      { value: "coldMajors", label: "可接受冷门潜力专业" },
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

export const quickQuestionTemplates = [
  "老师你直接说，我这个分数在广东到底该冲还是该稳？",
  "如果我只想留广东，是不是就得接受学校层次往下放？",
  "你别安慰我，直接告诉我这个专业以后好不好找工作。",
  "我不想被调剂到冷门专业，那我现在最该防什么坑？"
];

export const advisorModeOptions = [
  {
    value: "xuefeng",
    label: "老师直说模式",
    shortLabel: "直说模式",
    badge: "老师模式",
    tone: "像一位懂高考规则、敢说真话的老师，先给判断，再讲道理。",
    opening:
      "我先声明一句：下面这个模式，是基于公开表达风格整理出来的老师式顾问，不是本人原声复刻。但你放心，我会按真实填报的逻辑，直接跟你把利弊讲透。"
  },
  {
    value: "gentle",
    label: "耐心陪聊模式",
    shortLabel: "陪聊模式",
    badge: "陪伴模式",
    tone: "更温和一点，适合边聊边梳理，不会一上来给太强压迫感。",
    opening:
      "我会像一个耐心的志愿顾问陪你慢慢拆问题，先帮你厘清信息，再一起把学校、专业和风险顺下来。"
  }
];

export const advisorQuickPrompts = {
  xuefeng: [
    "老师你直接说，我现在是该保学校，还是保专业？",
    "家里想让我学稳的，我自己想冲热门，这种情况你怎么劝？",
    "如果只留广州深圳，我这分数到底要牺牲什么？",
    "你别给我空话，就说这个专业四年后值不值得读。"
  ],
  gentle: [
    "你先帮我梳理一下，我最该优先考虑学校、专业还是城市？",
    "如果我更重视就业稳定，方案里哪些学校和专业更适合我？",
    "能不能温和一点帮我讲讲，为什么这些学校被放进冲稳保？",
    "如果我担心滑档和调剂，接下来最该检查哪几项？"
  ]
};

export const defaultFormState = {
  province: "广东",
  examMode: "3+1+2",
  track: "物理",
  selectedSubjects: ["化学", "生物"],
  score: 612,
  rank: 18818,
  risk: "balanced",
  aiProvider: "auto",
  preferredCities: "广州、深圳、杭州",
  careerPlan: "希望进入人工智能、数据分析、互联网产品或高端制造方向，兼顾就业质量和大城市发展机会",
  notes: "主要服务广东考生，希望优先考虑广东和大湾区院校，也接受省外强校",
  maxTuition: 12000,
  englishScore: 128,
  candidateType: "general",
  specialPlans: ["localSpecial"],
  healthNotes: "",
  willingAdjustment: true,
  interests: ["technology", "engineering"],
  personalityTags: ["research", "handsOn", "resilient"],
  schoolTags: ["doubleFirstClass"],
  majorNeeds: ["stableEmployment", "graduateFriendly"],
  subjectConstraints: ["outOfProvinceOk", "majorPriority"]
};
