import { motion } from "framer-motion";
import { t } from "../../utils/i18n";

interface Props {
  resources: any[];
}

export default function PlanResources({ resources }: Props) {
  if (!resources.length) return null;

  return (
    <motion.section
      className="pp__resources"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="pp__section-header">
        <div className="pp__section-icon pp__section-icon--res">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <h2 className="pp__section-title">{t("plan.resources")}</h2>
        <span className="pp__section-count">{resources.length} kaynak</span>
      </div>

      <div className="pp__resources-list">
        {resources.map((r, i) => {
          let title: string;
          let url: string | null = null;

          if (typeof r === "string") {
            title = r;
          } else if (typeof r === "object" && r !== null) {
            title = r.title || JSON.stringify(r);
            url = r.url || null;
          } else {
            title = JSON.stringify(r);
          }

          return (
            <motion.div
              key={i}
              className="pp__resource"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.22 + i * 0.03 }}
            >
              <div className="pp__resource-icon">
                {url ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                )}
              </div>
              <div className="pp__resource-body">
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="pp__resource-link">
                    {title}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                ) : (
                  <span className="pp__resource-text">{title}</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
