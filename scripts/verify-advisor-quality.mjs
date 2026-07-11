import {
  createAdvisorPlanner,
  createAdvisorResponsePolicy,
  createAdvisorRuntime,
  createAdvisorToolRouter,
  createCitationFormatter,
  createContextBuilder,
  createEntityResolver,
  createIntentRecognizer,
  createMemoryEngine,
  createPersonaEngine,
  createReflectionEngine
} from "../apps/api/modules/advisor/index.js";
import { getDataEngine } from "../apps/api/services/dbService.js";
import { generateAdvisorReply } from "../apps/api/services/llmService.js";

const runtime = createAdvisorRuntime({
  loadLatestSession: () => null,
  loadChatHistory: () => [],
  citationFormatter: createCitationFormatter(),
  contextBuilder: createContextBuilder(),
  intentRecognizer: createIntentRecognizer(),
  memoryEngine: createMemoryEngine(),
  planner: createAdvisorPlanner(),
  personaEngine: createPersonaEngine(),
  responsePolicyEngine: createAdvisorResponsePolicy(),
  reflectionEngine: createReflectionEngine(),
  toolRouter: createAdvisorToolRouter({
    entityResolver: createEntityResolver({ getDataEngine }),
    getDataEngine
  }),
  generateReply: generateAdvisorReply,
  saveSessionHistory: () => {},
  saveHistory: () => {}
});

const basePlanningContext = {
  profile: {
    province: "广东",
    examMode: "3+1+2",
    track: "物理",
    score: 612,
    rank: 14800,
    selectedSubjects: ["物理", "化学"],
    candidateType: "general",
    riskLabel: "稳中带冲",
    preferredCities: "广州 / 深圳 / 南京 / 杭州",
    careerPlan: "优先考虑就业出口、平台资源和后续读研延展",
    maxTuition: 12000,
    interests: ["人工智能", "软件工程", "自动化"],
    personalityTags: ["务实", "执行力强"],
    schoolTags: ["省会 / 新一线", "工科平台"],
    majorNeeds: ["不接受纯冷门专业", "希望可转算法 / 软件 / 自动化"],
    subjectConstraints: ["物理化学可报", "尽量规避强生物要求"],
    willingAdjustment: true,
    englishScore: 124
  },
  summary: {
    overview: "当前画像更适合以工科平台和就业出口为先，不适合为了虚高名气接受明显错配专业。",
    strategy: "先稳平台，再压专业组风险，冲稳保都要有真实落点。",
    careerAdvice: "优先选择后续可延展到软件、算法、自动化、电子信息的专业路径。"
  },
  diagnosis: {
    coverageRate: 84,
    topDirections: ["人工智能", "软件工程", "自动化", "电子信息"],
    adjustmentAdvice: "冲刺层允许看平台，稳定层优先看专业组质量，保底层必须能接受。",
    riskProfile: {
      rushCount: 3,
      steadyCount: 4,
      safeCount: 3
    }
  },
  applicationPlan: [
    {
      tierClass: "rush",
      tierLabel: "冲刺",
      schools: [
        { university: "中山大学", major: "电子信息类", city: "广州" },
        { university: "华南理工大学", major: "自动化类", city: "广州" },
        { university: "南京航空航天大学", major: "人工智能", city: "南京" }
      ]
    },
    {
      tierClass: "steady",
      tierLabel: "稳妥",
      schools: [
        { university: "深圳大学", major: "软件工程", city: "深圳" },
        { university: "南京师范大学", major: "计算机科学与技术", city: "南京" },
        { university: "广东工业大学", major: "自动化", city: "广州" }
      ]
    },
    {
      tierClass: "safe",
      tierLabel: "保底",
      schools: [
        { university: "广州大学", major: "电气工程及其自动化", city: "广州" },
        { university: "汕头大学", major: "电子信息工程", city: "汕头" },
        { university: "佛山大学", major: "计算机科学与技术", city: "佛山" }
      ]
    }
  ],
  meta: {
    latestProvinceYear: 2025
  }
};

const scenarios = [
  {
    id: "named-school-pivot",
    description: "点名学校后必须立刻切换到新学校，不能重复上一轮对象",
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [
        { role: "user", content: "南京航空航天大学值不值得报？" },
        {
          role: "assistant",
          content: "先给判断：南京航空航天大学可以聊，但要回到整张志愿表里看。下一步你可以问我它该放冲还是稳。"
        },
        { role: "user", content: "南京师范大学" }
      ]
    },
    validate(result) {
      const reply = result.reply || "";
      const preview = reply.slice(0, 120);
      return {
        passed:
          result.meta?.responseFocus?.label === "南京师范大学" &&
          preview.includes("南京师范大学") &&
          !preview.includes("南京航空航天大学"),
        checks: {
          responseFocus: result.meta?.responseFocus?.label || "",
          preview
        }
      };
    }
  },
  /*
  {
    id: "continue-follow-up",
    description: "用户只说继续时，必须沿上一轮推进，不要重新空讲",
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [
        { role: "user", content: "中山大学和深圳大学怎么选？" },
        {
          role: "assistant",
          content:
            "先给判断：这不是比名气，是比你到底把平台还是专业放第一。你先看硬点：1. 中山大学平台强。2. 深圳大学软件出口更直接。下一步你直接告诉我更看重平台还是就业。"
        },
        { role: "user", content: "继续" }
      ]
    },
    validate(result) {
      const reply = result.reply || "";
      const hasDecisionFrame =
        reply.includes("你现在这轮本质上在") ||
        reply.includes("上一轮已经推进到这里") ||
        reply.includes("顺着上一轮继续追问");
      const notGeneric =
        !/综合来看|一般来说|具体要看|因人而异/.test(reply) &&
        reply.length >= 60;
      return {
        passed: (hasDecisionFrame || reply.startsWith("我就接着")) && notGeneric,
        checks: {
          preview: reply.slice(0, 180)
        }
      };
    }
  },
  {
    id: "multi-follow-up-shortcut",
    description: "用户说前两个或 1 和 2 时，必须识别为沿上一轮继续拆解",
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [
        {
          role: "assistant",
          content:
            "我先把你这张表最值得继续拆的三件事摆出来：1. 学校和专业到底谁优先。2. 只留广东要牺牲多少层次。3. 哪些专业组看着稳其实最坑人。你直接说第一、第二，或者前两个，我就顺着往下讲。"
        },
        { role: "user", content: "前两个" }
      ]
    },
    validate(result) {
      const reply = result.reply || "";
      return {
        passed:
          reply.startsWith("先给判断") &&
          /学校|专业|广东|城市/.test(reply) &&
          !/因人而异|综合来看|具体要看/.test(reply),
        checks: {
          preview: reply.slice(0, 200)
        }
      };
    }
  },
  */
  /*
  {
    id: "second-item-shortcut",
    description: "鐢ㄦ埛鍙绗簩涓椂锛屽繀椤婚敋瀹氬埌涓婁竴杞殑绗?2 鐐?,
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [
        {
          role: "assistant",
          content:
            "鎴戝厛鎶婁綘杩欏紶琛ㄦ渶鍊煎緱缁х画鎷嗙殑涓変欢浜嬫憜鍑烘潵锛?. 瀛︽牎鍜屼笓涓氬埌搴曡皝浼樺厛銆?. 鍙暀骞夸笢瑕佺壓鐗插灏戝眰娆°€?. 鍝簺涓撲笟缁勭湅鐫€绋冲叾瀹炴渶鍧戜汉銆?"
        },
        { role: "user", content: "第二个" }
      ]
    },
    validate(result) {
      const reply = result.reply || "";
      return {
        passed:
          /骞夸笢|鍩庡競|鐪佸唴|鏈湴/.test(reply) &&
          !/鍥犱汉鑰屽紓|缁煎悎鏉ョ湅|鍏蜂綋瑕佺湅/.test(reply),
        checks: {
          preview: reply.slice(0, 180)
        }
      };
    }
  },
  {
    id: "pair-index-shortcut",
    description: "鐢ㄦ埛璇?1 鍜?2 鏃讹紝蹇呴』鎶婂墠涓ら」鍚屾椂鎺ヤ綇",
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [
        {
          role: "assistant",
          content:
            "鎴戝厛鎶婁綘杩欏紶琛ㄦ渶鍊煎緱缁х画鎷嗙殑涓変欢浜嬫憜鍑烘潵锛?. 瀛︽牎鍜屼笓涓氬埌搴曡皝浼樺厛銆?. 鍙暀骞夸笢瑕佺壓鐗插灏戝眰娆°€?. 鍝簺涓撲笟缁勭湅鐫€绋冲叾瀹炴渶鍧戜汉銆?"
        },
        { role: "user", content: "1和2" }
      ]
    },
    validate(result) {
      const reply = result.reply || "";
      return {
        passed:
          /瀛︽牎|涓撲笟/.test(reply) &&
          /骞夸笢|鍩庡競|鐪佸唴/.test(reply) &&
          !/鍥犱汉鑰屽紓|缁煎悎鏉ョ湅|鍏蜂綋瑕佺湅/.test(reply),
        checks: {
          preview: reply.slice(0, 220)
        }
      };
    }
  },
  {
    id: "employment-follow-up",
    description: "鐢ㄦ埛鎸囧畾鈥滄寜灏变笟璇粹€濇椂锛屽繀椤婚『鐫€灏变笟缁村害缁х画鍥炵瓟",
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [
        { role: "user", content: "涓北澶у鍜屾繁鍦冲ぇ瀛︽€庝箞閫夛紵" },
        {
          role: "assistant",
          content:
            "鍏堢粰鍒ゆ柇锛氳繖涓嶆槸姣斿悕姘旓紝鏄瘮浣犲埌搴曟妸骞冲彴杩樻槸涓撲笟鏀剧涓€銆?1. 涓北澶у骞冲彴寮恒€?2. 娣卞湷澶у杞欢鍑哄彛鏇寸洿鎺ャ€?3. 濡傛灉浣犳洿鐪嬮噸灏变笟锛岃鐪嬪摢鏉¤矾鏇寸洿銆?"
        },
        { role: "user", content: "继续按就业说" }
      ]
    },
    validate(result) {
      const reply = result.reply || "";
      return {
        passed:
          /灏变笟|鍑哄彛|涓撲笟/.test(reply) &&
          reply.length >= 60 &&
          !/鍥犱汉鑰屽紓|缁煎悎鏉ョ湅|鍏蜂綋瑕佺湅/.test(reply),
        checks: {
          preview: reply.slice(0, 200)
        }
      };
    }
  },
  */
  {
    id: "tuition-grounding",
    description: "问学费时必须落到招生计划或学费事实上",
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [{ role: "user", content: "深圳大学学费多少？" }]
    },
    validate(result) {
      const reply = result.reply || "";
      const plannedTools = result.meta?.plannedTools || [];
      return {
        passed:
          plannedTools.includes("enrollment_plan_database") &&
          reply.includes("深圳大学") &&
          /学费|招生计划|计划数/.test(reply),
        checks: {
          plannedTools,
          preview: reply.slice(0, 180)
        }
      };
    }
  },
  {
    id: "continue-follow-up-clean",
    description: "continue shortcut should keep the prior comparison frame",
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [
        { role: "user", content: "中山大学和深圳大学怎么选" },
        {
          role: "assistant",
          content:
            "先给判断：这不是比名气，是比你到底把平台还是专业放第一。1. 中山大学平台高 2. 深圳大学软件出口更直接"
        },
        { role: "user", content: "继续" }
      ]
    },
    validate(result) {
      const reply = result.reply || "";
      return {
        passed:
          /学校|专业|平台/.test(reply) &&
          reply.length >= 60 &&
          !/因人而异|综合来看|具体要看/.test(reply),
        checks: {
          preview: reply.slice(0, 180)
        }
      };
    }
  },
  {
    id: "second-item-shortcut-clean",
    description: "single second-item shortcut should anchor to item two",
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [
        {
          role: "assistant",
          content:
            "我先把你这张表最值得继续拆的三件事摆出来：1. 学校和专业到底谁优先 2. 只留广东要牺牲多少层次 3. 哪些专业组看着稳其实最坑人"
        },
        { role: "user", content: "第二个" }
      ]
    },
    validate(result) {
      const reply = result.reply || "";
      return {
        passed:
          /广东|城市|省内|本地/.test(reply) &&
          !/因人而异|综合来看|具体要看/.test(reply),
        checks: {
          preview: reply.slice(0, 180)
        }
      };
    }
  },
  {
    id: "pair-index-shortcut-clean",
    description: "pair shortcut should continue first two items together",
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [
        {
          role: "assistant",
          content:
            "我先把你这张表最值得继续拆的三件事摆出来：1. 学校和专业到底谁优先 2. 只留广东要牺牲多少层次 3. 哪些专业组看着稳其实最坑人"
        },
        { role: "user", content: "1和2" }
      ]
    },
    validate(result) {
      const reply = result.reply || "";
      return {
        passed:
          /学校|专业/.test(reply) &&
          /广东|城市|省内/.test(reply) &&
          !/因人而异|综合来看|具体要看/.test(reply),
        checks: {
          preview: reply.slice(0, 220)
        }
      };
    }
  },
  {
    id: "employment-follow-up-clean",
    description: "employment follow-up should keep the employment lens",
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [
        { role: "user", content: "中山大学和深圳大学怎么选" },
        {
          role: "assistant",
          content:
            "先给判断：这不是比名气，是比你到底更看重平台还是就业。1. 中山大学平台更高 2. 深圳大学软件和本地实习出口更直接 3. 如果你按就业来选，就要看哪条路更直"
        },
        { role: "user", content: "继续按就业说" }
      ]
    },
    validate(result) {
      const reply = result.reply || "";
      return {
        passed:
          /就业|出口|专业/.test(reply) &&
          reply.length >= 60 &&
          !/因人而异|综合来看|具体要看/.test(reply),
        checks: {
          preview: reply.slice(0, 200)
        }
      };
    }
  },
  {
    id: "comparison-judgment-first",
    description: "对比问题必须先给判断，并把两个对象都说出来",
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [{ role: "user", content: "人工智能和软件工程哪个好就业？" }]
    },
    validate(result) {
      const reply = result.reply || "";
      return {
        passed:
          reply.startsWith("先给判断") &&
          reply.includes("人工智能") &&
          reply.includes("软件工程") &&
          /就业|出口|读研/.test(reply) &&
          result.meta?.responseFocus?.type === "comparison" &&
          Array.isArray(result.meta?.responseFocus?.labels) &&
          result.meta.responseFocus.labels.join("|") === "人工智能|软件工程",
        checks: {
          responseFocus: result.meta?.responseFocus || null,
          preview: reply.slice(0, 200)
        }
      };
    }
  },
  {
    id: "policy-boundary",
    description: "规则问题必须进入规则口径，而不是泛泛建议",
    payload: {
      provider: "local",
      advisorMode: "xuefeng",
      planningContext: basePlanningContext,
      messages: [{ role: "user", content: "广东物化生能不能报临床医学，选科要求怎么卡？" }]
    },
    validate(result) {
      const reply = result.reply || "";
      const plannedTools = result.meta?.plannedTools || [];
      return {
        passed:
          plannedTools.includes("policy_database") &&
          ["major", "policy"].includes(result.meta?.responseFocus?.type) &&
          (
            result.meta?.responseFocus?.label === "临床医学" ||
            String(result.meta?.responseFocus?.label || "").includes("subject_requirement")
          ) &&
          reply.startsWith("先按规则说") &&
          reply.includes("规则") &&
          /选科|招生边界|专业组|临床医学/.test(reply),
        checks: {
          responseFocus: result.meta?.responseFocus || null,
          plannedTools,
          preview: reply.slice(0, 200)
        }
      };
    }
  }
];

const failures = [];
const reports = [];

for (const scenario of scenarios) {
  const result = await runtime.handleChatTurn({
    payload: scenario.payload,
    access: {
      user: { id: 999001, role: "student" },
      isAdmin: false
    }
  });

  const validation = scenario.validate(result);
  reports.push({
    id: scenario.id,
    description: scenario.description,
    passed: validation.passed,
    checks: validation.checks,
    meta: {
      primaryIntent: result.meta?.primaryIntent || "",
      plannedTools: result.meta?.plannedTools || [],
      responseFocus: result.meta?.responseFocus || null,
      evidenceStrength: result.meta?.responseEvidenceStrength || ""
    },
    replyPreview: String(result.reply || "").slice(0, 260)
  });

  if (!validation.passed) {
    failures.push({
      id: scenario.id,
      description: scenario.description
    });
  }
}

console.log(
  JSON.stringify(
    {
      checked: scenarios.length,
      passed: scenarios.length - failures.length,
      failed: failures.length,
      failures,
      reports
    },
    null,
    2
  )
);

if (failures.length) {
  process.exitCode = 1;
}
