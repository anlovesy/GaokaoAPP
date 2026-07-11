import { motion, useReducedMotion } from "framer-motion";
import { UniversityDetailPanel } from "../../components/university/UniversityDetailPanel.jsx";
import { revealSoft, transitionGentle } from "../../motion/presets.js";
import "../../styles/pages/university.css";

export function UniversityScreen({ university, onBack, topAccessory }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="university-page-shell brand-shell">
      <div className="university-page-layout">
        <motion.header
          className="university-minimal-head premium-glass"
          initial={prefersReducedMotion ? false : "hidden"}
          animate={prefersReducedMotion ? undefined : "visible"}
          variants={prefersReducedMotion ? undefined : revealSoft}
          transition={transitionGentle}
        >
          <div>
            <span className="brand-kicker">University Dossier</span>
            <h1>{university ? university.university : "院校详情"}</h1>
            <p>
              {university
                ? "围绕这一所学校继续判断。"
                : "请先从志愿方案里选择一所学校。"}
            </p>
          </div>

          <div className="workspace-head-actions university-head-actions">
            <button className="text-link-btn" type="button" onClick={onBack}>
              返回工作台
            </button>
            {topAccessory}
          </div>
        </motion.header>

        {university ? (
          <motion.div
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.04 }}
          >
            <UniversityDetailPanel university={university} isStandalone />
          </motion.div>
        ) : (
          <motion.article
            className="university-empty-state premium-glass"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : revealSoft}
            transition={{ ...transitionGentle, delay: 0.04 }}
          >
            <span className="brand-kicker">Empty</span>
            <div className="workspace-empty-orbit university-empty-orbit" aria-hidden="true">
              <span className="workspace-empty-orbit-ring workspace-empty-orbit-ring-a" />
              <span className="workspace-empty-orbit-ring workspace-empty-orbit-ring-b" />
              <span className="workspace-empty-orbit-core" />
            </div>
            <h3>还没有选中院校</h3>
            <p>回到志愿方案后，选择一所学校继续查看完整的院校判断。</p>
          </motion.article>
        )}
      </div>
    </div>
  );
}
