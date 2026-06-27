export function buildDynamicAdvisorFollowUpReply({
  messages,
  planningContext,
  advisorMode = "xuefeng",
  currentUserMessage = "",
  previousAssistantContent = ""
}) {
  if (!planningContext) {
    return "";
  }

  const normalized = String(currentUserMessage || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  if (!normalized) {
    return "";
  }

  const shortFollowUp = isShortFollowUpMessage(currentUserMessage);
  const plan = planningContext?.applicationPlan || [];
  const rushSchool = plan?.[0]?.schools?.[0] || null;
  const steadySchool = plan?.[1]?.schools?.[0] || null;
  const safeSchool = plan?.[2]?.schools?.[0] || null;
  const lastUserTurns = [...messages]
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => String(message.content || "").trim())
    .filter(Boolean);
  const topic = inferAdvisorTopicFromConversation({
    currentUserMessage,
    previousAssistantContent,
    lastUserTurns
  });

  if (!shortFollowUp && !topic) {
    return "";
  }

  return advisorMode === "xuefeng"
    ? buildTeacherModeFollowUpReply(topic, {
        rushSchool,
        steadySchool,
        safeSchool,
        planningContext,
        currentUserMessage
      })
    : buildCoachModeFollowUpReply(topic, {
        rushSchool,
        steadySchool,
        safeSchool,
        currentUserMessage
      });
}

function inferAdvisorTopicFromConversation({
  currentUserMessage = "",
  previousAssistantContent = "",
  lastUserTurns = []
}) {
  const normalized = String(currentUserMessage).replace(/\s+/g, "").toLowerCase();
  const previous = String(previousAssistantContent || "");
  const joinedTurns = lastUserTurns.join(" ");

  if (/^(第一|1|第一个|先说第一|展开第一)$/.test(normalized)) {
    return "schoolMajor";
  }

  if (/^(第二|2|第二个|先说第二|展开第二)$/.test(normalized)) {
    return "guangdong";
  }

  if (/^(第三|3|第三个|先说第三|展开第三)$/.test(normalized)) {
    return "major";
  }

  if (
    /(保底|滑档|兜底|安全|稳不稳|录取率|概率)/.test(currentUserMessage) ||
    /(保底|滑档|兜底)/.test(previous)
  ) {
    return "safe";
  }

  if (/(冲|冲刺|够不够冲|往上冲)/.test(currentUserMessage) || /(冲刺|往上冲)/.test(previous)) {
    return "rush";
  }

  if (/(稳|主力|中间|匹配)/.test(currentUserMessage) || /(主力层|稳住)/.test(previous)) {
    return "steady";
  }

  if (
    /(专业|专业组|调剂|选科|限制)/.test(currentUserMessage) ||
    /(专业组|调剂|选科)/.test(previous)
  ) {
    return "major";
  }

  if (/(广东|广州|深圳|本地|省内)/.test(currentUserMessage) || /广东/.test(joinedTurns)) {
    return "guangdong";
  }

  if (/(继续|展开|具体|然后|再说|接着|1\+2|12|123)/.test(normalized)) {
    if (/(保底|滑档|兜底)/.test(previous)) {
      return "safe";
    }
    if (/(冲刺|往上冲)/.test(previous)) {
      return "rush";
    }
    if (/(主力层|稳住)/.test(previous)) {
      return "steady";
    }
    if (/(专业组|调剂|选科)/.test(previous)) {
      return "major";
    }
  }

  return shortFollowUpFallbackTopic(previousAssistantContent);
}

function shortFollowUpFallbackTopic(previousAssistantContent = "") {
  const previous = String(previousAssistantContent || "");
  if (!previous) {
    return "";
  }

  if (/(保底|滑档|兜底)/.test(previous)) {
    return "safe";
  }
  if (/(冲刺|往上冲)/.test(previous)) {
    return "rush";
  }
  if (/(主力层|稳住)/.test(previous)) {
    return "steady";
  }
  if (/(专业组|调剂|选科)/.test(previous)) {
    return "major";
  }
  if (/(学校和专业|保学校|保专业)/.test(previous)) {
    return "schoolMajor";
  }

  return "safe";
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

function buildTeacherModeFollowUpReply(topic, context) {
  const { rushSchool, steadySchool, safeSchool, planningContext, currentUserMessage } = context;
  const riskProfile = planningContext?.diagnosis?.riskProfile;

  if (topic === "schoolMajor") {
    const anchorSchool = steadySchool || safeSchool || rushSchool;
    return [
      anchorSchool
        ? `我就接着你刚才的“第一”往下说。真到填表时，学校和专业不是谁永远压谁一头，而是看你这分数够不够支撑两头都要。像 ${anchorSchool.university} 这种位置，更适合先看专业组能不能接受，再决定值不值得为了学校名头去冒风险。`
        : "我就接着你刚才的“第一”往下说。学校和专业到底谁优先，核心不是口号，是你有没有明确职业方向。",
      "如果以后就是想靠专业吃饭，比如工科、医学、计算机这类，专业优先级就不能让得太狠。要是方向还不够明确，但平台差距特别大，学校可以适度往前提。",
      "你下一句要是愿意，我就直接按你这张表告诉你，哪几所该保专业，哪几所可以保学校。"
    ].join("");
  }

  if (topic === "rush" && rushSchool) {
    return [
      `我接着往下说，冲刺层不是让你乱冲，重点要看 ${rushSchool.university} 的 ${rushSchool.major} 这种位置。`,
      "这类学校的逻辑是平台更高，但录取波动也更大，所以它只能承担“往上够一够”的功能，不能替代主力层。",
      `你现在这张表里，冲 ${riskProfile?.rushCount || 0} 个可以，但前提是稳和保得站住。下一步你要是愿意，我就继续帮你拆这所为什么能冲、又为什么不能当主力。`
    ].join("");
  }

  if (topic === "steady" && steadySchool) {
    return [
      `主力层我更建议你盯住 ${steadySchool.university} 的 ${steadySchool.major}。`,
      "因为真正决定你最后结果的，往往不是最上面那几个冲刺，而是中间这批既够得着、又读得下去、还能接受的学校。",
      "你继续追问的话，我下一条就直接帮你判断这所到底该留在稳，还是应该降到保。"
    ].join("");
  }

  if (topic === "major") {
    const anchorSchool = steadySchool || safeSchool || rushSchool;
    return [
      anchorSchool
        ? `你现在最该防的，是像 ${anchorSchool.university} 这种专业组里“组线能进、目标专业未必稳”的情况。`
        : "你现在最该防的，是专业组看着能报，实际进组以后专业并不一定能拿到。",
      "尤其是历史类考生，专业限制一定要卡死，不能为了有学校报就把明显不符选科要求的专业混进去。",
      "你要是点名一所学校，我下一条就按选科限制、专业组冷热和调剂风险给你拆。"
    ].join("");
  }

  if (topic === "guangdong") {
    return [
      "只留广东当然可以，但我得跟你说明白，省内优先的代价，通常就是城市、学校层次和专业热度三件事里至少让一件。",
      safeSchool
        ? `所以保底层至少要有一所像 ${safeSchool.university} 这样的真兜底，不然城市一锁死，整张表就容易发脆。`
        : "所以你更要把保底层垫厚，不能只盯着前面几所好听的学校。",
      "你要是继续，我可以直接按“只留广东”的思路给你把整张表重讲一遍。"
    ].join("");
  }

  if (topic === "safe" && safeSchool) {
    const askEnough = /够不够/.test(currentUserMessage);
    return askEnough
      ? [
          `你这句问得对，保底够不够，关键不是看有没有“保”这个字，而是看保底层有没有真正能兜住的学校。像 ${safeSchool.university} 的 ${safeSchool.major} 这种位置，现在只能算你保底层里的一个锚点。`,
          `如果整张表里只剩 ${riskProfile?.safeCount || 0} 个保底，而且高把握项不够厚，那就还不算够。真正稳的表，至少要让你最后几志愿就算前面失手，也大概率不会滑档。`,
          "你下一句可以直接让我给你判断：现在哪几所算真保底，哪几所只是看起来像保底。"
        ].join("")
      : [
          `你刚才这个追问，我不重新起题，直接接着说保底层。${safeSchool.university} 的 ${safeSchool.major} 这种位置，价值不是好看，是把滑档风险压下去。`,
          "真正的保底，录取位次要明显站在你后面，而且不能离得太夸张，既要安全，也要保证读出来不后悔。",
          "你下一句可以直接问我，这所为什么算真保底，或者你现在哪几所保底还不够稳。"
        ].join("");
  }

  return "";
}

function buildCoachModeFollowUpReply(topic, context) {
  const { rushSchool, steadySchool, safeSchool, currentUserMessage } = context;

  if (topic === "schoolMajor") {
    return "如果继续拆“学校和专业谁优先”，建议下一步直接按你现在这张表区分成‘保专业’和‘保学校’两组，再分别排序。";
  }

  if (topic === "rush" && rushSchool) {
    return `继续往下看的话，冲刺层更值得重点分析的是 ${rushSchool.university} 的 ${rushSchool.major}。它更适合承担“上冲”的作用，而不适合作为主力选择。`;
  }

  if (topic === "steady" && steadySchool) {
    return `如果接着细化，中间主力层可以重点看 ${steadySchool.university} 的 ${steadySchool.major}，因为它更接近“能报、能读、能接受”的平衡点。`;
  }

  if (topic === "major") {
    return "如果你想继续追问专业组风险，我建议下一步直接点名一所学校，我可以结合选科限制、专业冷热和调剂风险继续拆解。";
  }

  if (topic === "guangdong") {
    return "如果范围继续限定在广东，我建议优先检查保底层是否足够厚，再决定是否继续坚持城市和学校层次偏好。";
  }

  if (topic === "safe" && safeSchool) {
    return /够不够/.test(currentUserMessage)
      ? `如果你在问保底够不够，现在最该检查的是除了 ${safeSchool.university} 之外，是否还有足够多的高把握保底项来分散滑档风险。`
      : `继续往下说的话，保底层可以优先看 ${safeSchool.university} 的 ${safeSchool.major}，它的作用主要是降低滑档风险。`;
  }

  return "";
}
