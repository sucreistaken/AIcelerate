import { useEffect, useMemo, useState } from "react";
import { useConnectionsStore } from "../stores/connectionsStore";

export function useConnections() {
  const store = useConnectionsStore();
  const {
    connections,
    loading,
    error,
    selectedConcept,
    setSelectedConcept,
    fetchConnections,
    buildConnections,
  } = store;

  const [view, setView] = useState<"list" | "graph">("list");

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const filteredConnections = useMemo(
    () => store.getFilteredConnections(),
    [connections, store.searchQuery, store.minStrength, store.selectedLessonFilter, store.sortMode]
  );

  const selectedConnection = useMemo(
    () => connections.find((c) => c.concept === selectedConcept) || null,
    [connections, selectedConcept]
  );

  return {
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
  };
}
