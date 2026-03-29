import React from "react";
import { Emphasis, LoAlignment } from "../types";
import { useLecturerNote } from "../hooks/useLecturerNote";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { t } from "../utils/i18n";
import {
  LecturerNoteHeader,
  EmphasisCardGrid,
  LearningOutcomesCard,
  EmphasisDetailModal,
} from "./lecturer-note";

type Props = {
  lectureText: string;
  slidesText: string;
  emphases: Emphasis[];
  learningOutcomes: string[];
  loAlignment: LoAlignment | null;
};

const LecturerNotePane: React.FC<Props> = ({
  emphases,
  learningOutcomes,
}) => {
  const {
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
  } = useLecturerNote(emphases, learningOutcomes);

  return (
    <div className="lc-section ln-root">
      <PaneInfoBanner
        id="lecturer-note"
        title={t("lecturerNote.bannerTitle")}
        description={t("lecturerNote.bannerDesc")}
        tips={[t("lecturerNote.tip1"), t("lecturerNote.tip2"), t("lecturerNote.tip3")]}
      />
      <LecturerNoteHeader
        total={total}
        countLecture={countLecture}
        countSlides={countSlides}
        countBoth={countBoth}
        filterSource={filterSource}
        setFilterSource={setFilterSource}
        filterImportance={filterImportance}
        setFilterImportance={setFilterImportance}
        sortKey={sortKey}
        setSortKey={setSortKey}
      />

      <EmphasisCardGrid
        visible={visible}
        loMap={loMap}
        onOpenModal={handleOpenModal}
      />

      <LearningOutcomesCard learningOutcomes={learningOutcomes} />

      {selected && (
        <EmphasisDetailModal
          selected={selected}
          loMap={loMap}
          openSelfCheckIdx={openSelfCheckIdx}
          setOpenSelfCheckIdx={setOpenSelfCheckIdx}
          onClose={handleCloseModal}
          onPrev={gotoPrev}
          onNext={gotoNext}
        />
      )}
    </div>
  );
};

export default LecturerNotePane;
