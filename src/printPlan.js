export function buildPrintablePlan(result) {
  const planHtml = result.applicationPlan
    .map(
      (group) => `
        <section style="margin-bottom:24px;">
          <h2 style="margin:0 0 8px;">${group.tierLabel}</h2>
          <p style="margin:0 0 12px;color:#666;">${group.explanation}</p>
          ${group.schools
            .map(
              (school, index) => `
                <div style="border:1px solid #ddd;border-radius:12px;padding:12px;margin-bottom:10px;">
                  <strong>${index + 1}. ${school.university} - ${school.major}</strong>
                  <p style="margin:8px 0 0;">${school.city} · ${school.nature} · 学费约 ${school.tuition} 元/年</p>
                  <p style="margin:8px 0 0;">推荐理由：${school.reason}</p>
                </div>
              `
            )
            .join("")}
        </section>
      `
    )
    .join("");

  const warnings = result.riskAlerts
    .map((item) => `<li style="margin-bottom:8px;">${item}</li>`)
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <title>高考志愿正式清单</title>
      </head>
      <body style="font-family:Segoe UI, Microsoft YaHei, sans-serif; padding:32px; color:#222;">
        <h1>高考志愿正式清单</h1>
        <p>${result.summary.overview}</p>
        <p>${result.summary.strategy}</p>
        ${planHtml}
        <section>
          <h2>高风险提醒</h2>
          <ul>${warnings}</ul>
        </section>
      </body>
    </html>
  `;
}
