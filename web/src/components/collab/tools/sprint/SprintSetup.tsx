import { motion } from "framer-motion";
import { RADIUS, SPRINT_TEMPLATES } from "./sprintHelpers";
import SprintMemberList from "./SprintMemberList";

interface Props {
  topic: string;
  studyMin: number;
  setStudyMin: (v: number) => void;
  breakMin: number;
  setBreakMin: (v: number) => void;
  starting: boolean;
  handleStart: () => void;
  memberEntries: [string, { status: string; lastUpdate: string; nickname: string }][];
  userId: string;
}

export default function SprintSetup({
  topic,
  studyMin,
  setStudyMin,
  breakMin,
  setBreakMin,
  starting,
  handleStart,
  memberEntries,
  userId,
}: Props) {
  return (
    <div className="sh-tool">
      <div className="sh-tool__header">
        <div className="sh-tool__header-left">
          <span>{"S"}</span>
          <h3 className="sh-main-content__channel-name">Sprint - {topic}</h3>
        </div>
      </div>
      <div className="sh-tool__body">
        <div className="sh-sprint__setup-container">
          <div className="sh-sprint__hero">
            <div className="sh-sprint__hero-ring">
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r={RADIUS}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="6"
                  opacity="0.3"
                />
              </svg>
              <div className="sh-sprint__hero-ring-content">
                <span className="sh-sprint__hero-icon">{"S"}</span>
                <span className="sh-sprint__hero-label">Sprint</span>
              </div>
            </div>
            <h3 className="sh-sprint__hero-title">Sprint Zamanlay{"\ı"}c{"\ı"}</h3>
            <p className="sh-sprint__hero-desc">
              Pomodoro tekni{"\ğ"}i ile birlikte odakl{"\ı"} {"\ç"}al{"\ı"}{"\ş"}{"\ı"}n
            </p>
          </div>

          <div className="sh-sprint__template-cards">
            {SPRINT_TEMPLATES.map(t => (
              <motion.button
                key={t.label}
                className={`sh-sprint__template-card${studyMin === t.study && breakMin === t.break_ ? " sh-sprint__template-card--active" : ""}`}
                onClick={() => { setStudyMin(t.study); setBreakMin(t.break_); }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="sh-sprint__template-card-time">
                  {t.study}<span className="sh-sprint__template-card-unit">dk</span>
                </span>
                <span className="sh-sprint__template-card-name">{t.label}</span>
                <span className="sh-sprint__template-card-detail">{t.desc}</span>
              </motion.button>
            ))}
          </div>

          <div className="sh-sprint__config-card">
            <div className="sh-sprint__config-card-header">
              {"\Ö"}zel Ayar
            </div>
            <div className="sh-sprint__config-fields">
              <div className="sh-sprint__config-field">
                <label className="sh-sprint__config-label">
                  {"\Ç"}al{"\ı"}{"\ş"}ma
                </label>
                <div className="sh-sprint__config-input-wrap">
                  <input
                    type="number"
                    className="sh-sprint__config-input"
                    value={studyMin}
                    onChange={e => setStudyMin(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={120}
                  />
                  <span className="sh-sprint__config-unit">dk</span>
                </div>
              </div>
              <div className="sh-sprint__config-field">
                <label className="sh-sprint__config-label">Mola</label>
                <div className="sh-sprint__config-input-wrap">
                  <input
                    type="number"
                    className="sh-sprint__config-input"
                    value={breakMin}
                    onChange={e => setBreakMin(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={60}
                  />
                  <span className="sh-sprint__config-unit">dk</span>
                </div>
              </div>
            </div>
          </div>

          <motion.button
            className="sh-sprint__start-btn"
            onClick={handleStart}
            disabled={starting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {starting ? "Ba\şlat\ıl\ıyor..." : "Sprint Ba\şlat"}
          </motion.button>
        </div>

        <SprintMemberList memberEntries={memberEntries} userId={userId} />
      </div>
    </div>
  );
}
