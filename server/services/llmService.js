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
  messages,
  planningContext
}) {
  const providerId = resolveProviderId(preferredProvider);

  if (!providerId) {
    return {
      provider: "local",
      model: "local-fallback",
      reply: buildLocalChatReply(messages, planningContext)
    };
  }

  const systemPrompt = `
你是一名中国高考志愿顾问，请始终使用中文回答。

要求：
1. 回答要围绕高考志愿、大学、专业、城市、就业、读研和风险判断。
2. 如果用户问到录取确定性，强调需要结合官方最新数据核验。
3. 如果已有志愿推荐结果，优先基于现有结果解释，不要脱离上下文空谈。
4. 用自然、耐心、咨询师式的口吻回答。
`;

  const planningNarrative = planningContext
    ? `以下是当前规划上下文，可作为回答依据：\n${JSON.stringify(planningContext, null, 2)}`
    : "当前没有已生成的正式志愿方案，请根据用户提问给出一般性志愿建议。";

  const userPrompt = `${planningNarrative}\n\n用户消息历史：\n${JSON.stringify(messages, null, 2)}`;
  const reply = await invokeProvider({
    providerId,
    systemPrompt,
    userPrompt,
    jsonMode: false
  });

  return {
    provider: providerId,
    model: getProviderModel(providerId),
    reply: reply || buildLocalChatReply(messages, planningContext)
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

function buildLocalChatReply(messages, planningContext) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const content = latestUserMessage?.content || "";

  if (!planningContext) {
    return "现在还没有生成正式志愿方案。你可以先填写分数、位次、兴趣和职业规划，我再结合这些信息帮你分析学校优先、专业优先还是城市优先。";
  }

  if (content.includes("学校优先") || content.includes("专业优先")) {
    return "如果你已经有比较明确的职业方向，通常建议优先专业；如果你暂时方向不清晰，但位次足以进入更强的平台型大学，可以适度考虑学校优先。你也可以把你最在意的就业、读研、城市因素告诉我，我可以按这三项重新排序。";
  }

  if (content.includes("为什么") || content.includes("推荐")) {
    const firstTier = planningContext.applicationPlan?.[0];
    const firstSchool = firstTier?.schools?.[0];
    if (firstSchool) {
      return `系统优先推荐 ${firstSchool.university} 的 ${firstSchool.major}，主要是因为它在当前位次模型下处于 ${firstTier.tierLabel}，并且和你的兴趣、职业规划及筛选条件匹配度较高。正式填报前，仍建议对照最新官方录取位次核验。`;
    }
  }

  return "从当前信息看，你可以继续围绕位次、专业方向、城市偏好和就业稳定性做取舍。如果你愿意，我可以继续帮你比较两所学校、两个专业，或者重新给你做一套更偏保守 / 更偏冲刺的志愿方案。";
}
