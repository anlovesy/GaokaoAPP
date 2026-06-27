import { motion } from "framer-motion";
import { UniversityDetailPanel } from "../../components/university/UniversityDetailPanel.jsx";

export function UniversityScreen({ university, onBack }) {
  return (
    <div className="university-page-shell brand-shell">
      <div className="university-page-layout">
        <motion.header
          className="university-premium-head"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="university-head-copy">
            <span className="brand-kicker">UNIVERSITY DOSSIER</span>
            <h1>{university ? university.university : "高校详情"}</h1>
            <p>{university ? "围绕一所学校继续判断。" : "请先从志愿方案里选择一所学校。"}</p>
          </div>

          <div className="university-head-actions">
            <button className="text-link-btn" type="button" onClick={onBack}>
              返回工作台
            </button>
          </div>
        </motion.header>

        {university ? (
          <UniversityDetailPanel university={university} isStandalone />
        ) : (
          <article className="university-empty-state">
            <span className="brand-kicker">EMPTY</span>
            <h3>还没有选中学校</h3>
            <p>回到方案页后，再进入院校详情继续查看。</p>
          </article>
        )}
      </div>
    </div>
  );
}
