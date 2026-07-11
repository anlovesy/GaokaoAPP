import OpenAI from "openai";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

export async function generateOpenAISummary(input) {
  const client = getClient();
  if (!client) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.5";
  const prompt = `
你是一名高考志愿规划顾问。请基于学生画像输出一段简洁但专业的分析，重点包括：
1. 学生画像概述
2. 志愿填报策略
3. 职业规划建议
4. 3 条高风险提醒

请严格输出 JSON，字段结构如下：
{
  "overview": "string",
  "strategy": "string",
  "careerAdvice": "string",
  "riskAlerts": ["string", "string", "string"]
}

学生画像：
${JSON.stringify(input, null, 2)}
`;

  const response = await client.responses.create({
    model,
    input: prompt
  });

  const text = response.output_text?.trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
