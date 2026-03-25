import { useMemo, useState } from "react";
import { Emphasis } from "../types";
import {
  EmphasisSource,
  EnrichedEmphasis,
  Importance,
  LoMap,
} from "../components/lecturer-note/types";
import { getImportance, normalizeSource } from "../components/lecturer-note/utils";

export function useLecturerNote(
  emphases: Emphasis[],
  learningOutcomes: string[]
) {
  const [filterSource, setFilterSource] = useState<"all" | EmphasisSource>(
    "all"
  );
  const [filterImportance, setFilterImportance] = useState<"all" | Importance>(
    "all"
  );
  const [sortKey, setSortKey] = useState<"recommended" | "lo" | "order">(
    "recommended"
  );
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [openSelfCheckIdx, setOpenSelfCheckIdx] = useState<number | null>(null);

  const loMap: LoMap = useMemo(() => {
    const map: LoMap = {};
    learningOutcomes.forEach((lo, i) => {
      const id = `LO${i + 1}`;
      map[id] = { id, title: lo, index: i };
    });
    return map;
  }, [learningOutcomes]);

  const enriched: EnrichedEmphasis[] = useMemo(
    () =>
      (emphases || []).map((e, idx) => ({
        ...(e as any),
        __index: idx,
      })),
    [emphases]
  );

  const total = enriched.length;
  const countLecture = enriched.filter(
    (e) => normalizeSource(e) === "lecture"
  ).length;
  const countSlides = enriched.filter(
    (e) => normalizeSource(e) === "slides"
  ).length;
  const countBoth = enriched.filter(
    (e) => normalizeSource(e) === "both"
  ).length;

  const visible: EnrichedEmphasis[] = useMemo(() => {
    let items = [...enriched];

    if (filterSource !== "all") {
      items = items.filter((e) => normalizeSource(e) === filterSource);
    }

    if (filterImportance !== "all") {
      items = items.filter((e) => getImportance(e) === filterImportance);
    }

    if (sortKey === "recommended") {
      const weight = (imp: Importance) =>
        imp === "high" ? 2 : imp === "medium" ? 1 : 0;
      items.sort(
        (a, b) =>
          weight(getImportance(b)) - weight(getImportance(a)) ||
          a.__index - b.__index
      );
    } else if (sortKey === "lo") {
      const getFirstLoIndex = (e: EnrichedEmphasis) => {
        const ids: string[] = (e as any).related_lo_ids || [];
        const first = ids[0];
        if (!first || !loMap[first]) return 999;
        return loMap[first].index;
      };
      items.sort(
        (a, b) =>
          getFirstLoIndex(a) - getFirstLoIndex(b) || a.__index - b.__index
      );
    } else {
      items.sort((a, b) => a.__index - b.__index);
    }

    return items;
  }, [enriched, filterSource, filterImportance, sortKey, loMap]);

  const selected =
    modalIndex != null && modalIndex >= 0 && modalIndex < visible.length
      ? visible[modalIndex]
      : null;

  const handleOpenModal = (idx: number) => {
    setModalIndex(idx);
    setOpenSelfCheckIdx(null);
  };

  const handleCloseModal = () => {
    setModalIndex(null);
    setOpenSelfCheckIdx(null);
  };

  const gotoPrev = () => {
    if (!visible.length || modalIndex == null) return;
    setModalIndex((prev) =>
      prev == null ? 0 : (prev - 1 + visible.length) % visible.length
    );
    setOpenSelfCheckIdx(null);
  };

  const gotoNext = () => {
    if (!visible.length || modalIndex == null) return;
    setModalIndex((prev) =>
      prev == null ? 0 : (prev + 1) % visible.length
    );
    setOpenSelfCheckIdx(null);
  };

  return {
    filterSource,
    setFilterSource,
    filterImportance,
    setFilterImportance,
    sortKey,
    setSortKey,
    openSelfCheckIdx,
    setOpenSelfCheckIdx,
    loMap,
    total,
    countLecture,
    countSlides,
    countBoth,
    visible,
    selected,
    handleOpenModal,
    handleCloseModal,
    gotoPrev,
    gotoNext,
  };
}
