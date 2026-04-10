import React from "react";
import { motion } from "framer-motion";
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

const LecturerNotePane: React.FC<Props> = ({ emphases, learningOutcomes }) => {
  const {
    filterSource, setFilterSource,
    filterImportance, setFilterImportance,
    sortKey, setSortKey,
    openSelfCheckIdx, setOpenSelfCheckIdx,
    loMap, total, countLecture, countSlides, countBoth,
    visible, selected, handleOpenModal, handleCloseModal,
    gotoPrev, gotoNext,
  } = useLecturerNote(emphases, learningOutcomes);

  return (
    <motion.div
      className="ln"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <PaneInfoBanner
        id="lecturer-note"
        title={t("lecturerNote.bannerTitle")}
        description={t("lecturerNote.bannerDesc")}
        tips={[t("lecturerNote.tip1"), t("lecturerNote.tip2"), t("lecturerNote.tip3")]}
      />

      <motion.div
        className="ln__hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="ln__hero-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <h1 className="ln__hero-title">{t("lecturerNote.bannerTitle")}</h1>
      </motion.div>

      <LecturerNoteHeader
        total={total}
        countLecture={countLecture}
        countSlides={countSlides}
        countBoth={countBoth}
        filterSource={filterSource} setFilterSource={setFilterSource}
        filterImportance={filterImportance} setFilterImportance={setFilterImportance}
        sortKey={sortKey} setSortKey={setSortKey}
      />

      <EmphasisCardGrid visible={visible} loMap={loMap} onOpenModal={handleOpenModal} />

      <LearningOutcomesCard learningOutcomes={learningOutcomes} />

      {selected && (
        <EmphasisDetailModal
          selected={selected} loMap={loMap}
          openSelfCheckIdx={openSelfCheckIdx} setOpenSelfCheckIdx={setOpenSelfCheckIdx}
          onClose={handleCloseModal} onPrev={gotoPrev} onNext={gotoNext}
        />
      )}
    </motion.div>
  );
};

export default LecturerNotePane;
