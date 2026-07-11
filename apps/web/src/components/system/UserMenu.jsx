import { useEffect, useRef, useState } from "react";
import { canAccessMenu, canAccessAdminWorkspace, getRoleDisplayName } from "../../app/rbac.js";
import "../../styles/system/user-menu.css";

function UserMenuItem({ caption, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      className={`user-menu-item ${danger ? "is-danger" : ""}`}
      onClick={onClick}
    >
      <span>{caption}</span>
      <strong>{label}</strong>
    </button>
  );
}

export function UserMenu({
  className = "",
  currentUser,
  onNavigateAccount,
  onNavigateAdminUsers,
  onNavigateHistory,
  onLogout
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (!currentUser) {
    return null;
  }

  const userInitial = currentUser.username?.slice(0, 1)?.toUpperCase() || "Z";
  const roleLabel = getRoleDisplayName(currentUser.role);
  const showAdminEntry = canAccessAdminWorkspace(currentUser) && canAccessMenu(currentUser, "adminUsers");

  function handleAction(callback) {
    setOpen(false);
    callback?.();
  }

  return (
    <div ref={rootRef} className={`user-menu ${className}`.trim()}>
      <button
        type="button"
        className={`user-menu-trigger ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="user-menu-avatar" aria-hidden="true">
          {userInitial}
        </span>
        <span className="user-menu-trigger-copy">
          <strong>{currentUser.username || "账户"}</strong>
          <em>{showAdminEntry ? "Admin Layer" : "Account Layer"}</em>
        </span>
      </button>

      {open ? (
        <div className="user-menu-popover" role="menu">
          <div className="user-menu-profile">
            <span className="user-menu-badge">Signed In</span>
            <strong>{currentUser.username}</strong>
            <p>{roleLabel}</p>
          </div>

          <div className="user-menu-list">
            {canAccessMenu(currentUser, "account") ? (
              <UserMenuItem
                caption="Account"
                label="打开账户中心"
                onClick={() => handleAction(onNavigateAccount)}
              />
            ) : null}
            {canAccessMenu(currentUser, "history") ? (
              <UserMenuItem
                caption="History"
                label="查看方案历史"
                onClick={() => handleAction(onNavigateHistory)}
              />
            ) : null}
            {showAdminEntry ? (
              <UserMenuItem
                caption="Admin"
                label="管理成员与权限"
                onClick={() => handleAction(onNavigateAdminUsers)}
              />
            ) : null}
            {canAccessMenu(currentUser, "logout") ? (
              <UserMenuItem
                caption="Session"
                label="安全退出"
                danger
                onClick={() => handleAction(onLogout)}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
