import { AnimatePresence } from "framer-motion";
import { useConnections } from "../hooks/useConnections";
import PaneInfoBanner from "./ui/PaneInfoBanner";
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
            <div className="pane-header__title">Cross-Lesson Connections</div>
            <div className="pane-header__desc">
              Discover concepts shared across multiple lessons.
            </div>
          </div>
          <div className="pane-header__actions">
            <button className="btn" onClick={buildConnections} disabled={loading}>
              {loading ? "Building..." : "Build Connections"}
            </button>
          </div>
        </div>
        <PaneInfoBanner
          id="connections"
          title="Connections Nedir?"
          description="Birden fazla dersinizde gecen ortak kavramlari otomatik tespit eder. Strength yuzdesi, kavramin dersler arasinda ne kadar guclu baglandigini gosterir. Build Connections ile tum derslerinizi analiz edin."
          tips={["Guc %70+ = Cok guclu baglanti", "Graph view ile gorsel kesfet", "Kavrama tikla = detay paneli"]}
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
            List View
          </button>
          <button
            className={`view-toggle__btn${view === "graph" ? " view-toggle__btn--active" : ""}`}
            onClick={() => setView("graph")}
          >
            Graph View
          </button>
        </div>
      </section>

      <section className="lc-section">
        {loading ? (
          <div className="pane-empty" style={{ padding: 32 }}>
            <div className="pane-empty__desc">Building connections...</div>
          </div>
        ) : connections.length === 0 ? (
          <div className="pane-empty">
            <div className="pane-empty__icon">C</div>
            <div className="pane-empty__title">No connections yet</div>
            <div className="pane-empty__desc">
              Click "Build Connections" to analyze concepts across your lessons.
            </div>
          </div>
        ) : filteredConnections.length === 0 ? (
          <div className="pane-empty">
            <div className="pane-empty__icon">?</div>
            <div className="pane-empty__title">No matches</div>
            <div className="pane-empty__desc">
              Try adjusting your search or filter criteria.
            </div>
          </div>
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
