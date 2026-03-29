import { AnimatePresence } from "framer-motion";
import { useConnections } from "../hooks/useConnections";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { EmptyState } from "./ui/EmptyState";
import { ListSkeleton } from "./ui/Skeleton";
import { t } from "../utils/i18n";
import {
  StatsSummary,
  FilterToolbar,
  ListView,
  GraphView,
  ConnectionDetailPanel,
} from "./connections";

export default function ConnectionsPane() {
  const {
    connections,
    loading,
    error,
    selectedConcept,
    setSelectedConcept,
    buildConnections,
    view,
    setView,
    filteredConnections,
    selectedConnection,
  } = useConnections();

  return (
    <div className="grid-gap-12">
      <section className="lc-section">
        <div className="pane-header" style={{ marginBottom: 14 }}>
          <div className="pane-header__info">
            <div className="pane-header__title">{t("connections.pageTitle")}</div>
            <div className="pane-header__desc">
              {t("connections.pageDesc")}
            </div>
          </div>
          <div className="pane-header__actions">
            <button className="btn" onClick={buildConnections} disabled={loading}>
              {loading ? t("connections.building") : t("connections.buildBtn")}
            </button>
          </div>
        </div>
        <PaneInfoBanner
          id="connections"
          title={t("connections.title")}
          description={t("connections.desc")}
          tips={[t("connections.tips1"), t("connections.tips2"), t("connections.tips3")]}
        />

        {error && (
          <div style={{ padding: "8px 14px", background: "var(--card-hover)", borderRadius: "var(--radius-sm)", color: "var(--warning)", fontSize: 13, marginBottom: 10 }}>
            {error}
          </div>
        )}

        {connections.length > 0 && <StatsSummary connections={connections} />}
        {connections.length > 0 && <FilterToolbar connections={connections} />}

        <div className="view-toggle" style={{ marginTop: connections.length > 0 ? 10 : 0 }}>
          <button
            className={`view-toggle__btn${view === "list" ? " view-toggle__btn--active" : ""}`}
            onClick={() => setView("list")}
          >
            {t("connections.listView")}
          </button>
          <button
            className={`view-toggle__btn${view === "graph" ? " view-toggle__btn--active" : ""}`}
            onClick={() => setView("graph")}
          >
            {t("connections.graphView")}
          </button>
        </div>
      </section>

      <section className="lc-section">
        {loading ? (
          <ListSkeleton count={4} />
        ) : connections.length === 0 ? (
          <EmptyState
            title={t("connections.noConnections")}
            description={t("connections.emptyHint")}
            action={{ label: t("connections.buildBtn"), onClick: buildConnections }}
          />
        ) : filteredConnections.length === 0 ? (
          <EmptyState
            title={t("connections.noMatches")}
            description={t("connections.noMatchesDesc")}
          />
        ) : view === "list" ? (
          <ListView
            connections={filteredConnections}
            selectedConcept={selectedConcept}
            onSelect={setSelectedConcept}
          />
        ) : (
          <GraphView
            connections={filteredConnections}
            selectedConcept={selectedConcept}
            onSelect={setSelectedConcept}
          />
        )}
      </section>

      <AnimatePresence>
        {selectedConnection && (
          <ConnectionDetailPanel
            key={selectedConnection.concept}
            connection={selectedConnection}
            onClose={() => setSelectedConcept(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
