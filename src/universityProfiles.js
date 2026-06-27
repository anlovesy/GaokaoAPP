function buildCommonsImage(fileName) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
}

const UNIVERSITY_RESOURCE_LINKS = {
  清华大学: {
    overviewUrl: "https://www.tsinghua.edu.cn/",
    admissionsUrl: "https://www.admissions.tsinghua.edu.cn/"
  },
  北京大学: {
    overviewUrl: "https://www.pku.edu.cn/",
    admissionsUrl: "https://bkzs.pku.edu.cn/"
  },
  复旦大学: {
    overviewUrl: "https://www.fudan.edu.cn/"
  },
  武汉大学: {
    overviewUrl: "https://www.whu.edu.cn/"
  },
  厦门大学: {
    overviewUrl: "https://www.xmu.edu.cn/"
  },
  中山大学: {
    overviewUrl: "https://www.sysu.edu.cn/"
  },
  华南理工大学: {
    overviewUrl: "https://www.scut.edu.cn/"
  },
  暨南大学: {
    overviewUrl: "https://www.jnu.edu.cn/"
  },
  华南师范大学: {
    overviewUrl: "https://www.scnu.edu.cn/"
  },
  深圳大学: {
    overviewUrl: "https://www.szu.edu.cn/"
  },
  南方科技大学: {
    overviewUrl: "https://www.sustech.edu.cn/",
    admissionsUrl: "https://admissions.sustech.edu.cn/"
  },
  广东工业大学: {
    overviewUrl: "https://www.gdut.edu.cn/"
  }
};

const PROFILE_DEFAULTS = {
  schoolType: "综合类高校",
  level: "区域重点平台",
  keyMajors: [],
  employmentDirections: [],
  suitableFor: [],
  campusNotes: [],
  brochureNotes: []
};

const UNIVERSITY_IMAGE_ALIASES = universityImageCatalog;

const UNIVERSITY_FALLBACK_IMAGE_POOL = universityImageCatalog.map(
  (entry) => `/universities/${entry.slug}/cover.jpg`
);

function createProfile(profile) {
  return {
    ...PROFILE_DEFAULTS,
    ...profile
  };
}

function buildUniversityVisuals(slug) {
  const cover = `/universities/${slug}/cover.jpg`;

  return {
    assetSlug: slug,
    cover,
    image: cover,
    photo: cover,
    banner: cover,
    campusImage: cover,
    thumbnail: cover,
    gallery: [cover]
  };
}

function pickFallbackUniversityImage(universityName) {
  const normalizedName = normalizeUniversityName(universityName);
  const mappedSlug = findUniversityAssetSlug(universityName);

  if (mappedSlug) {
    return `/universities/${mappedSlug}/cover.jpg`;
  }

  if (!normalizedName) {
    return UNIVERSITY_FALLBACK_IMAGE_POOL[0];
  }

  return `https://picsum.photos/seed/${encodeURIComponent(`gaokao-${normalizedName}`)}/1600/900`;
}

function buildFallbackUniversityVisuals(universityName) {
  const cover = pickFallbackUniversityImage(universityName);

  return {
    assetSlug: "fallback",
    cover,
    image: cover,
    photo: cover,
    banner: cover,
    campusImage: cover,
    thumbnail: cover,
    gallery: [cover]
  };
}

function pickFirstImage(...candidates) {
  return candidates.find((value) => typeof value === "string" && value.trim());
}

function findUniversityAssetSlug(universityName) {
  const normalizedName = normalizeUniversityName(universityName);

  if (!normalizedName) {
    return "";
  }

  const matchedEntry = UNIVERSITY_IMAGE_ALIASES.find((entry) =>
    entry.names.some((alias) => {
      const normalizedAlias = normalizeUniversityName(alias);
      return normalizedName.includes(normalizedAlias) || normalizedAlias.includes(normalizedName);
    })
  );

  return matchedEntry?.slug || "";
}

export const universityProfiles = [
  createProfile({
    name: "清华大学",
    aliases: ["清华", "清华大学"],
    city: "北京",
    region: "华北",
    label: "工科与综合研究高地",
    schoolType: "研究型综合大学",
    level: "顶尖平台 / 高强度竞争环境",
    image: buildCommonsImage("3 Tsinghua.jpg"),
    ...buildUniversityVisuals("tsinghua"),
    overview:
      "清华大学以工科见长，同时在计算机、电子信息、建筑、经管和基础学科方向都有极强的平台能力，适合追求顶尖科研资源与高强度学习环境的考生。",
    highlights: ["工科顶级平台", "科研资源密集", "国际交换机会丰富"],
    keyMajors: ["计算机类", "电子信息类", "自动化类", "建筑类", "经管试验班"],
    employmentDirections: ["顶尖升学与科研院所", "互联网与硬科技研发", "国央企平台岗与全球化项目"],
    suitableFor: [
      "高分段且愿意接受高强度学习节奏的考生",
      "明确重视科研、实验室和学术平台的人",
      "对学校平台优先于城市舒适度更看重的家庭"
    ],
    campusNotes: [
      "不同院系和书院培养节奏差异明显，本科阶段资源极强，但竞争也会同步放大。",
      "如果目标是科研、保研、实验室和交换项目，学校平台会非常有优势。"
    ],
    brochureNotes: [
      "重点核查专业类分流、调剂口径与专项计划规则。",
      "强基计划、工科试验班等特殊培养项目要单独看招生简章。"
    ],
    admissionsNotes: [
      "适合成绩非常靠前、愿意接受高强度学习节奏的考生。",
      "理工类专业竞争非常激烈，建议重点核查专业组和调剂范围。",
      "当年招生简章、强基计划与专项政策需以学校官方发布为准。"
    ],
    officialHint: "可在学校本科招生网查看当年招生简章、专业目录和选考要求。"
  }),
  createProfile({
    name: "北京大学",
    aliases: ["北大", "北京大学"],
    city: "北京",
    region: "华北",
    label: "基础学科与人文社科重镇",
    schoolType: "研究型综合大学",
    level: "顶尖平台 / 学术氛围突出",
    image: buildCommonsImage("Peking University.jpg"),
    ...buildUniversityVisuals("peking"),
    overview:
      "北京大学在人文社科、基础理科、医学与前沿交叉学科方面具有极强影响力，适合对平台、学术氛围和综合成长空间要求很高的考生。",
    highlights: ["人文社科强势", "基础理科扎实", "综合平台高度突出"],
    keyMajors: ["元培试验班", "临床医学", "经济学类", "数学类", "法学"],
    employmentDirections: ["学术深造与交叉研究", "金融与咨询平台岗位", "公共治理与政策研究"],
    suitableFor: [
      "重视综合平台、学术氛围和长期发展空间的考生",
      "对文理兼修、跨学科路径有兴趣的人",
      "愿意为平台和资源承担更高志愿竞争的人"
    ],
    campusNotes: [
      "不同学院培养方式差异较大，医学、元培、理科基地等项目要分开看。",
      "学校氛围更偏自主探索型，适合主动性强的学生。"
    ],
    brochureNotes: [
      "重点核查医学类、元培、拔尖班等项目的独立规则。",
      "志愿顺序、是否接受调剂和专业类分流方式一定要逐条核对。"
    ],
    admissionsNotes: [
      "适合对综合平台和长期发展高度重视的考生。",
      "建议重点关注专业志愿顺序和是否接受调剂。",
      "医学类、元培等特殊培养项目的规则需单独核查。"
    ],
    officialHint: "志愿填报前建议对照当年本科招生章程与专业培养方案。"
  }),
  createProfile({
    name: "复旦大学",
    aliases: ["复旦", "复旦大学"],
    city: "上海",
    region: "华东",
    label: "综合学科与城市资源兼具",
    schoolType: "研究型综合大学",
    level: "头部综合平台 / 上海资源集中",
    image: buildCommonsImage("Fudan University - panoramio (7).jpg"),
    ...buildUniversityVisuals("fudan"),
    overview:
      "复旦大学在医学、新闻传播、经济管理、数学和基础理科等方向表现突出，适合希望兼顾学校平台、城市资源和专业深造的考生。",
    highlights: ["位于上海核心资源区", "文理医综合实力强", "升学与就业出口优质"],
    keyMajors: ["临床医学", "新闻传播学类", "经济学类", "数学类", "计算机类"],
    employmentDirections: [
      "上海头部企业与金融平台",
      "医学深造与医院体系",
      "海内外升学与研究型路径"
    ],
    suitableFor: [
      "看重学校层次，也看重城市资源密度的考生",
      "愿意在热门城市承受更高分数竞争的人",
      "对医科、新闻、经管、基础学科有明确偏好的学生"
    ],
    campusNotes: [
      "学校平台和城市吸引力叠加后，热门专业通常会显著抬高录取门槛。",
      "如果更重视实习、金融、媒体和国际交流资源，复旦的城市优势很明显。"
    ],
    brochureNotes: [
      "重点查看招生专业组设置与专业分流口径。",
      "医学、拔尖计划和热门经管方向要单独比较近年位次波动。"
    ],
    admissionsNotes: [
      "城市和学校平台吸引力强，报考热度通常较高。",
      "若志愿偏好集中在热门专业，需特别关注分差与位次波动。",
      "招生简章与专业分流规则要结合当年口径复核。"
    ],
    officialHint: "建议重点查看当年招生专业组设置与分流说明。"
  }),
  createProfile({
    name: "武汉大学",
    aliases: ["武大", "武汉大学"],
    city: "武汉",
    region: "华中",
    label: "综合名校与校园辨识度代表",
    schoolType: "综合类名校",
    level: "全国高认可度 / 综合平衡型平台",
    image: buildCommonsImage("Gate of the Wuhan University.jpg"),
    ...buildUniversityVisuals("whu"),
    overview:
      "武汉大学在测绘、法学、新闻传播、计算机、水利和基础学科等方向都有不错积累，校园环境与综合资源兼具，是兼顾平台和城市平衡度的热门学校。",
    highlights: ["综合名校", "校园辨识度高", "法学与测绘等方向强势"],
    keyMajors: ["测绘类", "法学", "计算机类", "新闻传播学类", "水利类"],
    employmentDirections: ["综合类升学与考公路径", "信息技术与工程岗位", "法学与传媒方向就业"],
    suitableFor: [
      "想兼顾学校层次、城市性价比和综合资源的考生",
      "对法学、测绘、计算机等方向有兴趣的人",
      "希望在热门学校中寻找相对平衡体验的学生"
    ],
    campusNotes: [
      "大类招生和热门专业之间的体验会有明显差异，转专业规则要提前看。",
      "学校综合氛围强，适合专业尚未完全锁死但重视平台的考生。"
    ],
    brochureNotes: [
      "重点核查培养校区、转专业政策和调剂范围。",
      "如果目标是热门法学或计算机方向，建议结合近三年位次复核。"
    ],
    admissionsNotes: [
      "适合看重学校层次、综合学科和城市性价比的考生。",
      "热门专业和大类招生之间通常存在明显热度差，需要单独甄别。",
      "建议核查转专业和调剂规则。"
    ],
    officialHint: "填报前建议同步查看学校本科招生网和湖北地区往年录取公告。"
  }),
  createProfile({
    name: "厦门大学",
    aliases: ["厦大", "厦门大学"],
    city: "厦门",
    region: "华东",
    label: "海滨校园与经管理工均衡型名校",
    schoolType: "综合类名校",
    level: "综合平台 / 环境吸引力强",
    image: buildCommonsImage("Xiamen University 07107-Xiamen (48814192891).jpg"),
    ...buildUniversityVisuals("xmu"),
    overview:
      "厦门大学在经济、会计、化学、海洋、新闻传播等方向长期有较强口碑，适合希望兼顾学校气质、地理环境和综合平台的考生。",
    highlights: ["校园环境知名", "经管与理科兼顾", "升学就业路径清晰"],
    keyMajors: ["会计学", "经济学类", "化学类", "海洋科学", "新闻传播学类"],
    employmentDirections: ["经管与财会岗位", "海洋与理科深造", "综合平台升学与选调路径"],
    suitableFor: [
      "兼顾学校气质、环境和专业认可度的考生",
      "对经管、会计、化学、海洋方向有兴趣的人",
      "更喜欢平衡型校园体验而非高压竞争氛围的学生"
    ],
    campusNotes: [
      "学校整体口碑强，但热门专业录取位次通常会高于学校平均线。",
      "适合看重校园环境、综合氛围和长期升学就业平衡的人。"
    ],
    brochureNotes: [
      "重点核查基地班、涉外项目和培养校区安排。",
      "若目标集中在热门经管类专业，建议结合位次波动单独评估。"
    ],
    admissionsNotes: [
      "学校整体认可度高，部分热门专业录取位次会明显抬升。",
      "适合专业接受度较高、希望兼顾城市环境的考生。",
      "涉外、基地班等特色项目建议单独核对招生章程。"
    ],
    officialHint: "招生简章、专业要求和转专业政策需以当年官方说明为准。"
  }),
  createProfile({
    name: "中山大学",
    aliases: ["中大", "中山大学"],
    city: "广州",
    region: "华南",
    label: "华南头部综合大学",
    schoolType: "研究型综合大学",
    level: "华南头部平台 / 湾区资源密集",
    image: buildCommonsImage("中山大学 - Sun Yat-sen University - 2015.12 - panoramio (1).jpg"),
    ...buildUniversityVisuals("sysu"),
    overview:
      "中山大学是华南地区综合实力极强的高校，在医学、管理、计算机、生态、生物和人文社科等方向都具备较强平台优势，适合重视学校层次和湾区资源的考生。",
    highlights: ["华南综合头部平台", "医学与理科基础强", "大湾区资源密集"],
    keyMajors: ["临床医学", "计算机类", "工商管理类", "生态学", "生物科学类"],
    employmentDirections: ["湾区头部企业与医院体系", "科研升学与医学深造", "选调与综合平台岗位"],
    suitableFor: [
      "看重学校层次和大湾区资源叠加效应的考生",
      "对医学、生物、计算机、管理方向有明显偏好的学生",
      "愿意为更高平台承担校区与专业组差异的人"
    ],
    campusNotes: [
      "不同校区培养地点和生活体验差异较大，报考前一定要看清培养校区。",
      "学校平台很强，但热门理工和医学方向的安全边界要单独核算。"
    ],
    brochureNotes: [
      "重点核查校区分布、专业组设置、转专业和分流说明。",
      "医学及热门理工方向建议同时比较最低分和最低位次。"
    ],
    admissionsNotes: [
      "适合对学校平台和湾区资源有明确偏好的考生。",
      "不同校区和专业组体验差异较大，建议细看培养地点与专业分流。",
      "医学和热门理工类专业需要重点看位次安全边界。"
    ],
    officialHint: "建议结合校区分布、专业组设置和官方招生章程综合判断。"
  }),
  createProfile({
    name: "华南理工大学",
    aliases: ["华工", "华南理工", "华南理工大学"],
    city: "广州",
    region: "华南",
    label: "华南工科高地",
    schoolType: "工科强校",
    level: "工科平台 / 大湾区就业连接强",
    image: buildCommonsImage("South China University of Technology South Gate.jpg"),
    ...buildUniversityVisuals("scut"),
    overview:
      "华南理工大学在计算机、电子信息、自动化、建筑、材料和轻工食品等领域优势明显，适合想留在大湾区、同时追求工科平台和就业出口的考生。",
    highlights: ["工科平台扎实", "大湾区就业连接强", "建筑与信息类受欢迎"],
    keyMajors: ["计算机类", "电子信息类", "自动化类", "建筑类", "材料类"],
    employmentDirections: ["制造业与硬科技研发", "建筑设计与工程咨询", "湾区互联网与数字化岗位"],
    suitableFor: [
      "明确偏工科、希望就业导向清晰的考生",
      "看重大湾区产业资源和工程平台的人",
      "对建筑、信息、自动化方向有长期规划的学生"
    ],
    campusNotes: [
      "学校工科辨识度高，但热门信息类专业与普通工科之间的录取强度差会比较大。",
      "如果希望在广州或珠三角就业，学校的企业连接度比较有优势。"
    ],
    brochureNotes: [
      "重点核查信息类、计算机类和建筑类专业组近年位次。",
      "要特别看调剂去向和组内冷热差，避免只看学校名气。"
    ],
    admissionsNotes: [
      "理工热门专业热度高，位次波动通常大于学校整体均值。",
      "适合重视工科平台与就业的考生。",
      "建议核查专业组冷热差和调剂去向。"
    ],
    officialHint: "重点看信息类、计算机类和建筑类专业组的近年位次表现。"
  }),
  createProfile({
    name: "暨南大学",
    aliases: ["暨大", "暨南大学"],
    city: "广州",
    region: "华南",
    label: "综合实力与城市资源兼顾",
    schoolType: "综合类高校",
    level: "城市资源型平台 / 国际化特色明显",
    image: buildCommonsImage("Jinan University Guangzhou South campus.jpg"),
    ...buildUniversityVisuals("jnu"),
    overview:
      "暨南大学在新闻传播、经管、临床医学、应用统计和国际化培养方面有不错口碑，适合想留在广州、同时兼顾综合平台和专业弹性的考生。",
    highlights: ["广州区位优势", "新闻传播与经管有口碑", "国际化特色明显"],
    keyMajors: ["新闻传播学类", "经济学类", "临床医学", "统计学类", "金融学"],
    employmentDirections: ["广州本地企业与媒体岗", "医学与健康产业", "国际化升学与商科路径"],
    suitableFor: [
      "城市优先、希望留在广州发展的考生",
      "希望在综合平台里保留专业弹性的人",
      "对新闻、经管、医学方向感兴趣的学生"
    ],
    campusNotes: [
      "不同专业热度差距很大，不能只按学校整体认可度来判断。",
      "如果目标是广州就业或读研，学校的区位资源会比较友好。"
    ],
    brochureNotes: [
      "重点核查专业组选考要求、培养校区与转专业规则。",
      "若目标集中在热门经管或医学方向，建议单独看近年位次。"
    ],
    admissionsNotes: [
      "适合城市优先、希望保持专业选择弹性的考生。",
      "不同专业热度差较明显，建议不要只看学校名气。",
      "填报前应核对专业组选考要求和培养校区。"
    ],
    officialHint: "可结合往年录取公告和学校本科招生资讯页面做人工复核。"
  }),
  createProfile({
    name: "华南师范大学",
    aliases: ["华南师大", "华师", "华南师范大学"],
    city: "广州",
    region: "华南",
    label: "师范与综合发展双优势",
    schoolType: "师范强校",
    level: "稳定就业导向 / 广东本地认可度高",
    image: buildCommonsImage("South China Normal University in 2024-08 01.jpg"),
    ...buildUniversityVisuals("scnu"),
    overview:
      "华南师范大学在教育学、心理学、数学、物理、计算机和师范培养方向有较强积累，适合既看重稳定就业又希望保留一定综合平台的考生。",
    highlights: ["师范体系成熟", "心理与教育方向突出", "广东本地认可度高"],
    keyMajors: ["教育学", "心理学", "数学类", "物理学", "计算机类"],
    employmentDirections: ["教师编制与教育系统", "心理健康与测评方向", "理科升学与本地稳定就业"],
    suitableFor: [
      "重视稳定就业、考编和教师路径的考生",
      "接受师范与非师范路径存在明显差异的人",
      "希望在广东本地长期发展的家庭"
    ],
    campusNotes: [
      "师范类与非师范类专业的培养方式、就业去向和门槛差异较明显。",
      "如果目标是稳定就业，这类院校往往比很多综合校更贴近现实。"
    ],
    brochureNotes: [
      "重点核查公费师范、定向项目、师范专项和就业约束。",
      "心理、教育和计算机方向建议单独比较专业组冷热差。"
    ],
    admissionsNotes: [
      "适合考编、教师方向和重视稳定就业的考生。",
      "非师范与师范方向录取门槛和后续路径差异明显。",
      "建议重点核对公费师范、定向项目与师范类培养规则。"
    ],
    officialHint: "若涉及师范志向，务必核查当年的师范专项和就业约束。"
  }),
  createProfile({
    name: "深圳大学",
    aliases: ["深大", "深圳大学"],
    city: "深圳",
    region: "华南",
    label: "城市资源驱动型热门院校",
    schoolType: "城市资源型高校",
    level: "就业导向 / 深圳资源加成明显",
    image: buildCommonsImage("SHENZHEN UNIVERSITY (7).jpg"),
    ...buildUniversityVisuals("szu"),
    overview:
      "深圳大学依托深圳城市资源，在计算机、电子信息、建筑、金融和新兴交叉方向的吸引力很强，适合城市优先、就业优先的考生。",
    highlights: ["深圳就业资源密集", "信息类热度高", "城市吸引力显著"],
    keyMajors: ["计算机类", "电子信息类", "建筑类", "金融学", "人工智能"],
    employmentDirections: [
      "深圳互联网与高新技术企业",
      "金融与城市服务业",
      "本地实习转正与创业生态"
    ],
    suitableFor: [
      "城市优先、就业优先且明确倾向深圳的考生",
      "对实习、产业链接和毕业落地有强诉求的人",
      "接受热门城市会显著推高竞争强度的家庭"
    ],
    campusNotes: [
      "深圳城市吸引力会显著抬高热门专业组的分数和位次。",
      "如果目标是实习和就业落地，深大的城市溢价是它的核心竞争力。"
    ],
    brochureNotes: [
      "重点核查计算机、电子信息、人工智能等热门组的冷热差。",
      "同时要看调剂去向，避免只被城市标签吸引。"
    ],
    admissionsNotes: [
      "城市吸引力会显著推高热门专业竞争强度。",
      "适合对深圳实习、就业、产业链接有强偏好的考生。",
      "同校不同专业组之间的录取强度差异需要重点识别。"
    ],
    officialHint: "如果城市优先，建议把深大与省外同层次高校一起横向比较。"
  }),
  createProfile({
    name: "南方科技大学",
    aliases: ["南科大", "南方科技大学"],
    city: "深圳",
    region: "华南",
    label: "新型研究型大学代表",
    schoolType: "新型研究型大学",
    level: "小而强平台 / 研究导向鲜明",
    image: buildCommonsImage("Southern University of Science and Technology 1.jpg"),
    ...buildUniversityVisuals("sustech"),
    overview:
      "南方科技大学以理工科和研究型培养见长，适合看重科研氛围、小而强平台和新型人才培养模式的考生。",
    highlights: ["研究型培养强", "理工科特色鲜明", "深圳创新资源丰富"],
    keyMajors: ["数学类", "物理学", "计算机科学与技术", "电子科学与技术", "材料科学与工程"],
    employmentDirections: ["科研深造与海外申请", "深圳硬科技和实验室体系", "新工科研发岗位"],
    suitableFor: [
      "主动性强、愿意适应研究导向培养的考生",
      "更看重培养模式而非传统学校名气的人",
      "对理工科研、实验室和创新创业感兴趣的学生"
    ],
    campusNotes: [
      "学校规模相对精简，培养路径与传统综合大学差异较大。",
      "如果重视科研氛围、导师资源和创新项目，会比较适合。"
    ],
    brochureNotes: [
      "重点核查综合评价、校测和普通批次之间的规则差异。",
      "录取方式和培养路径都更特殊，建议逐条看招生说明。"
    ],
    admissionsNotes: [
      "适合主动性强、愿意接受研究导向培养方式的考生。",
      "报考前建议重点核对综合评价、校测及不同批次规则。",
      "专业规模和培养路径与传统综合大学不同，需提前了解。"
    ],
    officialHint: "尤其要注意综合评价与普通批次之间的规则差异。"
  }),
  createProfile({
    name: "广东工业大学",
    aliases: ["广工", "广东工业大学"],
    city: "广州",
    region: "华南",
    label: "本地工科与就业导向代表",
    schoolType: "应用型工科高校",
    level: "本地就业导向 / 珠三角产业连接强",
    image: buildCommonsImage(
      "Guangdong University of Technology, Guangzhou Higher Education Mega Center.jpg"
    ),
    ...buildUniversityVisuals("gdut"),
    overview:
      "广东工业大学在自动化、机械、计算机、材料、电气等方向有较强本地产业对接能力，适合更看重应用型工科和珠三角就业落地的考生。",
    highlights: ["本地产业链接紧密", "工科就业导向强", "广东录取覆盖面广"],
    keyMajors: ["自动化", "机械类", "计算机类", "电气工程", "材料类"],
    employmentDirections: [
      "珠三角制造业与工程岗",
      "本地数字化与自动化岗位",
      "应用型读研与稳定落地就业"
    ],
    suitableFor: [
      "更看重就业落地和地域稳定性的考生",
      "能接受应用型工科路径、希望在广东发展的家庭",
      "需要把学校把握度和专业接受度一起权衡的学生"
    ],
    campusNotes: [
      "学校和本地产业连接紧密，但热门信息类专业与普通工科之间分差会拉开。",
      "如果目标是珠三角稳定就业，这类学校往往比名校光环更贴地气。"
    ],
    brochureNotes: [
      "重点核查培养校区、自动化和计算机类专业组的位次差异。",
      "保底志愿使用时，最好把调剂去向和专业接受度一起确认。"
    ],
    admissionsNotes: [
      "适合希望在广东本地稳定就业、接受应用型工科路径的考生。",
      "热门信息类专业与普通工科之间分差会拉开。",
      "建议把保底层和专业接受度结合起来一起看。"
    ],
    officialHint: "重点关注具体专业组的学科差异与培养校区。"
  })
];

const genericHighlights = [
  "建议结合当年招生简章复核",
  "优先核对专业组和选科限制",
  "结合位次而非只看裸分"
];

function findUniversityProfile(universityName) {
  const normalizedName = normalizeUniversityName(universityName);

  if (!normalizedName) {
    return null;
  }

  return (
    universityProfiles.find((profile) =>
      [profile.name, ...(profile.aliases || [])].some((alias) =>
        normalizedName.includes(normalizeUniversityName(alias))
      )
    ) ||
    universityProfiles.find((profile) =>
      [profile.name, ...(profile.aliases || [])].some((alias) =>
        normalizeUniversityName(alias).includes(normalizedName)
      )
    ) ||
    null
  );
}

export function getUniversityProfile(universityName) {
  if (!universityName) {
    return null;
  }

  const matchedProfile = findUniversityProfile(universityName);
  if (matchedProfile) {
    return matchedProfile;
  }

  return createProfile({
    name: universityName,
    aliases: [universityName],
    city: "待补充",
    region: "全国",
    label: "高校档案待补充",
    schoolType: "待补充",
    level: "建议人工复核",
    ...buildFallbackUniversityVisuals(universityName),
    overview:
      "当前这所高校还没有接入专门的图文档案，但你仍然可以查看当前推荐结果中的专业、分数线、位次、学费和风险提示，并继续用 AI 顾问追问这所学校。",
    highlights: genericHighlights,
    keyMajors: ["建议查看学校招生网专业目录", "优先确认是否有选科限制"],
    employmentDirections: ["结合学校官网就业质量报告人工核查", "重点看你能接受的专业出口"],
    suitableFor: ["愿意自己再做一轮人工核查的考生", "希望先根据当前推荐结果快速做初筛的人"],
    campusNotes: [
      "优先确认培养校区、住宿条件、是否存在异地办学或分校区培养。",
      "如果是保底志愿，务必确认你能接受调剂范围和专业去向。"
    ],
    brochureNotes: [
      "建议人工核查学校官网、招生章程和当年专业目录。",
      "优先关注专业组冷热差、调剂范围和培养校区。"
    ],
    admissionsNotes: [
      "建议人工核查学校官网、招生章程和当年专业目录。",
      "优先关注专业组冷热差、调剂范围和培养校区。",
      "当前面板中的分数线与学费数据来自你本次推荐结果。"
    ],
    officialHint: "后续可以继续扩充这所高校的专属图文资料。"
  });
}

export function resolveUniversityImage(source, universityName = "") {
  const targetName = universityName || source?.university || source?.name || source?.title || "";
  const matchedProfile = source?.profile || findUniversityProfile(targetName);

  return pickFirstImage(
    source?.cover,
    source?.image,
    source?.photo,
    source?.banner,
    source?.campusImage,
    source?.thumbnail,
    matchedProfile?.cover,
    matchedProfile?.image,
    matchedProfile?.photo,
    matchedProfile?.banner,
    matchedProfile?.campusImage,
    matchedProfile?.thumbnail,
    pickFallbackUniversityImage(targetName)
  );
}

export function getUniversityResourceLinks(universityName) {
  const profile = getUniversityProfile(universityName);
  const resourceEntry =
    UNIVERSITY_RESOURCE_LINKS[profile?.name] ||
    UNIVERSITY_RESOURCE_LINKS[normalizeUniversityName(profile?.name)] ||
    null;

  return {
    overviewUrl:
      resourceEntry?.overviewUrl ||
      buildBingSearchUrl(`${profile?.name || universityName} 学校简介`),
    admissionsUrl:
      resourceEntry?.admissionsUrl ||
      buildBingSearchUrl(`${profile?.name || universityName} 本科招生 招生简章`),
    scoreUrl:
      resourceEntry?.scoreUrl ||
      buildBingSearchUrl(`${profile?.name || universityName} 历年录取分数线 招生网`)
  };
}

function buildBingSearchUrl(keyword) {
  return `https://cn.bing.com/search?q=${encodeURIComponent(keyword)}`;
}

function normalizeUniversityName(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .trim();
}
import { universityImageCatalog } from "./universityImageCatalog.js";
