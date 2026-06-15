import OpenAI from "openai";

const providerCatalog = {
  openai: {
    id: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    modelEnvKey: "OPENAI_MODEL",
    defaultModel: "gpt-5.5",
    mode: "responses"
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    envKey: "DEEPSEEK_API_KEY",
    modelEnvKey: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-v4-flash",
    baseURL: "https://api.deepseek.com",
    mode: "chat.completions"
  },
  qwen: {
    id: "qwen",
    label: "通义千问",
    envKey: "DASHSCOPE_API_KEY",
    modelEnvKey: "DASHSCOPE_MODEL",
    defaultModel: "qwen-plus",
    baseURL: process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
    mode: "chat.completions"
  }
};

export function listAvailableProviders() {
  const providers = Object.values(providerCatalog).map((provider) => ({
    id: provider.id,
    label: provider.label,
    enabled: Boolean(process.env[provider.envKey]),
    model: process.env[provider.modelEnvKey] || provider.defaultModel
  }));

  return {
    providers,
    defaultProvider: resolveProviderId("auto")
  };
}

export async function generateStructuredPlanningSummary({
  preferredProvider = "auto",
  input
}) {
  const providerId = resolveProviderId(preferredProvider);
  if (!providerId) {
    return null;
  }

  const schemaPrompt = `
你是一名中国高考志愿规划顾问。请基于给定学生画像输出严格 JSON。

要求：
1. 使用简洁、专业、对家长和学生都友好的中文。
2. 不要承诺录取结果。
3. 如果数据并非官方实时数据，要提醒用户正式填报前核验。

只输出以下 JSON 结构：
{
  "overview": "string",
  "strategy": "string",
  "careerAdvice": "string",
  "riskAlerts": ["string", "string", "string"]
}

学生画像与候选方案：
${JSON.stringify(input, null, 2)}
`;

  const text = await invokeProvider({
    providerId,
    systemPrompt: "你是一名高考志愿规划顾问，只能输出 JSON。",
    userPrompt: schemaPrompt,
    jsonMode: true
  });

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function generateAdvisorReply({
  preferredProvider = "auto",
  provider = "auto",
  advisorMode = "xuefeng",
  messages,
  planningContext
}) {
  const providerChoice =
    preferredProvider && preferredProvider !== "auto" ? preferredProvider : provider;
  const providerId = resolveProviderId(providerChoice || "auto");

  if (!providerId) {
    return {
      provider: "local",
      model: "local-fallback",
      reply: buildLocalChatReply(messages, planningContext, advisorMode)
    };
  }

  const systemPrompt = advisorMode === "xuefeng"
    ? `
你是一名中国高考志愿顾问，请始终使用中文回答。
你现在采用“老师直说模式”：
1. 说话像一个见过很多真实案例的高考老师，接地气、有人味，像老师也像朋友。
2. 第一段尽量先给明确判断，不要上来一堆套话。
3. 重点围绕高考志愿、大学、专业、城市、就业、读研、调剂风险、滑档风险。
4. 不要空泛安慰。能说清利弊，就直接说清利弊。
5. 如果信息不够，先追问最关键的1到3个问题，比如省份、位次、选科、想留广东还是能去省外、家里对专业和城市的底线。
6. 如果已有志愿推荐结果，优先结合当前结果解释，不要脱离上下文空谈。
7. 如果用户问“能不能录”“稳不稳”“概率多大”，必须提醒：正式填报前要结合官方最新数据核验，不能把聊天建议当最终投档结论。
8. 多用短句、判断句、对比句。允许适度口语化，但不要低俗，不要攻击，不要刻意模仿真人身份。
9. 对普通家庭、广东考生、想稳就业的用户，要更强调确定性、平台、专业出口和试错成本。
10. 回答里尽量加入“下一步该怎么做”，让用户知道立刻行动什么。
`
    : `
你是一名中国高考志愿顾问，请始终使用中文回答。

要求：
1. 回答要围绕高考志愿、大学、专业、城市、就业、读研和风险判断。
2. 如果用户问到录取确定性，强调需要结合官方最新数据核验。
3. 如果已有志愿推荐结果，优先基于现有结果解释，不要脱离上下文空谈。
4. 用自然、耐心、温和、陪伴式的口吻回答。
5. 如果信息不够，先追问关键缺失信息，再给建议。
`;

  const planningNarrative = planningContext
    ? `以下是当前规划上下文，可作为回答依据：\n${JSON.stringify(planningContext, null, 2)}`
    : "当前没有已生成的正式志愿方案，请根据用户提问给出一般性志愿建议。";

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const previousAssistantMessage = [...messages]
    .slice(0, -1)
    .reverse()
    .find((message) => message.role === "assistant");
  const currentUserMessage = latestUserMessage?.content || "";
  const recentMessages = messages.slice(-12);
  const followUpGuardrail = buildFollowUpGuardrail({
    currentUserMessage,
    previousAssistantContent: previousAssistantMessage?.content || ""
  });
  const userPrompt = `${planningNarrative}

${followUpGuardrail}

请严格基于上下文回答“最后一条用户消息”，不要重复上一轮原话。若用户只回复“第一”“第二”“第三”“展开第一条”这类简短指令，也要结合上一轮语境继续往下回答。

最后一条用户消息：
${currentUserMessage}

最近对话历史：
${JSON.stringify(recentMessages, null, 2)}`;
  const reply = await invokeProvider({
    providerId,
    systemPrompt,
    userPrompt,
    jsonMode: false
  });
  const processedReply = postProcessProviderReply({
    reply,
    advisorMode,
    planningContext,
    previousAssistantContent: previousAssistantMessage?.content || ""
  });
  const safeReply = shouldUseFallbackReply(processedReply, previousAssistantMessage?.content || "")
    ? null
    : processedReply;

  return {
    provider: providerId,
    model: getProviderModel(providerId),
    reply: safeReply || buildLocalChatReply(messages, planningContext, advisorMode)
  };
}

function resolveProviderId(preferredProvider) {
  if (preferredProvider && preferredProvider !== "auto" && preferredProvider !== "local") {
    const requested = providerCatalog[preferredProvider];
    if (requested && process.env[requested.envKey]) {
      return requested.id;
    }
  }

  if (preferredProvider === "local") {
    return null;
  }

  for (const providerId of ["openai", "deepseek", "qwen"]) {
    const provider = providerCatalog[providerId];
    if (process.env[provider.envKey]) {
      return provider.id;
    }
  }

  return null;
}

function getProviderModel(providerId) {
  const provider = providerCatalog[providerId];
  return provider ? process.env[provider.modelEnvKey] || provider.defaultModel : "local-fallback";
}

function createClient(providerId) {
  const provider = providerCatalog[providerId];
  if (!provider) {
    return null;
  }

  const apiKey = process.env[provider.envKey];
  if (!apiKey) {
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL: provider.baseURL
  });
}

async function invokeProvider({
  providerId,
  systemPrompt,
  userPrompt,
  jsonMode
}) {
  const client = createClient(providerId);
  if (!client) {
    return null;
  }

  const provider = providerCatalog[providerId];
  const model = getProviderModel(providerId);

  try {
    if (provider.mode === "responses") {
      const response = await client.responses.create({
        model,
        instructions: systemPrompt,
        input: userPrompt
      });
      return response.output_text?.trim() || null;
    }

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      stream: false,
      response_format: jsonMode ? { type: "json_object" } : undefined
    });

    return completion.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

function buildLocalChatReply(messages, planningContext, advisorMode = "xuefeng") {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const previousUserMessage = [...messages]
    .slice(0, -1)
    .reverse()
    .find((message) => message.role === "user");
  const previousAssistantMessage = [...messages]
    .slice(0, -1)
    .reverse()
    .find((message) => message.role === "assistant");
  const content = latestUserMessage?.content || "";
  const lowered = content.toLowerCase();
  const isTeacherMode = advisorMode === "xuefeng";
  const followUp = Boolean(previousUserMessage || previousAssistantMessage);
  const safeTier = planningContext?.applicationPlan?.[2]?.schools || [];
  const steadyTier = planningContext?.applicationPlan?.[1]?.schools || [];
  const rushTier = planningContext?.applicationPlan?.[0]?.schools || [];
  const topSafe = safeTier[0];
  const topSteady = steadyTier[0];
  const topRush = rushTier[0];
  const riskProfile = planningContext?.diagnosis?.riskProfile;
  const deepDiveChoice = resolveDeepDiveChoice(content);
  const followUpIntent = resolveFollowUpIntent(content, previousAssistantMessage?.content || "");
  const profileLead = [planningContext?.profile?.track, planningContext?.profile?.score ? `${planningContext.profile.score} 分` : "", planningContext?.profile?.rank ? `位次约 ${planningContext.profile.rank}` : ""]
    .filter(Boolean)
    .join("，");

  if (planningContext && (deepDiveChoice || followUpIntent)) {
    const resolvedIntent = deepDiveChoice || followUpIntent;

    if (resolvedIntent === "schoolMajor") {
      const steadyLead = topSteady
        ? `你现在主力层最值得盯住的一条，是 ${topSteady.university} 的 ${topSteady.major}。`
        : "你现在更该盯住主力层，而不是只看最冲的学校。";
      const rushLead = topRush
        ? `冲刺层里 ${topRush.university} 的 ${topRush.major}，更像“平台更亮，但专业和录取波动也更大”的位置。`
        : "";

      return isTeacherMode
        ? [profileLead ? `先按你的情况说，${profileLead}。` : "", "第一件事我给你直接下判断：如果你已经想往 AI、软件、工程这类方向走，专业优先级就不能让得太狠，学校是锦上添花，不是拿来硬换赛道的。", steadyLead, rushLead, "真正危险的，不是学校层次低一点，而是为了学校名头把自己送进不想读的专业组。下一步你要是愿意，我可以直接把你这张表里“该保专业”的几所和“可以保学校”的几所给你点名分开。"].filter(Boolean).join("")
        : [profileLead ? `结合你当前的情况，${profileLead}。` : "", "如果职业方向已经比较明确，通常要优先保证专业匹配；如果方向还不够明确、但平台差异很大，再考虑适度向学校倾斜。", steadyLead, rushLead, "如果你愿意，我下一轮可以继续把这张表拆成“专业优先组”和“学校优先组”，方便你直接排序。"].filter(Boolean).join("");
    }

    if (resolvedIntent === "guangdongOnly") {
      const safeLead = topSafe
        ? `如果只留广东，保底层至少要保住像 ${topSafe.university} 这种你能接受、把握度更高的位置。`
        : "如果只留广东，首先要把保底层补厚，不然城市一锁死，整张表会变脆。";

      return isTeacherMode
        ? [profileLead ? `我按你这套情况继续往下说，${profileLead}。` : "", "第二件事的核心不是能不能留广东，而是你愿意为留广东牺牲什么。普通家庭最常见的代价就三个：学校层次往下一档、专业热度往下一档、保底厚度必须加厚。", safeLead, "说白了，城市不是不能保，但你一旦只留广东，就别再同时要求学校平台、热门专业、录取把握度三样都占满。下一步你要不要我直接按“只留广东”给你重排一版思路？"].filter(Boolean).join("")
        : [profileLead ? `结合你当前的情况，${profileLead}。` : "", "如果把范围收缩到广东，通常需要在学校层次、专业热度或保底厚度中至少让出一部分空间。", safeLead, "如果你愿意，我可以下一轮直接按“只留广东”的条件，帮你重排当前方案。"].filter(Boolean).join("");
    }

    if (resolvedIntent === "majorGroupRisk") {
      const rushLead = topRush
        ? `冲刺层里最该重点核查的是 ${topRush.university} 的 ${topRush.major}，这种位置最容易出现“组线看着够，目标专业其实不稳”。`
        : "";
      const steadyLead = topSteady
        ? `主力层也别掉以轻心，像 ${topSteady.university} 这种组，如果组内冷热差太大，一样可能把你带去不想要的专业。`
        : "";
      const riskLead = riskProfile
        ? `你这张表现在是冲 ${riskProfile.rushCount}、稳 ${riskProfile.steadyCount}、保 ${riskProfile.safeCount}。如果保底层不够厚，专业组风险会被进一步放大。`
        : "";

      return isTeacherMode
        ? [profileLead ? `还是按你的盘子来讲，${profileLead}。` : "", "第三件事最容易坑人。很多表不是分不够，是专业组看着稳，组内其实暗坑很多。你只要组里塞着自己完全不能接受的专业，这个组就不能算稳。", rushLead, steadyLead, riskLead, "你要是点头，我下一轮就直接按“最危险的三个专业组”给你做人工排雷。"].filter(Boolean).join("")
        : [profileLead ? `结合你当前的方案，${profileLead}。` : "", "专业组风险的关键，不在组线本身，而在组内专业冷热差和你对调剂的接受范围。", rushLead, steadyLead, riskLead, "如果你愿意，我可以下一轮直接帮你筛出最需要人工复核的几个专业组。"].filter(Boolean).join("");
    }
  }

  if (
    planningContext &&
    followUp &&
    /(继续|然后|再说|那|如果|展开|具体|还是|重新|接着|第一|第二|第三|第一个|第二个|第三个|1|2|3)/.test(content)
  ) {
    const memoryLead = previousAssistantMessage?.content
      ? `上一轮我重点说的是：${previousAssistantMessage.content.slice(0, 48)}...`
      : "";
    const riskLead = riskProfile
      ? `现在这张表是冲 ${riskProfile.rushCount} 个、稳 ${riskProfile.steadyCount} 个、保 ${riskProfile.safeCount} 个。`
      : "";
    const safeLead = topSafe
      ? `保底层里目前最稳的一条是 ${topSafe.university} 的 ${topSafe.major}，置信度 ${topSafe.confidence}。`
      : "保底层还需要继续补厚。";
    const steadyLead = topSteady
      ? `主力层可以重点看 ${topSteady.university} 的 ${topSteady.major}。`
      : "";
    const rushLead = topRush
      ? `冲刺层最该谨慎看的，是 ${topRush.university} 的 ${topRush.major}。`
      : "";

    return isTeacherMode
      ? [profileLead ? `你这个情况我记着，${profileLead}。` : "", memoryLead, riskLead, safeLead, steadyLead, rushLead, "你这次追问不是回到起点，而是继续往下拆。你下一句最好直接问我三种之一：哪几个该降到稳，哪几个保底还不够保险，或者只留广东后整张表怎么重排。"].filter(Boolean).join("")
      : [profileLead ? `我还记得你当前的情况：${profileLead}。` : "", memoryLead, riskLead, safeLead, steadyLead, rushLead, "如果你愿意，我们下一轮可以直接继续细化：哪些学校该下调风险、哪些保底还不够稳，或者只保留广东后整张表该怎么调整。"].filter(Boolean).join("");
  }

  if (!planningContext) {
    return isTeacherMode
      ? "我先跟你说实话，现在连正式方案都没生成，这时候谈冲稳保就是空对空。你先把省份、分数、位次、选科、想留广东还是能去外省补齐，我再直接告诉你该保学校、保专业，还是保城市。"
      : "现在还没有生成正式志愿方案。你可以先把省份、分数、位次、选科、兴趣和职业规划补齐，我再结合这些信息帮你分析学校优先、专业优先还是城市优先。";
  }

  if (
    content.includes("学校优先") ||
    content.includes("专业优先") ||
    content.includes("保学校") ||
    content.includes("保专业")
  ) {
    return isTeacherMode
      ? "我直接给你结论。方向明确、以后想靠专业吃饭，就优先专业；方向不清、但有机会进更强平台，就优先学校。别两头都想占，最后最容易拧巴。你现在再告诉我一句实话：你最怕的是毕业找不到工作，还是最怕学校名气不够？我按这个给你重排。"
      : "如果你已经有比较明确的职业方向，通常建议优先专业；如果你暂时方向不清晰，但位次足以进入更强的平台型大学，可以适度考虑学校优先。你也可以把你最在意的就业、读研、城市因素告诉我，我可以按这三项重新排序。";
  }

  if (content.includes("为什么") || content.includes("推荐")) {
    const firstTier = planningContext.applicationPlan?.[0];
    const firstSchool = firstTier?.schools?.[0];
    if (firstSchool) {
      return isTeacherMode
        ? `我跟你直说，系统把 ${firstSchool.university} 的 ${firstSchool.major} 放在前面，不是因为名字好听，而是因为它现在落在你的 ${firstTier.tierLabel} 区间里，而且跟你的兴趣、职业规划和筛选条件更合拍。说白了，就是它在你这套条件下更像“够得着、用得上、风险还能控”。但正式填报前，你还是得拿最新官方录取位次再核一遍，这一步不能偷懒。`
        : `系统优先推荐 ${firstSchool.university} 的 ${firstSchool.major}，主要是因为它在当前位次模型下处于 ${firstTier.tierLabel}，并且和你的兴趣、职业规划及筛选条件匹配度较高。正式填报前，仍建议对照最新官方录取位次核验。`;
    }
  }

  if (
    content.includes("就业") ||
    content.includes("找工作") ||
    content.includes("前景") ||
    lowered.includes("offer")
  ) {
    return isTeacherMode
      ? "你别光盯着专业名字好不好听，最后还得看出口。志愿这件事，普通家庭最怕的不是不体面，是四年读完发现路太窄。你现在要么把最想报的两个专业发我，我直接帮你拆就业出口；要么我按“稳就业、能读研、留广东”这三个标准给你重新筛一遍。"
      : "如果你更重视就业前景，我们就要优先看专业出口、城市机会和读研延展性，而不是只看学校名气。你可以把最想报的两个专业发给我，我帮你做更细的就业导向比较。";
  }

  if (
    content.includes("调剂") ||
    content.includes("滑档") ||
    content.includes("风险") ||
    content.includes("稳不稳")
  ) {
    return isTeacherMode
      ? "风险这块我先给你泼个冷水。很多人不是分不够，是志愿顺序和专业组判断出了问题。尤其广东这种专业组玩法，组线稳，不等于你想要的专业稳。你下一步最该做的，是把不能接受的专业组先剔掉，再看保底够不够。你要是愿意，我下一条就按你现在这份方案，给你挑出最危险的 3 个位置。"
      : "如果你担心滑档、调剂或专业组风险，我们接下来最应该做的是检查志愿顺序、保底数量，以及每个专业组里是否存在你不能接受的专业。你愿意的话，我可以按你当前方案帮你挑出最需要调整的部分。";
  }

  return isTeacherMode
    ? "我先不跟你说空话。你现在这套信息，已经够继续往下拆了。下一步最有价值的追问就三个方向：第一，学校和专业到底谁优先；第二，只留广东要牺牲多少层次；第三，哪些专业组看着稳其实最坑人。你挑一个，我直接往深里给你说。"
    : "从当前信息看，你可以继续围绕位次、专业方向、城市偏好和就业稳定性做取舍。如果你愿意，我可以继续帮你比较两所学校、两个专业，或者重新给你做一套更偏保守或更偏冲刺的志愿方案。";
}

function resolveDeepDiveChoice(content = "") {
  const normalized = String(content).replace(/\s+/g, "");

  if (
    /^(第一|1|一|第一个|先说第一|先讲第一|展开第一|第一条|第1个|第1条)$/.test(normalized) ||
    normalized.includes("学校和专业") ||
    normalized.includes("保学校") ||
    normalized.includes("保专业")
  ) {
    return "schoolMajor";
  }

  if (
    /^(第二|2|二|第二个|先说第二|先讲第二|展开第二|第二条|第2个|第2条)$/.test(normalized) ||
    normalized.includes("只留广东") ||
    normalized.includes("留广东")
  ) {
    return "guangdongOnly";
  }

  if (
    /^(第三|3|三|第三个|先说第三|先讲第三|展开第三|第三条|第3个|第3条)$/.test(normalized) ||
    normalized.includes("专业组") ||
    normalized.includes("最坑人") ||
    normalized.includes("暗坑")
  ) {
    return "majorGroupRisk";
  }

  return null;
}

function resolveFollowUpIntent(content = "", previousAssistantContent = "") {
  const normalized = String(content).replace(/\s+/g, "");
  const previous = String(previousAssistantContent || "");

  if (!normalized) {
    return null;
  }

  if (/^(继续|展开|细说|具体说|详细说|接着说|往下说)$/.test(normalized)) {
    if (previous.includes("学校层次") || previous.includes("专业优先") || previous.includes("保学校") || previous.includes("保专业")) {
      return "schoolMajor";
    }

    if (previous.includes("只留广东") || previous.includes("留广东") || previous.includes("城市不是不能保")) {
      return "guangdongOnly";
    }

    if (previous.includes("专业组") || previous.includes("组线看着够") || previous.includes("暗坑")) {
      return "majorGroupRisk";
    }
  }

  return null;
}

function buildFollowUpGuardrail({
  currentUserMessage = "",
  previousAssistantContent = ""
}) {
  const shortFollowUp = isShortFollowUpMessage(currentUserMessage);
  const previousAssistantSummary = summarizeAssistantReply(previousAssistantContent);

  return [
    "本轮回答约束：",
    "1. 第一段必须顺着用户这次追问往下说，不要把上一轮结论原样重讲。",
    "2. 如果用户这次只是短句追问，比如“继续”“展开”“第一”“1+2”，要默认这是延续上一轮，不要重新起题。",
    "3. 如果上一轮已经给过结论，这一轮优先补充原因、风险、取舍和下一步动作。",
    `4. 用户这次是否属于短句追问：${shortFollowUp ? "是" : "否"}`,
    `5. 上一轮助手回答摘要：${previousAssistantSummary || "无"}`
  ].join("\n");
}

function isShortFollowUpMessage(content = "") {
  const normalized = String(content).trim();
  if (!normalized) {
    return false;
  }

  if (normalized.length <= 8) {
    return true;
  }

  return /^(继续|展开|具体说|详细说|接着说|然后呢|第一|第二|第三|1|2|3|1\+2|1和2|12|123)$/i.test(
    normalized.replace(/\s+/g, "")
  );
}

function summarizeAssistantReply(content = "") {
  const normalized = String(content).replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized.length > 120 ? `${normalized.slice(0, 120)}...` : normalized;
}

function postProcessProviderReply({
  reply = "",
  advisorMode = "xuefeng",
  planningContext,
  previousAssistantContent = ""
}) {
  const trimmed = String(reply || "").trim();
  if (!trimmed) {
    return "";
  }

  const cleaned = collapseRepeatedParagraphs(trimmed);
  const withNextStep = ensureNextStepLine(cleaned, advisorMode, planningContext);
  const previousNormalized = normalizeForComparison(previousAssistantContent);
  const currentNormalized = normalizeForComparison(withNextStep);

  if (previousNormalized && currentNormalized && previousNormalized === currentNormalized) {
    return "";
  }

  return withNextStep;
}

function collapseRepeatedParagraphs(reply = "") {
  const paragraphs = String(reply)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return "";
  }

  const deduped = [];
  for (const paragraph of paragraphs) {
    const normalized = normalizeForComparison(paragraph);
    const alreadyExists = deduped.some((existing) => normalizeForComparison(existing) === normalized);
    if (!alreadyExists) {
      deduped.push(paragraph);
    }
  }

  return deduped.join("\n\n");
}

function ensureNextStepLine(reply = "", advisorMode = "xuefeng", planningContext) {
  const trimmed = String(reply).trim();
  if (!trimmed) {
    return "";
  }

  if (/下一步|你接下来|你下一句|接下来你可以/.test(trimmed)) {
    return trimmed;
  }

  const suggestion = buildNextStepSuggestion(advisorMode, planningContext);
  return `${trimmed}\n\n${suggestion}`;
}

function buildNextStepSuggestion(advisorMode = "xuefeng", planningContext) {
  const rushSchool = planningContext?.applicationPlan?.[0]?.schools?.[0];
  const safeSchool = planningContext?.applicationPlan?.[2]?.schools?.[0];

  if (advisorMode === "xuefeng") {
    if (rushSchool && safeSchool) {
      return `下一步你就直接追问我这两件事里的一件：一是 ${rushSchool.university} 为什么能冲但不能乱冲，二是 ${safeSchool.university} 为什么能当真正保底。`;
    }

    return "下一步你就别泛泛地问了，直接点名让我拆一所学校、一个专业组，或者让我重排冲稳保。";
  }

  if (rushSchool && safeSchool) {
    return `下一步你可以继续问我：${rushSchool.university} 适不适合放在冲刺层，或者 ${safeSchool.university} 能不能作为更稳的保底。`;
  }

  return "下一步你可以继续让我比较两所学校、两类专业，或者让我把当前志愿表再调整得更稳一点。";
}

function shouldUseFallbackReply(reply = "", previousAssistantContent = "") {
  const current = normalizeForComparison(reply);
  const previous = normalizeForComparison(previousAssistantContent);

  if (!current) {
    return true;
  }

  if (!previous) {
    return false;
  }

  if (current === previous) {
    return true;
  }

  if (current.length > 24 && previous.includes(current)) {
    return true;
  }

  if (previous.length > 24 && current.includes(previous)) {
    return true;
  }

  const currentHead = current.slice(0, 80);
  const previousHead = previous.slice(0, 80);
  return Boolean(currentHead && currentHead === previousHead);
}

function normalizeForComparison(content = "") {
  return String(content)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。、“”"':：;；!！?？（）()\[\]【】,.]/g, "");
}
