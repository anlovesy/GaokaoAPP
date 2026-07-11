export class CitationFormatter {
  format({ citations = [] } = {}) {
    const normalized = [];
    const seen = new Set();

    citations.forEach((citation, index) => {
      const item = normalizeCitation(citation, index);
      if (!item) {
        return;
      }

      const key = `${item.sourceType}:${item.label}`;
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      normalized.push(item);
    });

    return {
      version: "citation-formatter-v1",
      citations: normalized,
      summary: normalized.slice(0, 5).map((item) => item.display)
    };
  }
}

export function createCitationFormatter() {
  return new CitationFormatter();
}

function normalizeCitation(citation, index) {
  const sourceType = String(citation?.sourceType || "").trim();
  const label = String(citation?.label || "").trim();

  if (!sourceType || !label) {
    return null;
  }

  return {
    id: `${sourceType}-${index + 1}`,
    sourceType,
    label,
    display: `[${formatSourceType(sourceType)}] ${label}`
  };
}

function formatSourceType(sourceType) {
  const dictionary = {
    workspace: "Workspace",
    admission_database: "Admission",
    enrollment_plan_database: "Plan",
    university_database: "University",
    major_database: "Major",
    policy_database: "Policy",
    employment_database: "Employment",
    knowledge_base: "Knowledge"
  };

  return dictionary[sourceType] || sourceType;
}
