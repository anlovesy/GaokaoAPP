import { motion, useReducedMotion } from "framer-motion";
import {
  ROLES,
  canManageUser,
  getDefaultRoleOptions,
  getRoleDisplayName,
  getRoleDisplayTone,
  sortUsersByRolePriority
} from "../../app/rbac.js";
import { formatDateTime } from "../../app/utils.js";
import {
  revealSoft,
  revealUp,
  staggerDense,
  staggerItem,
  transitionGentle
} from "../../motion/presets.js";
import "../../styles/pages/admin-users.css";

function AdminStats({ userList }) {
  const prefersReducedMotion = useReducedMotion();
  const total = userList.length;
  const superAdminCount = userList.filter((item) => item.role === ROLES.SUPER_ADMIN).length;
  const adminCount = userList.filter((item) => item.role === ROLES.ADMIN).length;
  const teacherCount = userList.filter((item) => item.role === ROLES.TEACHER).length;
  const studentCount = userList.filter((item) => item.role === ROLES.STUDENT).length;

  const items = [
    { label: "Members", value: String(total).padStart(2, "0"), note: "当前可见的全部账户。" },
    {
      label: "Privileged",
      value: String(superAdminCount + adminCount).padStart(2, "0"),
      note: "拥有管理权限的角色。"
    },
    { label: "Teachers", value: String(teacherCount).padStart(2, "0"), note: "教师与顾问角色。" },
    { label: "Students", value: String(studentCount).padStart(2, "0"), note: "学生或普通成员。" }
  ];

  return (
    <motion.div
      className="admin-users-stat-grid"
      initial={prefersReducedMotion ? false : "hidden"}
      animate={prefersReducedMotion ? undefined : "visible"}
      variants={prefersReducedMotion ? undefined : staggerDense}
    >
      {items.map((item) => (
        <motion.article
          key={item.label}
          className="admin-users-stat-card"
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

function AdminControlNote({ currentUser, userManagementMessage }) {
  return (
    <section className="admin-users-note admin-users-surface">
      <div className="admin-users-panel-head">
        <div>
          <span className="admin-users-eyebrow">Control Note</span>
          <h2>把成员管理留在独立的控制层里。</h2>
        </div>
        <span className="admin-users-mini-badge">{currentUser?.username || "管理员"}</span>
      </div>

      <div className="admin-users-note-grid">
        <article className="admin-users-note-card">
          <span>Safety</span>
          <strong>角色、密码和会话都在这里处理。</strong>
          <p>成员权限与账号维护不进入主决策空间，避免影响志愿工作流。</p>
        </article>
        <article className="admin-users-note-card">
          <span>Status</span>
          <strong>{userManagementMessage || "当前没有待处理的权限提示。"}</strong>
          <p>创建成员、调整角色、重置密码与删除账户的结果会统一显示在这里。</p>
        </article>
      </div>
    </section>
  );
}

function RoleSelect({ disabled, onChange, options, value }) {
  return (
    <select value={value} onChange={onChange} disabled={disabled}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.zhLabel || getRoleDisplayName(option.value)}
        </option>
      ))}
    </select>
  );
}

export function AdminUsersScreen({
  currentUser,
  newUserForm,
  onBackToWorkspace,
  onChangeNewUserFormField,
  onChangePasswordResetValue,
  onCreateUser,
  onDeleteUser,
  onResetUserPassword,
  onUpdateUserRole,
  passwordResetForm,
  roleOptions = [],
  topAccessory,
  userList,
  userManagementLoading,
  userManagementMessage
}) {
  const prefersReducedMotion = useReducedMotion();
  const sortedUsers = sortUsersByRolePriority(userList);
  const assignableRoleOptions = roleOptions.length ? roleOptions : getDefaultRoleOptions();

  return (
    <div className="admin-users-shell">
      <div className="admin-users-background-grid" aria-hidden="true" />

      <motion.div
        className="admin-users-os"
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? undefined : "visible"}
        variants={prefersReducedMotion ? undefined : revealSoft}
        transition={transitionGentle}
      >
        <header className="admin-users-header admin-users-surface">
          <div className="admin-users-header-copy">
            <span className="admin-users-eyebrow">Admin Users</span>
            <h1>在不打断工作台的前提下完成权限治理。</h1>
            <p>这里统一处理角色分配、密码重置、成员删除与基础账户治理，保持主产品体验纯净。</p>
          </div>

          <div className="admin-users-header-actions">
            <button className="admin-users-secondary-button" type="button" onClick={onBackToWorkspace}>
              返回工作台
            </button>
            {topAccessory}
          </div>
        </header>

        <AdminStats userList={userList} />

        <AdminControlNote
          currentUser={currentUser}
          userManagementMessage={userManagementMessage}
        />

        <section className="admin-users-grid">
          <motion.section
            className="admin-users-create admin-users-surface"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealUp}
            transition={{ ...transitionGentle, delay: 0.04 }}
          >
            <div className="admin-users-panel-head">
              <div>
                <span className="admin-users-eyebrow">Create User</span>
                <h2>为新的成员开通账户。</h2>
              </div>
              <span className="admin-users-mini-badge">{currentUser?.username || "管理员"}</span>
            </div>

            <form className="admin-users-form" onSubmit={onCreateUser}>
              <label>
                <span>用户名</span>
                <input
                  value={newUserForm.username}
                  onChange={(event) => onChangeNewUserFormField("username", event.target.value)}
                  placeholder="例如 zhixu-user"
                />
              </label>

              <label>
                <span>临时密码</span>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(event) => onChangeNewUserFormField("password", event.target.value)}
                  placeholder="输入初始密码"
                />
              </label>

              <label>
                <span>角色</span>
                <RoleSelect
                  value={newUserForm.role}
                  options={assignableRoleOptions}
                  onChange={(event) => onChangeNewUserFormField("role", event.target.value)}
                />
              </label>

              <button
                className="admin-users-primary-button"
                type="submit"
                disabled={userManagementLoading}
              >
                {userManagementLoading ? "保存中..." : "创建成员"}
              </button>
            </form>

            {userManagementMessage ? <p className="admin-users-message">{userManagementMessage}</p> : null}
          </motion.section>

          <motion.section
            className="admin-users-list admin-users-surface"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.08 }}
          >
            <div className="admin-users-panel-head">
              <div>
                <span className="admin-users-eyebrow">Members</span>
                <h2>集中控制访问、角色与密码。</h2>
              </div>
              <span className="admin-users-mini-badge">{String(userList.length).padStart(2, "0")} 位成员</span>
            </div>

            <div className="admin-users-card-list">
              {sortedUsers.map((user) => {
                const manageable = canManageUser(currentUser, user);
                const tone = getRoleDisplayTone(user.role);
                const roleSelectOptions = manageable
                  ? assignableRoleOptions
                  : [{ value: user.role, zhLabel: getRoleDisplayName(user.role) }];

                return (
                  <article key={user.id} className="admin-users-member-card">
                    <div className="admin-users-member-topline">
                      <div>
                        <strong>{user.username}</strong>
                        <p>{getRoleDisplayName(user.role)}</p>
                      </div>
                      <span className={`admin-users-role-pill role-${tone}`}>{user.role}</span>
                    </div>

                    <div className="admin-users-member-meta">
                      <article>
                        <span>Created</span>
                        <strong>{formatDateTime(user.createdAt)}</strong>
                      </article>
                      <article>
                        <span>Access Layer</span>
                        <strong>{manageable ? "可管理" : "只读保护"}</strong>
                      </article>
                    </div>

                    <div className="admin-users-member-actions">
                      <label>
                        <span>角色</span>
                        <RoleSelect
                          value={user.role}
                          options={roleSelectOptions}
                          disabled={userManagementLoading || !manageable}
                          onChange={(event) => onUpdateUserRole(user.id, event.target.value)}
                        />
                      </label>

                      <label className="admin-users-password-field">
                        <span>重置密码</span>
                        <input
                          type="password"
                          value={passwordResetForm[user.id] || ""}
                          onChange={(event) => onChangePasswordResetValue(user.id, event.target.value)}
                          placeholder="输入新密码"
                          disabled={!manageable}
                        />
                      </label>
                    </div>

                    <div className="admin-users-member-buttons">
                      <button
                        className="admin-users-secondary-button"
                        type="button"
                        disabled={userManagementLoading || !manageable}
                        onClick={() => onResetUserPassword(user.id)}
                      >
                        重置密码
                      </button>
                      <button
                        className="admin-users-danger-button"
                        type="button"
                        disabled={userManagementLoading || !manageable}
                        onClick={() => onDeleteUser(user.id)}
                      >
                        删除成员
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </motion.section>
        </section>
      </motion.div>
    </div>
  );
}
