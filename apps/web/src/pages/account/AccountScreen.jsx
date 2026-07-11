import { motion, useReducedMotion } from "framer-motion";
import { canAccessAdminWorkspace, getRoleDisplayName } from "../../app/rbac.js";
import { formatDateTime } from "../../app/utils.js";
import {
  revealSoft,
  revealUp,
  staggerDense,
  staggerItem,
  transitionGentle
} from "../../motion/presets.js";
import "../../styles/pages/account.css";

function AccountStatGrid({ items }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="account-stat-grid"
      initial={prefersReducedMotion ? false : "hidden"}
      animate={prefersReducedMotion ? undefined : "visible"}
      variants={prefersReducedMotion ? undefined : staggerDense}
    >
      {items.map((item) => (
        <motion.article
          key={item.label}
          className="account-stat-card"
          variants={prefersReducedMotion ? undefined : staggerItem}
          whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.01 }}
          transition={transitionGentle}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.note}</p>
        </motion.article>
      ))}
    </motion.div>
  );
}

function AccountControlRail({ isAdmin, onBackToWorkspace, onOpenHistory, onOpenAdminUsers }) {
  const items = [
    {
      label: "Workspace",
      title: "返回决策工作台",
      description: "回到当前志愿方案，继续浏览、编辑和推演。",
      action: onBackToWorkspace
    },
    {
      label: "History",
      title: "打开方案历史",
      description: "查看历史版本、恢复旧方案和回看推理轨迹。",
      action: onOpenHistory
    }
  ];

  if (isAdmin) {
    items.push({
      label: "Admin",
      title: "打开权限控制台",
      description: "进入独立成员管理层，处理角色、密码与账户安全。",
      action: onOpenAdminUsers
    });
  }

  return (
    <section className="account-control-rail account-surface">
      <div className="account-panel-head">
        <div>
          <span className="account-eyebrow">Control Rail</span>
          <h3>在不打断专注的前提下切换到需要的空间。</h3>
        </div>
      </div>

      <div className="account-control-list">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className="account-control-card"
            onClick={item.action}
          >
            <span>{item.label}</span>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

export function AccountScreen({
  currentUser,
  historyData,
  onBackToWorkspace,
  onOpenAdminUsers,
  onOpenHistory,
  onLogout,
  topAccessory
}) {
  const prefersReducedMotion = useReducedMotion();
  const plans = historyData?.plans || [];
  const chats = historyData?.chats || [];
  const latestPlan = plans[0] || null;
  const latestChat = chats[0] || null;
  const latestImport = historyData?.imports?.[0] || null;
  const roleLabel = getRoleDisplayName(currentUser?.role);
  const isAdmin = canAccessAdminWorkspace(currentUser);

  const statItems = [
    {
      label: "Role",
      value: roleLabel,
      note: isAdmin ? "可进入成员治理与权限控制。" : "用于查看账户、历史与会话状态。"
    },
    {
      label: "Plans",
      value: String(plans.length).padStart(2, "0"),
      note: latestPlan ? `最近一次方案保存于 ${formatDateTime(latestPlan.createdAt)}` : "还没有归档方案。"
    },
    {
      label: "Chats",
      value: String(chats.length).padStart(2, "0"),
      note: latestChat ? "顾问对话记忆已同步。" : "还没有顾问会话记录。"
    },
    {
      label: "Imports",
      value: String(historyData?.imports?.length || 0).padStart(2, "0"),
      note: latestImport ? `最近一次导入于 ${formatDateTime(latestImport.createdAt)}` : "还没有导入记录。"
    }
  ];

  const continuityItems = [
    {
      label: "Access Layer",
      value: isAdmin ? "Admin Control" : "Member Access",
      note: isAdmin ? "你可以进入权限控制台，而不打断主工作台体验。" : "当前角色只显示个人会话与历史内容。"
    },
    {
      label: "Memory State",
      value: latestChat ? "会话已同步" : "会话为空",
      note: latestChat ? "顾问上下文会在多个会话之间继续保留。" : "登录后开始顾问对话，系统才会持续保留上下文。"
    },
    {
      label: "Recovery State",
      value: latestPlan ? "方案可恢复" : "等待首个方案",
      note: latestPlan ? "最近一次工作台快照已经可被恢复。" : "生成并保存正式方案后，历史恢复才会启用。"
    }
  ];

  return (
    <div className="account-shell">
      <div className="account-background-grid" aria-hidden="true" />

      <motion.div
        className="account-os"
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={transitionGentle}
      >
        <header className="account-header account-surface">
          <div className="account-header-copy">
            <span className="account-eyebrow">Account Center</span>
            <h1>让你的 Decision Studio 保持连续。</h1>
            <p>账户层独立于主决策路径之外，把历史、会话与权限控制收纳在一个安静的空间里。</p>
          </div>

          <div className="account-header-actions">
            <button className="account-secondary-button" type="button" onClick={onBackToWorkspace}>
              返回工作台
            </button>
            {topAccessory}
          </div>
        </header>

        <section className="account-hero-grid">
          <motion.article
            className="account-identity-card account-surface"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealUp}
            transition={{ ...transitionGentle, delay: 0.04 }}
          >
            <div className="account-identity-topline">
              <span className="account-avatar" aria-hidden="true">
                {currentUser?.username?.slice(0, 1)?.toUpperCase() || "Z"}
              </span>
              <div>
                <span className="account-eyebrow">Signed In</span>
                <strong>{currentUser?.username || "志序成员"}</strong>
                <p>{roleLabel}</p>
              </div>
            </div>

            <div className="account-identity-flow">
              <article>
                <span>Session</span>
                <strong>持续中</strong>
              </article>
              <article>
                <span>History</span>
                <strong>{plans.length ? "已同步" : "等待中"}</strong>
              </article>
              <article>
                <span>Access</span>
                <strong>{isAdmin ? "完整控制" : "成员级别"}</strong>
              </article>
            </div>
          </motion.article>

          <motion.article
            className="account-security-card account-surface"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.08 }}
          >
            <span className="account-eyebrow">Security & Session</span>
            <h2>把账户动作收在一个安静的地方。</h2>
            <p>在这里退出登录、查看历史，并把权限治理留在独立层，不干扰 AI 决策工作流。</p>

            <div className="account-action-row">
              <button className="account-primary-button" type="button" onClick={onOpenHistory}>
                打开方案历史
              </button>
              <button className="account-danger-button" type="button" onClick={onLogout}>
                安全退出
              </button>
            </div>
          </motion.article>
        </section>

        <AccountStatGrid items={statItems} />

        <section className="account-continuity-grid">
          <motion.article
            className="account-panel account-surface"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.1 }}
          >
            <div className="account-panel-head">
              <div>
                <span className="account-eyebrow">Continuity Layer</span>
                <h3>这里的所有内容，都只服务于会话连续性。</h3>
              </div>
            </div>

            <div className="account-continuity-list">
              {continuityItems.map((item) => (
                <article key={item.label} className="account-continuity-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </motion.article>

          <motion.article
            className="account-panel account-surface"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.12 }}
          >
            <div className="account-panel-head">
              <div>
                <span className="account-eyebrow">Session Note</span>
                <h3>账户层始终位于 AI 决策工作台之外。</h3>
              </div>
            </div>

            <div className="account-activity-card account-note-card">
              <strong>{isAdmin ? "管理权限与主工作流已经解耦。" : "你的账户层被刻意保持轻量。"}</strong>
              <p>
                {isAdmin
                  ? "成员创建、角色调整与密码重置都在这里完成，不进入核心决策页面。"
                  : "历史、会话与退出登录都在这里集中处理，工作台继续保持专注。"}
              </p>
              <span>{latestPlan || latestChat ? "当前会话的连续性已经生效。" : "等待更多会话活动生成记录。"}</span>
            </div>
          </motion.article>
        </section>

        <section className="account-content-grid">
          <motion.article
            className="account-panel account-surface"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.12 }}
          >
            <div className="account-panel-head">
              <div>
                <span className="account-eyebrow">Recent Plan</span>
                <h3>{latestPlan ? "最近一次工作台快照已经就绪。" : "还没有归档方案。"}</h3>
              </div>
            </div>

            <div className="account-activity-card">
              <strong>
                {latestPlan
                  ? `${latestPlan.province || "未知省份"} · ${latestPlan.score || "--"} 分 · ${latestPlan.rank || "--"} 位次`
                  : "请先从工作台生成你的第一版正式方案。"}
              </strong>
              <p>
                {latestPlan?.result?.summary?.overview ||
                  latestPlan?.result?.summary?.strategy ||
                  "下一次方案生成后，最新的决策摘要会显示在这里。"}
              </p>
              <span>{latestPlan ? formatDateTime(latestPlan.createdAt) : "等待下一次同步"}</span>
            </div>
          </motion.article>

          <motion.article
            className="account-panel account-surface"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.16 }}
          >
            <div className="account-panel-head">
              <div>
                <span className="account-eyebrow">Advisor Memory</span>
                <h3>{latestChat ? "最近一次顾问线程已经保留。" : "当前还没有顾问记忆。"}</h3>
              </div>
            </div>

            <div className="account-activity-card">
              <strong>{latestChat ? "对话连续性已经可用。" : "打开顾问空间，开始一条新的线程。"}</strong>
              <p>
                {latestChat?.messages?.[0]?.content ||
                  "登录后开始顾问对话，系统会保留关键提问与推理上下文。"}
              </p>
              <span>{latestChat ? formatDateTime(latestChat.createdAt) : "还没有对话记录"}</span>
            </div>
          </motion.article>
        </section>

        <AccountControlRail
          isAdmin={isAdmin}
          onBackToWorkspace={onBackToWorkspace}
          onOpenHistory={onOpenHistory}
          onOpenAdminUsers={onOpenAdminUsers}
        />

        {isAdmin ? (
          <motion.section
            className="account-admin-entry account-surface"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.2 }}
          >
            <div>
              <span className="account-eyebrow">Admin Access</span>
              <h3>需要处理成员与权限吗？</h3>
              <p>打开独立控制台，处理成员、角色与密码，而不打扰 AI 工作流本身。</p>
            </div>

            <button className="account-primary-button" type="button" onClick={onOpenAdminUsers}>
              打开成员管理
            </button>
          </motion.section>
        ) : null}
      </motion.div>
    </div>
  );
}
