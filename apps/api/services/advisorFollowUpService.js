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

  if (containsExplicitEntityQuestion(currentUserMessage)) {
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
  const followUpContext = {
    rushSchool,
    steadySchool,
    safeSchool,
    planningContext,
    currentUserMessage
  };
  const naturalDirectShortcutReply = buildNaturalDirectShortcutFollowUpReply({
    advisorMode,
    currentUserMessage,
    previousAssistantContent,
    context: followUpContext
  });

  if (naturalDirectShortcutReply) {
    return naturalDirectShortcutReply;
  }

  const directShortcutReply = buildDirectShortcutFollowUpReply({
    advisorMode,
    currentUserMessage,
    previousAssistantContent,
    context: followUpContext
  });

  if (directShortcutReply) {
    return directShortcutReply;
  }

  const structuredFollowUpReply = buildStructuredListFollowUpReply({
    advisorMode,
    currentUserMessage,
    previousAssistantContent,
    context: followUpContext
  });

  if (structuredFollowUpReply) {
    return structuredFollowUpReply;
  }

  const topic =
    inferNaturalTopicFromConversation({
      currentUserMessage,
      previousAssistantContent,
      lastUserTurns
    }) ||
    inferAdvisorTopicFromConversation({
      currentUserMessage,
      previousAssistantContent,
      lastUserTurns
    });

  if (!shortFollowUp && !topic) {
    return "";
  }

  return advisorMode === "xuefeng"
    ? buildTeacherModeFollowUpReply(topic, followUpContext)
    : buildCoachModeFollowUpReply(topic, followUpContext);
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

  if (/(灏变笟|鍑哄彛|钖祫|琛屼笟|鑰冪爺|璇荤爺)/.test(currentUserMessage)) {
    return "schoolMajor";
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

  const naturalTopic = classifyPreviousAssistantTopic(previous);
  if (naturalTopic) {
    return naturalTopic;
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

  if (/(灏变笟|鍑哄彛|钖祫|璇荤爺)/.test(previous)) {
    return "schoolMajor";
  }

  return "safe";
}

function isShortFollowUpMessage(content = "") {
  const normalized = String(content).trim();
  if (!normalized) {
    return false;
  }

  if (
    /^(继续|展开|接着说|然后呢|具体说说|详细说说|前两个|前两条|前两点|第一个|第二个|第三个|1和2|1\+2|12|123|继续按就业说|继续按城市说|继续按专业说)$/i.test(
      normalized.replace(/\s+/g, "")
    )
  ) {
    return true;
  }

  if (normalized.length <= 8) {
    return true;
  }

  return /^(继续|展开|具体说|详细说|接着说|然后呢|第一|第二|第三|1|2|3|1\+2|1和2|12|123)$/i.test(
    normalized.replace(/\s+/g, "")
  );
}

function buildNaturalDirectShortcutFollowUpReply({
  advisorMode = "xuefeng",
  currentUserMessage = "",
  previousAssistantContent = "",
  context = {}
}) {
  const topics = resolveNaturalDirectShortcutTopics({
    currentUserMessage,
    previousAssistantContent
  });

  if (!topics.length) {
    return "";
  }

  const segments = topics
    .map((topic) =>
      advisorMode === "xuefeng"
        ? buildTeacherModeFollowUpReply(topic, context)
        : buildCoachModeFollowUpReply(topic, context)
    )
    .map((segment) => String(segment || "").trim())
    .filter(Boolean);

  if (!segments.length) {
    return "";
  }

  if (segments.length === 1) {
    return segments[0];
  }

  return [
    advisorMode === "xuefeng"
      ? "你这句是在点上一轮的几个展开项，我就不重起话题，按顺序往下接。"
      : "我接着你刚才点到的几个方向继续往下说。",
    ...segments
  ].join("\n\n");
}

function resolveNaturalDirectShortcutTopics({
  currentUserMessage = "",
  previousAssistantContent = ""
}) {
  const normalized = String(currentUserMessage || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  const previousTopic = classifyPreviousAssistantTopic(previousAssistantContent);

  if (!normalized) {
    return [];
  }

  if (/^(前两个|前两条|前两点|前2个|1和2|1\+2|12|继续1和2)$/.test(normalized)) {
    return ["schoolMajor", "guangdong"];
  }

  if (/^(第一个|第一条|第一点|1)$/.test(normalized)) {
    return ["schoolMajor"];
  }

  if (/^(第二个|第二条|第二点|2)$/.test(normalized)) {
    return ["guangdong"];
  }

  if (/^(第三个|第三条|第三点|3)$/.test(normalized)) {
    return ["major"];
  }

  if (/^继续按?(就业|出口|薪资|读研)说?$/.test(normalized)) {
    return ["employment"];
  }

  if (/^继续按?(广东|城市|省内|本地)说?$/.test(normalized)) {
    return ["guangdong"];
  }

  if (/^继续按?(专业|调剂|选科)说?$/.test(normalized)) {
    return ["major"];
  }

  if (/^(继续|展开|接着说|然后呢|具体说说|详细说说)$/.test(normalized)) {
    return previousTopic ? [previousTopic] : [];
  }

  return [];
}

function inferNaturalTopicFromConversation({
  currentUserMessage = "",
  previousAssistantContent = "",
  lastUserTurns = []
}) {
  const normalized = String(currentUserMessage || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  const previous = String(previousAssistantContent || "");
  const joinedTurns = lastUserTurns.join(" ");

  if (!normalized) {
    return "";
  }

  if (/^(第一个|第一条|第一点|1)$/.test(normalized)) {
    return "schoolMajor";
  }

  if (/^(第二个|第二条|第二点|2)$/.test(normalized)) {
    return "guangdong";
  }

  if (/^(第三个|第三条|第三点|3)$/.test(normalized)) {
    return "major";
  }

  if (/(就业|出口|薪资|读研|考研)/.test(currentUserMessage)) {
    return "employment";
  }

  if (/(保底|滑档|兜底|安全|录取概率)/.test(currentUserMessage) || /(保底|滑档|兜底)/.test(previous)) {
    return "safe";
  }

  if (/(冲刺|往上冲|够不够冲)/.test(currentUserMessage) || /(冲刺|往上冲)/.test(previous)) {
    return "rush";
  }

  if (/(稳妥|主力层|中间|匹配)/.test(currentUserMessage) || /(主力层|稳住|稳妥)/.test(previous)) {
    return "steady";
  }

  if (/(专业组|调剂|选科|专业)/.test(currentUserMessage) || /(专业组|调剂|选科)/.test(previous)) {
    return "major";
  }

  if (/(广东|广州|深圳|省内|本地|城市)/.test(currentUserMessage) || /(广东|广州|深圳|省内)/.test(joinedTurns)) {
    return "guangdong";
  }

  if (/(学校和专业|保专业|保学校|平台|名气|中山大学|深圳大学)/.test(previous)) {
    return "schoolMajor";
  }

  if (/^(继续|展开|接着说|然后呢|具体说说|详细说说)$/.test(normalized)) {
    return classifyPreviousAssistantTopic(previous);
  }

  return "";
}

function classifyPreviousAssistantTopic(previousAssistantContent = "") {
  const previous = String(previousAssistantContent || "");
  if (!previous) {
    return "";
  }

  if (/(按就业|就业|出口|薪资|实习|读研|考研)/.test(previous)) {
    return "employment";
  }

  if (/(广东|省内|城市|本地|广州|深圳)/.test(previous)) {
    return "guangdong";
  }

  if (/(学校和专业|保专业|保学校|平台|名气|中山大学|深圳大学)/.test(previous)) {
    return "schoolMajor";
  }

  if (/(专业组|调剂|选科|专业)/.test(previous)) {
    return "major";
  }

  if (/(冲刺|往上冲)/.test(previous)) {
    return "rush";
  }

  if (/(主力层|稳住|稳妥)/.test(previous)) {
    return "steady";
  }

  if (/(保底|滑档|兜底|安全)/.test(previous)) {
    return "safe";
  }

  return "";
}

function buildStructuredListFollowUpReply({
  advisorMode = "xuefeng",
  currentUserMessage = "",
  previousAssistantContent = "",
  context = {}
}) {
  const selection = resolveStructuredFollowUpSelection(currentUserMessage);
  if (!selection) {
    return "";
  }

  const items = extractStructuredFollowUpItems(previousAssistantContent);
  if (!items.length) {
    return "";
  }

  const selectedItems = pickStructuredFollowUpItems(items, selection);
  const topics = [...new Set(selectedItems.map((item) => item.topic).filter(Boolean))];
  if (!topics.length) {
    return "";
  }

  const segments = topics
    .map((topic) =>
      advisorMode === "xuefeng"
        ? buildTeacherModeFollowUpReply(topic, context)
        : buildCoachModeFollowUpReply(topic, context)
    )
    .map((segment) => String(segment || "").trim())
    .filter(Boolean);

  if (!segments.length) {
    return "";
  }

  if (segments.length === 1) {
    return segments[0];
  }

  const intro =
    advisorMode === "xuefeng"
      ? "你这句是在接上一轮的展开项，我不重起话题，按顺序往下拆。"
      : "我接着上一轮你点到的几项继续往下展开。";

  return [intro, ...segments].join("\n\n");
}

function buildDirectShortcutFollowUpReply({
  advisorMode = "xuefeng",
  currentUserMessage = "",
  previousAssistantContent = "",
  context = {}
}) {
  const topics = resolveDirectShortcutTopics({
    currentUserMessage,
    previousAssistantContent
  });

  if (!topics.length) {
    return "";
  }

  const segments = topics
    .map((topic) =>
      advisorMode === "xuefeng"
        ? buildTeacherModeFollowUpReply(topic, context)
        : buildCoachModeFollowUpReply(topic, context)
    )
    .map((segment) => String(segment || "").trim())
    .filter(Boolean);

  if (!segments.length) {
    return "";
  }

  if (segments.length === 1) {
    return segments[0];
  }

  return [
    advisorMode === "xuefeng"
      ? "你这句是在点上一轮的几个展开项，我不重起话题，直接按顺序往下接。"
      : "我接着你刚才点到的几个方向继续往下说。",
    ...segments
  ].join("\n\n");
}

function resolveDirectShortcutTopics({
  currentUserMessage = "",
  previousAssistantContent = ""
}) {
  const normalized = String(currentUserMessage || "")
    .toLowerCase()
    .replace(/\s+/g, "");
  const previous = String(previousAssistantContent || "");

  if (!normalized) {
    return [];
  }

  if (/^(前两个|前两条|前两点|1和2|1\+2|12|继续12|继续1和2)$/.test(normalized)) {
    return ["schoolMajor", "guangdong"];
  }

  if (/^(第一个|第一条|第一点|1)$/.test(normalized)) {
    return ["schoolMajor"];
  }

  if (/^(第二个|第二条|第二点|2)$/.test(normalized)) {
    return ["guangdong"];
  }

  if (/^(第三个|第三条|第三点|3)$/.test(normalized)) {
    return ["major"];
  }

  if (/^继续按.+说$/.test(normalized)) {
    if (/就业|出口|薪资|行业|读研|考研/.test(currentUserMessage)) {
      return ["employment"];
    }
    if (/广东|城市|省内|本地/.test(currentUserMessage)) {
      return ["guangdong"];
    }
    if (/专业|调剂|选科/.test(currentUserMessage)) {
      return ["major"];
    }
  }

  if (/^(继续|展开|接着说|往下说|然后呢)$/.test(normalized)) {
    if (/中山大学|深圳大学|平台|学校和专业|就业|出口/.test(previous)) {
      return ["schoolMajor"];
    }
    if (/广东|省内|城市/.test(previous)) {
      return ["guangdong"];
    }
    if (/专业组|调剂|选科|专业/.test(previous)) {
      return ["major"];
    }
  }

  return [];
}

function resolveStructuredFollowUpSelection(content = "") {
  const normalized = normalizeFollowUpSelectionText(content);
  if (!normalized) {
    return null;
  }

  if (/^(前两个|前两条|前两点|前2个|前2条|前2点)$/.test(normalized)) {
    return { mode: "first", count: 2 };
  }

  if (/^(后两个|后两条|后两点|后2个|后2条|后2点)$/.test(normalized)) {
    return { mode: "last", count: 2 };
  }

  const singleIndex = matchStructuredSingleIndex(normalized);
  if (singleIndex) {
    return { mode: "indexes", indexes: [singleIndex] };
  }

  const indexGroup = matchStructuredIndexGroup(normalized);
  if (indexGroup.length >= 2) {
    return { mode: "indexes", indexes: indexGroup };
  }

  return null;
}

function normalizeFollowUpSelectionText(content = "") {
  return String(content || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/先说|先讲|展开|继续|接着|往下|就按|就说|说说|讲讲/g, "")
    .replace(/[，。！？、,.!?:：]/g, "");
}

function matchStructuredSingleIndex(content = "") {
  const matched = String(content || "").match(/^(?:第)?([一二三123])(?:个|条|点)?$/);
  return matched ? parseStructuredIndexToken(matched[1]) : 0;
}

function matchStructuredIndexGroup(content = "") {
  const compact = String(content || "");
  if (!/^[第123一二三个条点和与及加\+、]+$/.test(compact)) {
    return [];
  }

  const indexes = [...compact.matchAll(/第?([一二三123])/g)]
    .map((item) => parseStructuredIndexToken(item[1]))
    .filter(Boolean);

  return [...new Set(indexes)];
}

function parseStructuredIndexToken(token = "") {
  const normalized = String(token || "");
  if (normalized === "1" || normalized === "一") {
    return 1;
  }
  if (normalized === "2" || normalized === "二") {
    return 2;
  }
  if (normalized === "3" || normalized === "三") {
    return 3;
  }
  return 0;
}

function extractStructuredFollowUpItems(content = "") {
  const source = String(content || "").replace(/\r/g, "");
  if (!source) {
    return [];
  }

  const markerRegex = /(?:^|[\n\s])(?:(第[一二三四五六七八九十]+)|([1-9][0-9]?))\s*(?:[、.．:：）)]|\s)/g;
  const markers = [...source.matchAll(markerRegex)]
    .map((match) => {
      const marker = match[1] || match[2] || "";
      const index = parseStructuredMarkerIndex(marker);
      if (!index) {
        return null;
      }

      return {
        index,
        markerStart: match.index ?? 0,
        contentStart: (match.index ?? 0) + match[0].length
      };
    })
    .filter(Boolean);

  if (!markers.length) {
    return [];
  }

  return markers
    .map((marker, currentIndex) => {
      const nextMarker = markers[currentIndex + 1];
      const rawText = source.slice(marker.contentStart, nextMarker?.markerStart ?? source.length).trim();
      const topic = inferStructuredItemTopic(rawText);

      return topic
        ? {
            index: marker.index,
            text: rawText,
            topic
          }
        : null;
    })
    .filter(Boolean);
}

function parseStructuredMarkerIndex(marker = "") {
  const normalized = String(marker || "");
  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  const ordinal = normalized.replace(/^第/, "");
  const mapping = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10
  };

  return mapping[ordinal] || 0;
}

function inferStructuredItemTopic(content = "") {
  const text = String(content || "");

  if (/(瀛︽牎.*涓撲笟|淇濆鏍淇濅笓涓歔骞冲彴)/.test(text)) {
    return "schoolMajor";
  }

  if (/(骞夸笢|骞垮窞|娣卞湷|鐪佸唴|鏈湴|鍩庡競)/.test(text)) {
    return "guangdong";
  }

  if (/(涓撲笟缁刓璋冨墏|閫夌|涓撲笟)/.test(text)) {
    return "major";
  }

  if (/(淇濆簳|婊戞。|鍏滃簳|瀹夊叏|褰曞彇姒傜巼)/.test(text)) {
    return "safe";
  }

  if (/(鍐插埡|寰€涓婂啿)/.test(text)) {
    return "rush";
  }

  if (/(涓诲姏|涓棿|绋冲Ε|鍖归厤)/.test(text)) {
    return "steady";
  }

  if (/(灏变笟|鍑哄彛|钖祫|琛屼笟|璇荤爺|鑰冪爺)/.test(text)) {
    return "schoolMajor";
  }

  return "";
}

function pickStructuredFollowUpItems(items = [], selection = null) {
  if (!selection || !items.length) {
    return [];
  }

  if (selection.mode === "first") {
    return items.slice(0, selection.count || 1);
  }

  if (selection.mode === "last") {
    return items.slice(-Math.max(selection.count || 1, 1));
  }

  if (selection.mode === "indexes") {
    return selection.indexes
      .map((index) => items.find((item) => item.index === index))
      .filter(Boolean);
  }

  return [];
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

  /* if (topic === "employment") {
    return [
      "浣犺鏄寜灏变笟杩欎釜缁村害缁х画鍚紝閭ｆ垜灏变笉鍐嶆瘮璋佸悕姘斿ぇ浜嗭紝鐩存帴姣斿摢鏉¤矾鏇寸洿銆?",
      steadySchool
        ? `鍍?${steadySchool.university} 杩欑涓诲姏灞傜殑 ${steadySchool.major}锛岄€氬父浣犲洓骞村悗鎵惧疄涔犮€佹壘宸ヤ綔鐨勮矾浼氭瘮杈冮『锛屽洜涓哄畠绂诲疄闄呭嚭鍙ｆ洿杩戙€俙
        : "",
      rushSchool
        ? `鍐嶅儚 ${rushSchool.university} 杩欑鍐插埡灞傦紝浼樼偣鏄钩鍙版洿浜紝浣嗗鏋滀笓涓氱粍鏈韩灏变笉绋筹紝閭ｄ綘鍚庨潰鐨勫氨涓氱‘瀹氭€т篃浼氳窡鐫€鎵撴姌鎵ｃ€俙
        : "",
      "鐪熸鎸夊氨涓氭潵閫夛紝鐪嬩笁浠朵簨灏卞浜嗭細涓撲笟鍑哄彛鏄笉鏄洿銆佸煄甯傚疄涔犺祫婧愬己涓嶅己銆佷綘鍥涘勾鍚庢槸涓嶆槸鑳介『鐫€杩欐潯璺洿鎺ュ氨涓氥€?",
      "浣犱笅涓€鍙ュ彲浠ョ洿鎺ヨ鎴戞寜鈥滃氨涓氥€佽鐮斻€佸煄甯傝祫婧愨€濊繖涓変釜缁村害锛屾妸浣犵幇鍦ㄧ湅鐨勪袱鎵€瀛︽牎鎺掍釜椤哄簭銆?"
    ]
      .filter(Boolean)
      .join("");
  }

  if (topic === "employment") {
    return "濡傛灉浣犺鎸夊氨涓氱户缁媶锛屽缓璁洿鎺ユ瘮涓夋牱锛氫笓涓氬嚭鍙ｃ€佸煄甯傚疄涔犺祫婧愬拰鍥涘勾鍚庣殑钀藉湴纭畾鎬с€?";
  }

  } */

  if (topic === "employment") {
    return [
      "你要是按就业这个维度继续听，那我就不再比谁名气大了，直接比哪条路更直。",
      steadySchool
        ? `${steadySchool.university} 的 ${steadySchool.major} 更像主力层选择，实习、落地和就业出口通常更顺。`
        : "",
      rushSchool
        ? `${rushSchool.university} 这种冲刺位优点是平台更亮，但如果专业组本身不稳，就业确定性也会跟着打折。`
        : "",
      "真按就业来选，重点只看三件事：专业出口直不直、城市实习资源强不强、四年后能不能顺着这条路直接落地。",
      "你下一句可以直接让我按就业、读研、城市资源三个维度，把你现在看的两所学校排个顺序。"
    ]
      .filter(Boolean)
      .join("");
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

function containsExplicitEntityQuestion(content = "") {
  const text = String(content || "").trim();
  if (!text) {
    return false;
  }

  return (
    /^[\u4e00-\u9fa5A-Za-z()（）·]{2,24}(大学|学院|医学院|师范大学|职业技术大学|职业技术学院)$/.test(
      text
    ) ||
    /^[\u4e00-\u9fa5A-Za-z()（）·]{2,24}(专业|工程|科学与技术|医学|管理|法学|经济学)$/.test(text)
  );
}
