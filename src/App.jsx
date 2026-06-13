import { useEffect, useMemo, useState } from "react";
import {
  defaultFormState,
  filterOptions,
  interestOptions,
  provinceOptions,
  trackOptions
} from "./config.js";
import { buildPrintablePlan } from "./printPlan.js";

const starterChat = [
  {
    role: "assistant",
    content:
      "我是你的 AI 志愿顾问。你可以先生成正式志愿方案，再继续问我“为什么推荐这个学校”“学校优先还是专业优先”“帮我改成更保守一点”等问题。"
  }
];

function App() {
  const [formState, setFormState] = useState(defaultFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [providers, setProviders] = useState([]);
  const [dataStatus, setDataStatus] = useState(null);
  const [chatMessages, setChatMessages] = useState(starterChat);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [authToken, setAuthToken] = useState(localStorage.getItem("gaokao_auth_token") || "");
  const [loginForm, setLoginForm] = useState({ username: "LYYzhiyuan", password: "" });
  const [loginError, setLoginError] = useState("");
  const [historyData, setHistoryData] = useState({ plans: [], chats: [], imports: [] });
  const [uploadState, setUploadState] = useState({
    datasetType: "province_score_rank",
    fileName: "",
    content: ""
  });
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadTemplate, setUploadTemplate] = useState(null);

  const selectedInterests = useMemo(() => {
    return interestOptions.filter((item) => formState.interests.includes(item.id));
  }, [formState.interests]);

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    if (authToken) {
      fetchHistory(authToken);
    }
  }, [authToken]);

  useEffect(() => {
    fetchUploadTemplate(uploadState.datasetType);
  }, [uploadState.datasetType]);

  async function fetchMeta() {
    try {
      const [providerResponse, dataStatusResponse] = await Promise.all([
        fetch("/api/meta/providers"),
        fetch("/api/meta/data-status")
      ]);

      const providerPayload = await providerResponse.json();
      const dataStatusPayload = await dataStatusResponse.json();

      if (providerPayload.ok) {
        setProviders(providerPayload.data.providers);
      }

      if (dataStatusPayload.ok) {
        setDataStatus(dataStatusPayload.data);
      }
    } catch {
      setProviders([]);
    }
  }

  async function fetchUploadTemplate(datasetType) {
    try {
      const response = await fetch(`/api/meta/upload-template?datasetType=${datasetType}`);
      const payload = await response.json();
      if (payload.ok) {
        setUploadTemplate(payload.data);
      }
    } catch {
      setUploadTemplate(null);
    }
  }

  async function fetchHistory(token) {
    try {
      const response = await fetch("/api/admin/history", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = await response.json();
      if (payload.ok) {
        setHistoryData(payload.data);
      }
    } catch {
      setHistoryData({ plans: [], chats: [], imports: [] });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/planner/recommend", {
        method: "POST",
        headers: buildHeaders(authToken),
        body: JSON.stringify(formState)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "生成志愿方案失败");
      }

      setResult(payload.data);
      if (authToken) {
        fetchHistory(authToken);
      }
      setChatMessages([
        ...starterChat,
        {
          role: "assistant",
          content:
            "正式志愿方案已经生成好了。你现在可以问我：为什么推荐这些学校、如何调整成更稳妥、专业优先还是城市优先、哪些学校更适合读研等。"
        }
      ]);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendChat() {
    const content = chatInput.trim();
    if (!content || chatLoading) {
      return;
    }

    const nextMessages = [...chatMessages, { role: "user", content }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat/advisor", {
        method: "POST",
        headers: buildHeaders(authToken),
        body: JSON.stringify({
          provider: formState.aiProvider,
          planningContext: result,
          messages: nextMessages
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "聊天顾问暂时不可用");
      }

      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.data.reply
        }
      ]);

      if (authToken) {
        fetchHistory(authToken);
      }
    } catch (chatError) {
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `当前聊天服务暂时不可用：${chatError.message}`
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(loginForm)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "登录失败");
      }

      setAuthToken(payload.data.token);
      localStorage.setItem("gaokao_auth_token", payload.data.token);
      fetchHistory(payload.data.token);
    } catch (loginSubmitError) {
      setLoginError(loginSubmitError.message);
    }
  }

  async function handleUploadData(event) {
    event.preventDefault();
    setUploadMessage("");

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: buildHeaders(authToken),
        body: JSON.stringify(uploadState)
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "上传导入失败");
      }

      setUploadMessage(
        `上传并导入成功：${payload.data.importedDatasetType}，累计导入 ${payload.data.importedRowCount} 条记录`
      );
      setUploadState((current) => ({
        ...current,
        fileName: "",
        content: ""
      }));
      fetchMeta();
      fetchHistory(authToken);
    } catch (uploadError) {
      setUploadMessage(uploadError.message);
    }
  }

  async function handleChooseUploadFile(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const content = await file.text();
    setUploadState((current) => ({
      ...current,
      fileName: file.name,
      content
    }));
  }

  function buildHeaders(token) {
    const headers = {
      "Content-Type": "application/json"
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  function updateField(field, value) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  function toggleInterest(interestId) {
    setFormState((current) => {
      const hasInterest = current.interests.includes(interestId);
      return {
        ...current,
        interests: hasInterest
          ? current.interests.filter((item) => item !== interestId)
          : [...current.interests, interestId]
      };
    });
  }

  function toggleConstraint(field, value) {
    setFormState((current) => {
      const items = current[field];
      const hasValue = items.includes(value);

      return {
        ...current,
        [field]: hasValue ? items.filter((item) => item !== value) : [...items, value]
      };
    });
  }

  function handlePrintPlan() {
    if (!result) {
      return;
    }

    const printable = buildPrintablePlan(result);
    const popup = window.open("", "_blank", "width=1080,height=900");
    if (!popup) {
      return;
    }

    popup.document.write(printable);
    popup.document.close();
    popup.focus();
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Gaokao Advisor Workspace</p>
          <h1>高考志愿智能体</h1>
          <p className="hero-text">
            这是一个面向生产工作的志愿规划工作台，支持手机电脑端访问、正式志愿推荐、
            聊天式 AI 顾问、多模型切换和真实高考数据导入。
          </p>
          <div className="hero-points">
            <span>正式志愿表</span>
            <span>聊天式 AI 顾问</span>
            <span>DeepSeek / 通义 / OpenAI</span>
            <span>真实数据导入</span>
          </div>
        </div>

        <div className="hero-side">
          <div className="hero-card">
            <strong>已启用模型</strong>
            <p>
              {providers.filter((item) => item.enabled).length > 0
                ? providers
                    .filter((item) => item.enabled)
                    .map((item) => `${item.label} (${item.model})`)
                    .join(" / ")
                : "当前未配置大模型密钥，系统会使用本地规则引擎"}
            </p>
          </div>

          <div className="hero-card">
            <strong>数据导入状态</strong>
            <p>
              {dataStatus?.imported
                ? `已导入 ${dataStatus.universityMajorLineCount} 条院校专业线数据`
                : "当前使用内置演示数据，尚未导入真实高考数据"}
            </p>
          </div>

          <div className="hero-card">
            <strong>后台账号</strong>
            <p>默认账号 `LYYzhiyuan`，后台密码请通过环境变量 `ADMIN_PASSWORD` 单独设置。</p>
          </div>
        </div>
      </header>

      <main className="layout-grid workspace-grid">
        <section className="panel form-panel">
          <div className="panel-head">
            <h2>志愿填报工作台</h2>
            <p>把学生画像、筛选约束和模型偏好一起填入，系统会输出正式志愿方案。</p>
          </div>

          <form className="planner-form" onSubmit={handleSubmit}>
            <div className="field-grid">
              <label>
                <span>所在省份</span>
                <select
                  value={formState.province}
                  onChange={(event) => updateField("province", event.target.value)}
                >
                  {provinceOptions.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>高考分数</span>
                <input
                  type="number"
                  min="0"
                  max="750"
                  value={formState.score}
                  onChange={(event) => updateField("score", Number(event.target.value))}
                  required
                />
              </label>

              <label>
                <span>选科类别</span>
                <select
                  value={formState.track}
                  onChange={(event) => updateField("track", event.target.value)}
                >
                  {trackOptions.map((track) => (
                    <option key={track} value={track}>
                      {track}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>全省位次</span>
                <input
                  type="number"
                  min="1"
                  value={formState.rank}
                  onChange={(event) => updateField("rank", Number(event.target.value))}
                  required
                />
              </label>

              <label>
                <span>风险偏好</span>
                <select
                  value={formState.risk}
                  onChange={(event) => updateField("risk", event.target.value)}
                >
                  <option value="balanced">均衡型</option>
                  <option value="aggressive">冲刺型</option>
                  <option value="conservative">保守型</option>
                </select>
              </label>
            </div>

            <div className="field-grid">
              <label>
                <span>聊天模型 / 分析模型</span>
                <select
                  value={formState.aiProvider}
                  onChange={(event) => updateField("aiProvider", event.target.value)}
                >
                  <option value="auto">自动选择可用模型</option>
                  <option value="openai">OpenAI</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="qwen">通义千问</option>
                  <option value="local">仅本地规则引擎</option>
                </select>
              </label>

              <label>
                <span>最高可接受学费（元 / 年）</span>
                <input
                  type="number"
                  min="0"
                  value={formState.maxTuition}
                  onChange={(event) => updateField("maxTuition", Number(event.target.value))}
                />
              </label>
            </div>

            <label>
              <span>意向城市</span>
              <input
                type="text"
                value={formState.preferredCities}
                onChange={(event) => updateField("preferredCities", event.target.value)}
                placeholder="例如 上海、杭州、成都"
              />
            </label>

            <label>
              <span>职业规划</span>
              <textarea
                rows="4"
                value={formState.careerPlan}
                onChange={(event) => updateField("careerPlan", event.target.value)}
                placeholder="例如 想走人工智能产品经理、医生、金融分析师、公务员、教师等方向"
              />
            </label>

            <label>
              <span>补充说明</span>
              <textarea
                rows="4"
                value={formState.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="例如 家长期望、是否愿意读研、是否接受省外、是否更看重大城市"
              />
            </label>

            <fieldset>
              <legend>兴趣方向</legend>
              <div className="chip-grid">
                {interestOptions.map((interest) => {
                  const active = formState.interests.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      className={`chip ${active ? "active" : ""}`}
                      onClick={() => toggleInterest(interest.id)}
                    >
                      {interest.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend>筛选约束</legend>
              <div className="constraint-block">
                {filterOptions.map((group) => (
                  <div key={group.key} className="constraint-group">
                    <p>{group.label}</p>
                    <div className="chip-grid">
                      {group.options.map((option) => {
                        const active = formState[group.key].includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={`chip ${active ? "active" : ""}`}
                            onClick={() => toggleConstraint(group.key, option.value)}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "正在生成志愿方案..." : "生成正式志愿方案"}
            </button>
            {error ? <p className="error-text">{error}</p> : null}
          </form>
        </section>

        <section className="panel result-panel">
          <div className="panel-head result-head">
            <div>
              <h2>推荐结果与聊天顾问</h2>
              <p>先生成正式志愿方案，再通过右侧聊天顾问继续深挖比较和调整。</p>
            </div>
            {result ? (
              <button className="secondary-btn" type="button" onClick={handlePrintPlan}>
                导出打印版
              </button>
            ) : null}
          </div>

          {!result ? (
            <div className="empty-state">
              <h3>等待生成志愿方案</h3>
              <p>提交学生信息后，这里会出现正式志愿表、推荐专业方向和 AI 解释。</p>
            </div>
          ) : (
            <div className="result-stack">
              <section className="result-section">
                <h3>学生画像</h3>
                <div className="summary-grid">
                  <div className="summary-chip">省份：{result.profile.province}</div>
                  <div className="summary-chip">选科：{result.profile.track}</div>
                  <div className="summary-chip">分数：{result.profile.score}</div>
                  <div className="summary-chip">位次：{result.profile.rank}</div>
                  <div className="summary-chip">风险偏好：{result.profile.riskLabel}</div>
                  <div className="summary-chip">
                    兴趣：{selectedInterests.map((item) => item.label).join(" / ") || "待补充"}
                  </div>
                  <div className="summary-chip">
                    分析模式：{result.meta.analysisMode === "llm" ? "大模型增强" : "本地规则"}
                  </div>
                </div>
              </section>

              <section className="result-section">
                <h3>AI 总结</h3>
                <div className="narrative-card">
                  <p>{result.summary.overview}</p>
                  <p>{result.summary.strategy}</p>
                  <p>{result.summary.careerAdvice}</p>
                </div>
              </section>

              <section className="result-section">
                <h3>正式志愿表</h3>
                <div className="plan-board">
                  {result.applicationPlan.map((tierGroup) => (
                    <article key={tierGroup.tier} className="tier-column">
                      <div className={`tier-pill tier-${tierGroup.tierClass}`}>{tierGroup.tierLabel}</div>
                      <p className="muted">{tierGroup.explanation}</p>
                      <div className="school-list">
                        {tierGroup.schools.map((school, index) => (
                          <div key={`${tierGroup.tier}-${school.university}-${school.major}`} className="school-card">
                            <div className="school-head">
                              <strong>
                                {index + 1}. {school.university}
                              </strong>
                              <span>置信度 {school.confidence}</span>
                            </div>
                            <p>{school.major}</p>
                            <p className="muted">
                              {school.city} · {school.nature} · 学费约 {school.tuition} 元/年
                            </p>
                            <p className="muted">
                              {school.year ? `${school.year} 导入数据` : "演示位次模型"} ·
                              {school.subjectRequirement || " 暂无选科说明"}
                            </p>
                            <p className="muted">建议理由：{school.reason}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </section>

        <section className="panel chat-panel">
          <div className="panel-head">
            <h2>顾问聊天 + 后台上传</h2>
            <p>这里同时提供聊天顾问、后台登录、历史记录和真实数据上传入口。</p>
          </div>

          <form className="planner-form" onSubmit={handleLogin}>
            <div className="field-grid">
              <label>
                <span>后台账号</span>
                <input
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, username: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>后台密码</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>
            </div>
            <button className="secondary-btn" type="submit">
              {authToken ? "已登录，可刷新历史记录" : "登录后台"}
            </button>
            {loginError ? <p className="error-text">{loginError}</p> : null}
          </form>

          <div className="chat-status">
            <div className="summary-chip">
              当前模型：{
                providers.find((item) => item.id === formState.aiProvider)?.label ||
                (formState.aiProvider === "auto" ? "自动选择" : formState.aiProvider)
              }
            </div>
            <div className="summary-chip">
              数据状态：{dataStatus?.imported ? "已导入真实数据" : "内置演示数据"}
            </div>
          </div>

          <div className="chat-box">
            {chatMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`chat-message ${message.role === "user" ? "user" : "assistant"}`}
              >
                <strong>{message.role === "user" ? "你" : "顾问"}</strong>
                <p>{message.content}</p>
              </div>
            ))}
          </div>

          <div className="chat-input-row">
            <textarea
              rows="4"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="例如：为什么推荐华东师范大学的软件工程？如果我更看重就业稳定，方案要怎么调？"
            />
            <button className="primary-btn" type="button" onClick={handleSendChat} disabled={chatLoading}>
              {chatLoading ? "顾问思考中..." : "发送"}
            </button>
          </div>

          <form className="planner-form" onSubmit={handleUploadData}>
            <h3>上传真实数据</h3>
            <label>
              <span>数据类型</span>
              <select
                value={uploadState.datasetType}
                onChange={(event) =>
                  setUploadState((current) => ({ ...current, datasetType: event.target.value }))
                }
              >
                <option value="province_score_rank">一分一段表</option>
                <option value="university_major_lines">院校专业录取线</option>
              </select>
            </label>
            <label>
              <span>文件名</span>
              <input
                value={uploadState.fileName}
                onChange={(event) =>
                  setUploadState((current) => ({ ...current, fileName: event.target.value }))
                }
                placeholder="例如 university_major_lines_2025.csv"
              />
            </label>
            <div className="info-card">
              <h4>推荐文件名</h4>
              <p>{uploadTemplate?.fileNameExample || "加载中..."}</p>
              <p className="muted">
                字段顺序：
                {uploadTemplate?.headers?.join(", ") || "加载中..."}
              </p>
            </div>
            <label>
              <span>本地 CSV 文件</span>
              <input type="file" accept=".csv,text/csv" onChange={handleChooseUploadFile} />
            </label>
            <label>
              <span>CSV 内容</span>
              <textarea
                rows="8"
                value={uploadState.content}
                onChange={(event) =>
                  setUploadState((current) => ({ ...current, content: event.target.value }))
                }
                placeholder="把 CSV 内容直接粘贴到这里"
              />
            </label>
            <button className="secondary-btn" type="submit" disabled={!authToken}>
              上传并导入
            </button>
            {uploadMessage ? <p className="muted">{uploadMessage}</p> : null}
          </form>

          <section className="result-section">
            <h3>最近方案</h3>
            <div className="card-grid">
              {historyData.plans.slice(0, 4).map((item) => (
                <article key={item.id} className="info-card">
                  <h4>{item.province}</h4>
                  <p>分数 {item.score} / 位次 {item.rank}</p>
                  <p className="muted">{item.createdAt}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="result-section">
            <h3>最近导入</h3>
            <div className="card-grid">
              {historyData.imports.slice(0, 4).map((item) => (
                <article key={item.id} className="info-card">
                  <h4>{item.datasetType}</h4>
                  <p>{item.fileName}</p>
                  <p className="muted">行数 {item.rowCount}</p>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
