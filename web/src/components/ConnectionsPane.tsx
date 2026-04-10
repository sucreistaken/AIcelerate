import { motion, AnimatePresence } from "framer-motion";
import { useConnections } from "../hooks/useConnections";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { EmptyState } from "./ui/EmptyState";
import { ListSkeleton } from "./ui/Skeleton";
import { t } from "../utils/i18n";
import {
  StatsSummary, FilterToolbar, ListView,
  GraphView, ConnectionDetailPanel,
} from "./connections";

export default function ConnectionsPane() {
  const {
    connections, loading, error, selectedConcept, setSelectedConcept,
    buildConnections, view, setView, filteredConnections, selectedConnection,
  } = useConnections();

  return (
    <motion.div
      className="cn"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <PaneInfoBanner
        id="connections"
        title={t("connections.title")}
        description={t("connections.desc")}
        tips={[t("connections.tips1"), t("connections.tips2"), t("connections.tips3")]}
      />

      <motion.header
        className="cn__header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="cn__header-left">
          <div className="cn__header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
          <div>
            <h1 className="cn__title">{t("connections.pageTitle")}</h1>
            <p className="cn__desc">{t("connections.pageDesc")}</p>
          </div>
        </div>
        <div className="cn__header-actions">
          <button className="cn__build-btn" onClick={buildConnections} disabled={loading}>
            {loading ? (
              <><svg className="cn__spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> {t("connections.building")}</>
            ) : t("connections.buildBtn")}
          </button>
        </div>
      </motion.header>

      {error && <div className="cn__error">{error}</div>}

      {connections.length > 0 && <StatsSummary connections={connections} />}
      {connections.length > 0 && <FilterToolbar connections={connections} />}

      <div className="cn__view-toggle">
        <button
          className={`cn__view-btn${view === "list" ? " cn__view-btn--active" : ""}`}
          onClick={() => setView("list")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          {t("connections.listView")}
        </button>
        <button
          className={`cn__view-btn${view === "graph" ? " cn__view-btn--active" : ""}`}
          onClick={() => setView("graph")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          {t("connections.graphView")}
        </button>
      </div>

      <div className="cn__content">
        {loading ? (
          <ListSkeleton count={4} />
        ) : connections.length === 0 ? (
          <EmptyState title={t("connections.noConnections")} description={t("connections.emptyHint")} action={{ label: t("connections.buildBtn"), onClick: buildConnections }} />
        ) : filteredConnections.length === 0 ? (
          <EmptyState title={t("connections.noMatches")} description={t("connections.noMatchesDesc")} />
        ) : view === "list" ? (
          <ListView connections={filteredConnections} selectedConcept={selectedConcept} onSelect={setSelectedConcept} />
        ) : (
          <GraphView connections={filteredConnections} selectedConcept={selectedConcept} onSelect={setSelectedConcept} />
        )}
      </div>

      <AnimatePresence>
        {selectedConnection && (
          <ConnectionDetailPanel key={selectedConnection.concept} connection={selectedConnection} onClose={() => setSelectedConcept(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
