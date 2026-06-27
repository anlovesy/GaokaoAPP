export const provinceDifficultyFactor = {
  北京: 0.76,
  天津: 0.82,
  河北: 1.12,
  山西: 1.02,
  内蒙古: 0.96,
  辽宁: 0.98,
  吉林: 0.92,
  黑龙江: 0.94,
  上海: 0.72,
  江苏: 0.9,
  浙江: 0.93,
  安徽: 1.05,
  福建: 0.97,
  江西: 1.04,
  山东: 1.11,
  河南: 1.2,
  湖北: 1.01,
  湖南: 1.03,
  广东: 1.07,
  广西: 0.99,
  海南: 0.84,
  重庆: 0.95,
  四川: 1.08,
  贵州: 0.97,
  云南: 0.98,
  西藏: 0.62,
  陕西: 1,
  甘肃: 0.94,
  青海: 0.68,
  宁夏: 0.74,
  新疆: 0.8
};

export const riskConfig = {
  aggressive: {
    rush: 1.28,
    steady: 1.08,
    safe: 0.88,
    label: "冲刺型",
    strategy: "冲刺志愿可放大，但仍应留足稳和保底组合，避免全部压热门院校。"
  },
  balanced: {
    rush: 1.18,
    steady: 1,
    safe: 0.8,
    label: "均衡型",
    strategy: "建议采用相对均衡的冲稳保比例，兼顾学校层次和录取把握。"
  },
  conservative: {
    rush: 1.08,
    steady: 0.95,
    safe: 0.72,
    label: "保守型",
    strategy: "优先保证录取确定性，冲刺院校少量尝试，主力放在稳妥院校。"
  }
};

export const interestCatalog = [
  { id: "technology", label: "技术 / 编程", tags: ["技术", "计算机", "人工智能", "软件", "数据"] },
  { id: "medicine", label: "医学 / 健康", tags: ["医学", "临床", "药学", "护理", "健康"] },
  { id: "finance", label: "金融 / 商业", tags: ["金融", "经济", "会计", "商业", "管理"] },
  { id: "law", label: "法律 / 公共治理", tags: ["法律", "法学", "政治", "治理", "公务"] },
  { id: "engineering", label: "工程 / 制造", tags: ["工程", "机械", "自动化", "材料", "制造"] },
  { id: "education", label: "教育 / 心理", tags: ["教育", "师范", "心理", "成长"] },
  { id: "media", label: "传媒 / 表达", tags: ["传媒", "新闻", "传播", "内容", "表达"] },
  { id: "design", label: "设计 / 创意", tags: ["设计", "建筑", "视觉", "产品", "创意"] },
  { id: "language", label: "语言 / 国际化", tags: ["语言", "英语", "翻译", "国际", "外语"] },
  { id: "agriculture", label: "农学 / 环境", tags: ["农学", "生态", "环境", "食品", "生物"] }
];

export const majorDirections = [
  {
    name: "计算机科学与技术",
    category: "technology",
    keywords: ["技术", "编程", "计算机", "软件", "人工智能", "开发", "算法"],
    careers: ["软件工程师", "算法工程师", "AI产品经理", "技术管理"],
    description: "适合对编程、智能系统、互联网产品和高成长行业感兴趣的学生。"
  },
  {
    name: "人工智能",
    category: "technology",
    keywords: ["人工智能", "数据", "算法", "模型", "技术", "编程"],
    careers: ["算法工程师", "AI研发", "智能制造", "数据科学家"],
    description: "适合对机器学习、自动化决策和前沿科技有长期兴趣的学生。"
  },
  {
    name: "软件工程",
    category: "technology",
    keywords: ["软件", "开发", "技术", "工程", "互联网", "产品"],
    careers: ["软件工程师", "测试开发", "技术项目经理", "产品经理"],
    description: "偏工程落地和开发实践，适合就业导向明确的学生。"
  },
  {
    name: "数据科学与大数据技术",
    category: "technology",
    keywords: ["数据", "分析", "统计", "算法", "人工智能"],
    careers: ["数据分析师", "数据工程师", "商业分析师"],
    description: "适合对数据洞察和技术应用都感兴趣的学生。"
  },
  {
    name: "临床医学",
    category: "medicine",
    keywords: ["医学", "健康", "医院", "医生", "临床"],
    careers: ["医生", "科研医生", "公共卫生管理者"],
    description: "培养周期较长，但专业壁垒和社会需求都很高。"
  },
  {
    name: "口腔医学",
    category: "medicine",
    keywords: ["口腔", "医学", "健康", "医疗"],
    careers: ["口腔医生", "医疗机构管理", "专科诊疗"],
    description: "专业性强、就业质量稳定，适合追求长期职业确定性的学生。"
  },
  {
    name: "药学",
    category: "medicine",
    keywords: ["医学", "药学", "健康", "生物"],
    careers: ["药物研发", "医药代表", "临床药师"],
    description: "连接医疗与产业，适合对健康科学和研发转化都感兴趣的学生。"
  },
  {
    name: "金融学",
    category: "finance",
    keywords: ["金融", "经济", "投资", "商业", "资本"],
    careers: ["金融分析师", "投研", "风控", "财富管理"],
    description: "适合对数字、市场和商业逻辑敏感的学生。"
  },
  {
    name: "会计学",
    category: "finance",
    keywords: ["会计", "商业", "管理", "财务"],
    careers: ["财务经理", "审计", "税务顾问"],
    description: "职业路径清晰，适合重视稳定与可考证成长路线的学生。"
  },
  {
    name: "法学",
    category: "law",
    keywords: ["法律", "法学", "治理", "公务", "政策"],
    careers: ["律师", "公务员", "法务", "检法系统"],
    description: "适合逻辑表达强、希望进入法律或公共治理体系的学生。"
  },
  {
    name: "行政管理",
    category: "law",
    keywords: ["公共治理", "管理", "公务", "政策", "组织"],
    careers: ["公务员", "事业单位管理", "政策研究"],
    description: "适合看重体制内发展、组织协调和公共事务参与的学生。"
  },
  {
    name: "机械工程",
    category: "engineering",
    keywords: ["工程", "机械", "制造", "自动化"],
    careers: ["制造工程师", "设备研发", "工业项目管理"],
    description: "适合偏理工、喜欢动手与产业场景的学生。"
  },
  {
    name: "电气工程及其自动化",
    category: "engineering",
    keywords: ["电气", "自动化", "工程", "能源", "控制"],
    careers: ["电力系统工程师", "自动化工程师", "工业控制"],
    description: "就业行业广，适合追求工程硬技能和稳定就业的学生。"
  },
  {
    name: "自动化",
    category: "engineering",
    keywords: ["自动化", "控制", "智能制造", "工程"],
    careers: ["自动化工程师", "工业控制工程师", "智能制造工程师"],
    description: "适合喜欢工程控制和智能制造方向的学生。"
  },
  {
    name: "建筑学",
    category: "design",
    keywords: ["建筑", "设计", "空间", "创意"],
    careers: ["建筑设计师", "城市规划", "空间策划"],
    description: "适合审美、创意思维和长期项目投入能力较强的学生。"
  },
  {
    name: "新闻传播学",
    category: "media",
    keywords: ["传媒", "新闻", "传播", "表达", "内容"],
    careers: ["媒体编辑", "品牌传播", "内容策划"],
    description: "适合表达欲强、擅长沟通和内容生产的学生。"
  },
  {
    name: "教育学",
    category: "education",
    keywords: ["教育", "师范", "成长", "教学"],
    careers: ["教师", "教研", "教育产品", "学校管理"],
    description: "适合有耐心、愿意长期投入教育行业的学生。"
  },
  {
    name: "心理学",
    category: "education",
    keywords: ["心理", "教育", "成长", "咨询"],
    careers: ["心理咨询", "用户研究", "组织发展"],
    description: "适合关注人、行为和成长发展的学生。"
  },
  {
    name: "英语",
    category: "language",
    keywords: ["语言", "英语", "外语", "国际"],
    careers: ["翻译", "国际商务", "外贸", "国际教育"],
    description: "适合希望进入国际化岗位、语言能力较强的学生。"
  },
  {
    name: "食品科学与工程",
    category: "agriculture",
    keywords: ["食品", "农学", "工程", "健康"],
    careers: ["食品研发", "质量管理", "供应链管理"],
    description: "适合对食品工业、健康消费和制造研发感兴趣的学生。"
  },
  {
    name: "环境工程",
    category: "agriculture",
    keywords: ["环境", "生态", "工程", "可持续"],
    careers: ["环境工程师", "环保咨询", "绿色产业"],
    description: "适合关注可持续发展和工程治理场景的学生。"
  }
];

export const universityCatalog = [
  {
    name: "清华大学",
    city: "北京",
    nature: "综合 / 顶尖",
    levelTags: ["985", "211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["technology", "engineering", "finance"],
    tuition: 5000,
    graduateRate: 98,
    employmentStability: 92,
    baseRank: 900,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", offset: 0, popularity: "hot" },
      { name: "人工智能", direction: "人工智能", offset: 120, popularity: "hot" },
      { name: "金融学", direction: "金融学", offset: 280, popularity: "hot" }
    ]
  },
  {
    name: "北京大学",
    city: "北京",
    nature: "综合 / 顶尖",
    levelTags: ["985", "211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["law", "medicine", "finance"],
    tuition: 5000,
    graduateRate: 97,
    employmentStability: 91,
    baseRank: 1100,
    majors: [
      { name: "法学", direction: "法学", offset: 120, popularity: "hot" },
      { name: "临床医学", direction: "临床医学", offset: 60, popularity: "hot" },
      { name: "金融学", direction: "金融学", offset: 210, popularity: "hot" }
    ]
  },
  {
    name: "复旦大学",
    city: "上海",
    nature: "综合 / 顶尖",
    levelTags: ["985", "211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["medicine", "finance", "media"],
    tuition: 6500,
    graduateRate: 96,
    employmentStability: 90,
    baseRank: 1800,
    majors: [
      { name: "临床医学", direction: "临床医学", offset: 0, popularity: "hot" },
      { name: "新闻传播学", direction: "新闻传播学", offset: 480, popularity: "hot" },
      { name: "金融学", direction: "金融学", offset: 210, popularity: "hot" }
    ]
  },
  {
    name: "上海交通大学",
    city: "上海",
    nature: "综合 / 顶尖",
    levelTags: ["985", "211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["technology", "engineering", "medicine"],
    tuition: 7000,
    graduateRate: 96,
    employmentStability: 91,
    baseRank: 1700,
    majors: [
      { name: "人工智能", direction: "人工智能", offset: 110, popularity: "hot" },
      { name: "临床医学", direction: "临床医学", offset: 90, popularity: "hot" },
      { name: "机械工程", direction: "机械工程", offset: 420, popularity: "stable" }
    ]
  },
  {
    name: "浙江大学",
    city: "杭州",
    nature: "综合 / 顶尖",
    levelTags: ["985", "211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["technology", "engineering", "agriculture"],
    tuition: 6000,
    graduateRate: 95,
    employmentStability: 89,
    baseRank: 2400,
    majors: [
      { name: "软件工程", direction: "软件工程", offset: 180, popularity: "hot" },
      {
        name: "电气工程及其自动化",
        direction: "电气工程及其自动化",
        offset: 300,
        popularity: "stable"
      },
      { name: "环境工程", direction: "环境工程", offset: 880, popularity: "stable" }
    ]
  },
  {
    name: "南京大学",
    city: "南京",
    nature: "综合 / 顶尖",
    levelTags: ["985", "211", "doubleFirstClass", "provincialCapital", "publicOnly"],
    tags: ["technology", "law", "language"],
    tuition: 5720,
    graduateRate: 95,
    employmentStability: 88,
    baseRank: 3800,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", offset: 220, popularity: "hot" },
      { name: "法学", direction: "法学", offset: 440, popularity: "hot" },
      { name: "英语", direction: "英语", offset: 920, popularity: "stable" }
    ]
  },
  {
    name: "武汉大学",
    city: "武汉",
    nature: "综合 / 头部",
    levelTags: ["985", "211", "doubleFirstClass", "provincialCapital", "publicOnly"],
    tags: ["law", "technology", "media"],
    tuition: 5850,
    graduateRate: 92,
    employmentStability: 86,
    baseRank: 6200,
    majors: [
      { name: "法学", direction: "法学", offset: 260, popularity: "hot" },
      { name: "软件工程", direction: "软件工程", offset: 360, popularity: "hot" },
      { name: "新闻传播学", direction: "新闻传播学", offset: 820, popularity: "stable" }
    ]
  },
  {
    name: "华中科技大学",
    city: "武汉",
    nature: "工科 / 头部",
    levelTags: ["985", "211", "doubleFirstClass", "provincialCapital", "publicOnly"],
    tags: ["technology", "engineering", "medicine"],
    tuition: 5850,
    graduateRate: 92,
    employmentStability: 88,
    baseRank: 6900,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", offset: 240, popularity: "hot" },
      { name: "机械工程", direction: "机械工程", offset: 520, popularity: "stable" },
      { name: "临床医学", direction: "临床医学", offset: 430, popularity: "hot" }
    ]
  },
  {
    name: "中山大学",
    city: "广州",
    nature: "综合 / 头部",
    levelTags: ["985", "211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["medicine", "law", "finance"],
    tuition: 6060,
    graduateRate: 91,
    employmentStability: 88,
    baseRank: 7600,
    majors: [
      { name: "临床医学", direction: "临床医学", offset: 260, popularity: "hot" },
      { name: "法学", direction: "法学", offset: 500, popularity: "hot" },
      { name: "会计学", direction: "会计学", offset: 940, popularity: "stable" }
    ]
  },
  {
    name: "西安交通大学",
    city: "西安",
    nature: "工科 / 头部",
    levelTags: ["985", "211", "doubleFirstClass", "provincialCapital", "publicOnly"],
    tags: ["engineering", "technology", "medicine"],
    tuition: 6600,
    graduateRate: 91,
    employmentStability: 88,
    baseRank: 8300,
    majors: [
      {
        name: "电气工程及其自动化",
        direction: "电气工程及其自动化",
        offset: 220,
        popularity: "stable"
      },
      { name: "人工智能", direction: "人工智能", offset: 420, popularity: "hot" },
      { name: "临床医学", direction: "临床医学", offset: 560, popularity: "hot" }
    ]
  },
  {
    name: "四川大学",
    city: "成都",
    nature: "综合 / 头部",
    levelTags: ["985", "211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["medicine", "law", "language"],
    tuition: 6000,
    graduateRate: 90,
    employmentStability: 86,
    baseRank: 10500,
    majors: [
      { name: "口腔医学", direction: "口腔医学", offset: 180, popularity: "hot" },
      { name: "法学", direction: "法学", offset: 580, popularity: "hot" },
      { name: "英语", direction: "英语", offset: 1180, popularity: "stable" }
    ]
  },
  {
    name: "电子科技大学",
    city: "成都",
    nature: "电子信息 / 强势",
    levelTags: ["985", "211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["technology", "engineering"],
    tuition: 6500,
    graduateRate: 90,
    employmentStability: 90,
    baseRank: 9100,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", offset: 200, popularity: "hot" },
      { name: "人工智能", direction: "人工智能", offset: 260, popularity: "hot" },
      { name: "软件工程", direction: "软件工程", offset: 430, popularity: "hot" }
    ]
  },
  {
    name: "北京师范大学",
    city: "北京",
    nature: "师范 / 顶尖",
    levelTags: ["985", "211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["education", "psychology", "law"],
    tuition: 5400,
    graduateRate: 91,
    employmentStability: 90,
    baseRank: 9800,
    majors: [
      { name: "教育学", direction: "教育学", offset: 140, popularity: "stable" },
      { name: "心理学", direction: "心理学", offset: 340, popularity: "stable" },
      { name: "法学", direction: "法学", offset: 860, popularity: "hot" }
    ]
  },
  {
    name: "华东师范大学",
    city: "上海",
    nature: "师范 / 强势",
    levelTags: ["985", "211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["education", "media", "technology"],
    tuition: 6500,
    graduateRate: 90,
    employmentStability: 88,
    baseRank: 11800,
    majors: [
      { name: "教育学", direction: "教育学", offset: 120, popularity: "stable" },
      { name: "心理学", direction: "心理学", offset: 260, popularity: "stable" },
      { name: "软件工程", direction: "软件工程", offset: 980, popularity: "hot" }
    ]
  },
  {
    name: "中央财经大学",
    city: "北京",
    nature: "财经 / 强势",
    levelTags: ["211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["finance", "law"],
    tuition: 5000,
    graduateRate: 89,
    employmentStability: 89,
    baseRank: 13400,
    majors: [
      { name: "金融学", direction: "金融学", offset: 0, popularity: "hot" },
      { name: "会计学", direction: "会计学", offset: 260, popularity: "stable" },
      { name: "法学", direction: "法学", offset: 690, popularity: "stable" }
    ]
  },
  {
    name: "上海财经大学",
    city: "上海",
    nature: "财经 / 强势",
    levelTags: ["211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["finance", "law", "language"],
    tuition: 6500,
    graduateRate: 89,
    employmentStability: 89,
    baseRank: 12100,
    majors: [
      { name: "金融学", direction: "金融学", offset: 0, popularity: "hot" },
      { name: "会计学", direction: "会计学", offset: 180, popularity: "stable" },
      { name: "英语", direction: "英语", offset: 1020, popularity: "stable" }
    ]
  },
  {
    name: "中国政法大学",
    city: "北京",
    nature: "政法 / 强势",
    levelTags: ["211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["law", "public"],
    tuition: 5000,
    graduateRate: 88,
    employmentStability: 87,
    baseRank: 16200,
    majors: [
      { name: "法学", direction: "法学", offset: 0, popularity: "hot" },
      { name: "行政管理", direction: "行政管理", offset: 360, popularity: "stable" },
      { name: "英语", direction: "英语", offset: 1160, popularity: "stable" }
    ]
  },
  {
    name: "南京航空航天大学",
    city: "南京",
    nature: "工科 / 优势",
    levelTags: ["211", "doubleFirstClass", "provincialCapital", "publicOnly"],
    tags: ["engineering", "technology"],
    tuition: 6380,
    graduateRate: 87,
    employmentStability: 88,
    baseRank: 17500,
    majors: [
      { name: "机械工程", direction: "机械工程", offset: 0, popularity: "stable" },
      {
        name: "电气工程及其自动化",
        direction: "电气工程及其自动化",
        offset: 260,
        popularity: "stable"
      },
      { name: "人工智能", direction: "人工智能", offset: 720, popularity: "hot" }
    ]
  },
  {
    name: "华南理工大学",
    city: "广州",
    nature: "工科 / 优势",
    levelTags: ["985", "211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["technology", "engineering", "design"],
    tuition: 6850,
    graduateRate: 88,
    employmentStability: 87,
    baseRank: 18900,
    majors: [
      { name: "软件工程", direction: "软件工程", offset: 140, popularity: "hot" },
      { name: "机械工程", direction: "机械工程", offset: 360, popularity: "stable" },
      { name: "建筑学", direction: "建筑学", offset: 880, popularity: "stable" }
    ]
  },
  {
    name: "苏州大学",
    city: "苏州",
    nature: "综合 / 区域强校",
    levelTags: ["211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["medicine", "design", "law"],
    tuition: 5800,
    graduateRate: 84,
    employmentStability: 83,
    baseRank: 25500,
    majors: [
      { name: "药学", direction: "药学", offset: 240, popularity: "stable" },
      { name: "法学", direction: "法学", offset: 560, popularity: "stable" },
      { name: "建筑学", direction: "建筑学", offset: 1180, popularity: "stable" }
    ]
  },
  {
    name: "西南财经大学",
    city: "成都",
    nature: "财经 / 优势",
    levelTags: ["211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["finance", "law"],
    tuition: 5760,
    graduateRate: 85,
    employmentStability: 86,
    baseRank: 22800,
    majors: [
      { name: "金融学", direction: "金融学", offset: 0, popularity: "hot" },
      { name: "会计学", direction: "会计学", offset: 220, popularity: "stable" },
      { name: "行政管理", direction: "行政管理", offset: 1080, popularity: "stable" }
    ]
  },
  {
    name: "中国农业大学",
    city: "北京",
    nature: "农学 / 顶尖",
    levelTags: ["985", "211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["agriculture", "technology", "environment"],
    tuition: 5000,
    graduateRate: 86,
    employmentStability: 86,
    baseRank: 20500,
    majors: [
      { name: "食品科学与工程", direction: "食品科学与工程", offset: 100, popularity: "stable" },
      { name: "环境工程", direction: "环境工程", offset: 220, popularity: "stable" },
      { name: "人工智能", direction: "人工智能", offset: 980, popularity: "hot" }
    ]
  },
  {
    name: "江南大学",
    city: "无锡",
    nature: "轻工 / 优势",
    levelTags: ["211", "doubleFirstClass", "publicOnly"],
    tags: ["agriculture", "design", "engineering"],
    tuition: 5800,
    graduateRate: 83,
    employmentStability: 84,
    baseRank: 28600,
    majors: [
      { name: "食品科学与工程", direction: "食品科学与工程", offset: 0, popularity: "stable" },
      { name: "设计学类", direction: "建筑学", offset: 420, popularity: "stable" },
      { name: "环境工程", direction: "环境工程", offset: 920, popularity: "stable" }
    ]
  },
  {
    name: "深圳大学",
    city: "深圳",
    nature: "综合 / 新兴热门",
    levelTags: ["tier1", "publicOnly"],
    tags: ["technology", "finance", "media"],
    tuition: 6200,
    graduateRate: 80,
    employmentStability: 84,
    baseRank: 31200,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", offset: 120, popularity: "hot" },
      { name: "金融学", direction: "金融学", offset: 440, popularity: "hot" },
      { name: "新闻传播学", direction: "新闻传播学", offset: 860, popularity: "stable" }
    ]
  },
  {
    name: "杭州电子科技大学",
    city: "杭州",
    nature: "电子信息 / 优势",
    levelTags: ["tier1", "publicOnly"],
    tags: ["technology", "engineering"],
    tuition: 6000,
    graduateRate: 80,
    employmentStability: 85,
    baseRank: 35200,
    majors: [
      { name: "软件工程", direction: "软件工程", offset: 0, popularity: "hot" },
      { name: "人工智能", direction: "人工智能", offset: 180, popularity: "hot" },
      {
        name: "电气工程及其自动化",
        direction: "电气工程及其自动化",
        offset: 760,
        popularity: "stable"
      }
    ]
  },
  {
    name: "上海外国语大学",
    city: "上海",
    nature: "语言 / 优势",
    levelTags: ["211", "doubleFirstClass", "tier1", "publicOnly"],
    tags: ["language", "media", "law"],
    tuition: 6500,
    graduateRate: 84,
    employmentStability: 82,
    baseRank: 33800,
    majors: [
      { name: "英语", direction: "英语", offset: 0, popularity: "stable" },
      { name: "新闻传播学", direction: "新闻传播学", offset: 360, popularity: "stable" },
      { name: "法学", direction: "法学", offset: 1040, popularity: "stable" }
    ]
  },
  {
    name: "华中农业大学",
    city: "武汉",
    nature: "农学 / 优势",
    levelTags: ["211", "doubleFirstClass", "provincialCapital", "publicOnly"],
    tags: ["agriculture", "environment", "medicine"],
    tuition: 5850,
    graduateRate: 81,
    employmentStability: 83,
    baseRank: 40200,
    majors: [
      { name: "食品科学与工程", direction: "食品科学与工程", offset: 0, popularity: "stable" },
      { name: "环境工程", direction: "环境工程", offset: 260, popularity: "stable" },
      { name: "药学", direction: "药学", offset: 1180, popularity: "stable" }
    ]
  },
  {
    name: "宁波大学",
    city: "宁波",
    nature: "综合 / 区域热门",
    levelTags: ["doubleFirstClass", "publicOnly", "tier1"],
    tags: ["technology", "finance", "language"],
    tuition: 6000,
    graduateRate: 76,
    employmentStability: 81,
    baseRank: 42800,
    majors: [
      { name: "计算机科学与技术", direction: "计算机科学与技术", offset: 180, popularity: "hot" },
      { name: "金融学", direction: "金融学", offset: 420, popularity: "stable" },
      { name: "英语", direction: "英语", offset: 920, popularity: "stable" }
    ]
  },
  {
    name: "长沙理工大学",
    city: "长沙",
    nature: "工科 / 区域优势",
    levelTags: ["provincialCapital", "publicOnly"],
    tags: ["engineering", "technology"],
    tuition: 5900,
    graduateRate: 74,
    employmentStability: 82,
    baseRank: 51200,
    majors: [
      {
        name: "电气工程及其自动化",
        direction: "电气工程及其自动化",
        offset: 0,
        popularity: "stable"
      },
      { name: "自动化", direction: "自动化", offset: 260, popularity: "stable" },
      { name: "计算机科学与技术", direction: "计算机科学与技术", offset: 580, popularity: "hot" }
    ]
  },
  {
    name: "温州医科大学",
    city: "温州",
    nature: "医学 / 区域强校",
    levelTags: ["publicOnly"],
    tags: ["medicine"],
    tuition: 6200,
    graduateRate: 78,
    employmentStability: 87,
    baseRank: 46200,
    majors: [
      { name: "临床医学", direction: "临床医学", offset: 220, popularity: "hot" },
      { name: "口腔医学", direction: "口腔医学", offset: 340, popularity: "hot" },
      { name: "药学", direction: "药学", offset: 780, popularity: "stable" }
    ]
  },
  {
    name: "广东外语外贸大学",
    city: "广州",
    nature: "语言 / 财经特色",
    levelTags: ["tier1", "publicOnly"],
    tags: ["language", "finance", "media"],
    tuition: 6060,
    graduateRate: 77,
    employmentStability: 80,
    baseRank: 48800,
    majors: [
      { name: "英语", direction: "英语", offset: 0, popularity: "stable" },
      { name: "新闻传播学", direction: "新闻传播学", offset: 360, popularity: "stable" },
      { name: "金融学", direction: "金融学", offset: 620, popularity: "stable" }
    ]
  },
  {
    name: "南京信息工程大学",
    city: "南京",
    nature: "工科 / 行业特色",
    levelTags: ["doubleFirstClass", "provincialCapital", "publicOnly"],
    tags: ["technology", "engineering"],
    tuition: 5800,
    graduateRate: 79,
    employmentStability: 82,
    baseRank: 44600,
    majors: [
      {
        name: "数据科学与大数据技术",
        direction: "数据科学与大数据技术",
        offset: 220,
        popularity: "hot"
      },
      { name: "软件工程", direction: "软件工程", offset: 440, popularity: "hot" },
      { name: "环境工程", direction: "环境工程", offset: 920, popularity: "stable" }
    ]
  }
];
