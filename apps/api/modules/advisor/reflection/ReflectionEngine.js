export class ReflectionEngine {
  review({
    reply = "",
    intentResult = null,
    executionPlan = null,
    toolExecution = null,
    formattedCitations = null,
    contextPacket = null,
    memorySnapshot = null
  } = {}) {
    const issues = [];
    const checks = [];
    const primaryIntent = intentResult?.primaryIntent || "general_follow_up";
    const plannedTools = executionPlan?.plannedTools || [];
    const evidence = toolExecution?.evidence || {};
    const citations = formattedCitations?.citations || [];
    const replyText = String(reply || "");

    checks.push(checkMissingExternalEvidence({ primaryIntent, plannedTools, evidence, citations }));
    checks.push(checkProfileCompleteness({ primaryIntent, contextPacket, memorySnapshot }));
    checks.push(checkReplyGrounding({ replyText, evidence }));
    checks.push(checkCitationCoverage({ plannedTools, citations }));
    checks.push(checkWorkspaceAnchors({ replyText, contextPacket }));
    checks.push(checkComparisonCoverage({ toolExecution }));
    checks.push(checkReplySpecificity({ replyText, toolExecution }));
    checks.push(checkReplyGenericity({ replyText, evidence, toolExecution }));

    checks.filter(Boolean).forEach((check) => {
      if (check.issue) {
        issues.push(check.issue);
      }
    });

    const severityRank = resolveSeverityRank(issues);
    return {
      version: "reflection-engine-v3",
      status: severityRank >= 3 ? "warn" : "pass",
      severity: severityRank >= 3 ? "medium" : "low",
      checks,
      issues,
      reviewRequired: severityRank >= 3,
      narrative: buildReflectionNarrative({ checks, issues })
    };
  }
}

export function createReflectionEngine() {
  return new ReflectionEngine();
}

function checkMissingExternalEvidence({ primaryIntent, plannedTools, evidence, citations }) {
  const evidenceSensitiveIntents = new Set([
    "school_recommendation",
    "major_recommendation",
    "risk_analysis",
    "policy_consulting",
    "university_lookup"
  ]);
  const externalTools = plannedTools.filter(
    (tool) => !["workspace_data", "knowledge_base"].includes(tool)
  );
  const hasExternalEvidence = hasStructuredEvidence(evidence);

  const passed = !evidenceSensitiveIntents.has(primaryIntent) || hasExternalEvidence;
  return {
    check: "external_evidence_presence",
    passed,
    detail: passed
      ? "Evidence-sensitive intent has supporting evidence or does not require it."
      : "Intent requires external evidence, but no supporting data was collected.",
    issue: !passed
      ? {
          code: "MISSING_EXTERNAL_EVIDENCE",
          severity: "medium",
          message: `Planned tools were ${externalTools.join(", ") || "none"}, but collected citations: ${citations.length}.`
        }
      : null
  };
}

function checkProfileCompleteness({ primaryIntent, contextPacket, memorySnapshot }) {
  const profile = contextPacket?.profile || memorySnapshot?.profile || {};
  const needsRankData = ["school_recommendation", "major_recommendation", "risk_analysis"].includes(
    primaryIntent
  );
  const passed = !needsRankData || Boolean(profile.province && profile.track && profile.score && profile.rank);

  return {
    check: "profile_completeness",
    passed,
    detail: passed
      ? "Profile fields required by the current intent are present."
      : "Current intent needs province/track/score/rank, but one or more fields are missing.",
    issue: !passed
      ? {
          code: "PROFILE_INCOMPLETE_FOR_INTENT",
          severity: "medium",
          message: "Profile missing province, track, score, or rank for recommendation/risk intent."
        }
      : null
  };
}

function checkReplyGrounding({ replyText, evidence }) {
  const asksForEvidence = /录取|位次|分数|概率|稳|冲|保|招生计划|学费|政策/.test(replyText);
  const hasEvidence = hasStructuredEvidence(evidence);
  const passed = !asksForEvidence || hasEvidence;

  return {
    check: "reply_grounding",
    passed,
    detail: passed
      ? "Reply has matching evidence coverage for factual admission/policy claims."
      : "Reply appears to discuss factual admission/policy claims without supporting evidence.",
    issue: !passed
      ? {
          code: "REPLY_NOT_GROUNDED",
          severity: "medium",
          message: "Reply references factual admissions/policy style claims without matching evidence."
        }
      : null
  };
}

function checkCitationCoverage({ plannedTools, citations }) {
  const evidenceTools = plannedTools.filter((tool) =>
    [
      "admission_database",
      "enrollment_plan_database",
      "university_database",
      "major_database",
      "policy_database",
      "employment_database"
    ].includes(tool)
  );
  const passed = evidenceTools.length === 0 || citations.length > 0;

  return {
    check: "citation_coverage",
    passed,
    detail: passed
      ? "Citation output is present when evidence tools are used."
      : "Evidence tools were invoked, but no citations were surfaced.",
    issue: !passed
      ? {
          code: "CITATION_MISSING",
          severity: "low",
          message: "Evidence tools ran but no formatted citations were returned."
        }
      : null
  };
}

function checkWorkspaceAnchors({ replyText, contextPacket }) {
  const anchors = [
    contextPacket?.workspace?.topRush?.university,
    contextPacket?.workspace?.topSteady?.university,
    contextPacket?.workspace?.topSafe?.university
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (!anchors.length || !replyText) {
    return {
      check: "workspace_anchor_alignment",
      passed: true,
      detail: "No workspace anchors required for this reply.",
      issue: null
    };
  }

  const mentionsAnchor = anchors.some((anchor) => replyText.includes(anchor));
  return {
    check: "workspace_anchor_alignment",
    passed: mentionsAnchor || !/学校|院校|大学|志愿/.test(replyText),
    detail: mentionsAnchor
      ? "Reply aligns with at least one current workspace anchor."
      : "Reply does not explicitly reference any current workspace anchor.",
    issue: !mentionsAnchor && /学校|院校|大学|志愿/.test(replyText)
      ? {
          code: "ANCHOR_ALIGNMENT_WEAK",
          severity: "low",
          message: "Reply discusses school choices but does not reference current workspace anchors."
        }
      : null
  };
}

function checkComparisonCoverage({ toolExecution }) {
  const comparison = toolExecution?.entities?.comparison;

  if (!comparison?.active) {
    return {
      check: "comparison_coverage",
      passed: true,
      detail: "No comparison intent detected.",
      issue: null
    };
  }

  const evidence = toolExecution?.evidence || {};
  const expectedCount =
    comparison.type === "university"
      ? comparison.universities.length
      : comparison.type === "major"
        ? comparison.majors.length
        : Math.max(comparison.universities.length, comparison.majors.length);
  const actualCount = resolveComparisonEvidenceCount(comparison, evidence);
  const passed = expectedCount < 2 || actualCount >= 2;

  return {
    check: "comparison_coverage",
    passed,
    detail: passed
      ? "Comparison mode has multi-target evidence coverage."
      : "Comparison mode was detected, but the evidence bundle did not retain both targets.",
    issue: !passed
      ? {
          code: "COMPARISON_EVIDENCE_INCOMPLETE",
          severity: "medium",
          message: `Expected at least 2 comparison targets, but only retained ${actualCount}.`
        }
      : null
  };
}

function checkReplySpecificity({ replyText, toolExecution }) {
  const entities = toolExecution?.entities || {};
  const focusTargets = [
    entities?.primaryUniversity?.name,
    entities?.primaryMajor?.name,
    ...(entities?.comparison?.universities || []).map((item) => item.name),
    ...(entities?.comparison?.majors || []).map((item) => item.name)
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (!focusTargets.length || !replyText) {
    return {
      check: "reply_specificity",
      passed: true,
      detail: "No explicit entity focus required for this reply.",
      issue: null
    };
  }

  const mentionsFocus = focusTargets.some((target) => replyText.includes(target));
  return {
    check: "reply_specificity",
    passed: mentionsFocus,
    detail: mentionsFocus
      ? "Reply explicitly references the main entity or comparison target."
      : "Reply failed to mention the detected focus entity explicitly.",
    issue: !mentionsFocus
      ? {
          code: "REPLY_NOT_SPECIFIC",
          severity: "medium",
          message: `Expected the reply to mention one of: ${focusTargets.join(", ")}.`
        }
      : null
  };
}

function checkReplyGenericity({ replyText, evidence, toolExecution }) {
  if (!replyText) {
    return {
      check: "reply_genericity",
      passed: false,
      detail: "Reply is empty.",
      issue: {
        code: "REPLY_EMPTY",
        severity: "medium",
        message: "Reply text is empty."
      }
    };
  }

  const genericPattern =
    /(需要结合.*情况|建议结合.*情况|具体要看|综合来看|总体来说|一般来说|不能一概而论|因人而异|根据自身情况)/;
  const hasConcreteNumber = /\d{2,}/.test(replyText);
  const hasEvidenceKeyword =
    /(位次|分数|招生计划|学费|录取|专业组|保研|就业|城市|风险|冲刺|稳妥|保底)/.test(replyText);
  const hasEvidence = hasStructuredEvidence(evidence);
  const mentionsFocus = checkReplySpecificity({ replyText, toolExecution }).passed;
  const passed = !genericPattern.test(replyText) || hasConcreteNumber || hasEvidenceKeyword || mentionsFocus;

  return {
    check: "reply_genericity",
    passed,
    detail: passed
      ? "Reply contains enough concrete anchors to avoid generic filler."
      : "Reply reads as generic filler and lacks concrete anchors.",
    issue: !passed && hasEvidence
      ? {
          code: "REPLY_TOO_GENERIC",
          severity: "medium",
          message: "Evidence exists, but the reply still reads too generic."
        }
      : !passed
        ? {
            code: "REPLY_WEAKLY_STRUCTURED",
            severity: "low",
            message: "Reply lacks concrete anchors and may feel templated."
          }
        : null
  };
}

function buildReflectionNarrative({ checks, issues }) {
  const lines = [
    "Advisor Reflection:",
    ...checks.map((check) => `- ${check.check}: ${check.passed ? "pass" : "fail"}; ${check.detail}`)
  ];

  if (issues.length) {
    lines.push("- issues:");
    issues.forEach((issue) => {
      lines.push(`  - ${issue.code} (${issue.severity}): ${issue.message}`);
    });
  } else {
    lines.push("- issues: none");
  }

  return lines.join("\n");
}

function resolveSeverityRank(issues = []) {
  const severityMap = {
    low: 1,
    medium: 3,
    high: 5,
    critical: 7
  };

  return issues.reduce((max, issue) => Math.max(max, severityMap[issue.severity] || 0), 0);
}

function hasStructuredEvidence(evidence = {}) {
  return [
    evidence?.admissionEvidence,
    evidence?.planEvidence,
    evidence?.universityEvidence,
    evidence?.majorEvidence,
    evidence?.policyEvidence,
    evidence?.employmentEvidence
  ].some((item) => hasEvidenceItems(item));
}

function hasEvidenceItems(value) {
  if (!value) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (Array.isArray(value.items)) {
    return value.items.length > 0;
  }

  if (Array.isArray(value.targets)) {
    return value.targets.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return Boolean(value);
}

function resolveComparisonEvidenceCount(comparison, evidence) {
  if (comparison.type === "university") {
    if (Array.isArray(evidence?.universityEvidence?.targets)) {
      return evidence.universityEvidence.targets.length;
    }

    if (Array.isArray(evidence?.admissionEvidence?.items)) {
      return new Set(
        evidence.admissionEvidence.items.map((item) => String(item.university || "").trim()).filter(Boolean)
      ).size;
    }

    if (Array.isArray(evidence?.planEvidence?.items)) {
      return new Set(
        evidence.planEvidence.items.map((item) => String(item.university || "").trim()).filter(Boolean)
      ).size;
    }

    return 0;
  }

  if (comparison.type === "major") {
    if (Array.isArray(evidence?.majorEvidence?.targets)) {
      return evidence.majorEvidence.targets.length;
    }

    if (Array.isArray(evidence?.employmentEvidence?.targets)) {
      return evidence.employmentEvidence.targets.length;
    }

    if (Array.isArray(evidence?.admissionEvidence?.items)) {
      return new Set(
        evidence.admissionEvidence.items.map((item) => String(item.major || "").trim()).filter(Boolean)
      ).size;
    }

    return 0;
  }

  return Math.max(
    resolveComparisonEvidenceCount({ type: "university" }, evidence),
    resolveComparisonEvidenceCount({ type: "major" }, evidence)
  );
}
