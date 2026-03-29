import { useCourseDashboard } from "../hooks/useCourseDashboard";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "./ui/ConfirmModal";
import {
  CourseListView,
  CourseHeader,
  CourseTabs,
  OverviewTab,
  ProgressTab,
  ScheduleTab,
  CourseChat,
  AssignLessonModal,
} from "./course";

export default function CourseDashboard() {
  const {
    courses,
    course,
    courseLessons,
    selectCourse,
    deleteCourse,
    rebuildIndex,
    removeLessonFromCourse,
    exportCourse,
    courseProgress,
    weeklySchedule,
    progressLoading,
    scheduleLoading,
    generateWeeklySchedule,
    showCreateModal,
    setShowCreateModal,
    showAssignModal,
    setShowAssignModal,
    chatInput,
    setChatInput,
    chatHistory,
    chatLoading,
    activeTab,
    setActiveTab,
    chatBottomRef,
    confirmRebuild,
    setConfirmRebuild,
    confirmDelete,
    setConfirmDelete,
    confirmDetach,
    setConfirmDetach,
    goToLesson,
    createLesson,
    handleCourseChat,
    clearChat,
    // Selection
    isSelectionMode,
    selectedLessonIds,
    enterSelectionMode,
    exitSelectionMode,
    toggleLesson,
    handleSelectAll,
    clearSelection,
    studySelected,
  } = useCourseDashboard();

  if (!course) {
    return (
      <CourseListView
        courses={courses}
        showCreateModal={showCreateModal}
        onShowCreateModal={setShowCreateModal}
        onSelectCourse={selectCourse}
      />
    );
  }

  return (
    <div className="lc-section" style={{ padding: 24 }}>
      <ConfirmModal
        isOpen={confirmRebuild}
        onConfirm={() => { setConfirmRebuild(false); rebuildIndex(course.id); }}
        onCancel={() => setConfirmRebuild(false)}
        title="Knowledge Index Yeniden Olu\ştur"
        message="Knowledge Index yeniden olu\şturulsun mu? Bu i\şlem biraz zaman alabilir."
        confirmLabel="Evet, Olu\ştur"
        cancelLabel="\İptal"
        variant="warning"
      />
      <ConfirmModal
        isOpen={confirmDelete}
        onConfirm={async () => { setConfirmDelete(false); await deleteCourse(course.id); }}
        onCancel={() => setConfirmDelete(false)}
        title="Kursu Sil"
        message={`"${course.code}" kursu silinecek. Bu i\şlem geri al\ınamaz.`}
        confirmLabel="Evet, Sil"
        cancelLabel="\İptal"
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!confirmDetach}
        onConfirm={async () => {
          if (confirmDetach) {
            await removeLessonFromCourse(confirmDetach.courseId, confirmDetach.lessonId);
            setConfirmDetach(null);
          }
        }}
        onCancel={() => setConfirmDetach(null)}
        title="Dersi Kurstan Çıkar"
        message={`"${confirmDetach?.title || ''}" dersini bu kurstan çıkarmak istediğinize emin misiniz?`}
        confirmLabel="Evet, Çıkar"
        cancelLabel="İptal"
        variant="warning"
      />

      <CourseHeader
        course={course}
        onBack={() => selectCourse(null)}
        onExport={() => exportCourse(course.id)}
        onRebuild={() => setConfirmRebuild(true)}
        onDelete={() => setConfirmDelete(true)}
      />

      <CourseTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <OverviewTab
              course={course}
              courseLessons={courseLessons}
              onAddLesson={() => setShowAssignModal(true)}
              onCreateLesson={createLesson}
              onRemoveLesson={(courseId, lessonId) => {
                const lesson = courseLessons.find(l => l.id === lessonId);
                setConfirmDetach({ courseId, lessonId, title: lesson?.title || 'Ders' });
              }}
              onGoToLesson={goToLesson}
              isSelectionMode={isSelectionMode}
              selectedLessonIds={selectedLessonIds}
              onEnterSelectionMode={enterSelectionMode}
              onExitSelectionMode={exitSelectionMode}
              onToggleLesson={toggleLesson}
              onSelectAll={handleSelectAll}
              onClearAll={clearSelection}
              onStudySelected={studySelected}
            />
          </motion.div>
        )}

        {activeTab === "progress" && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ProgressTab progressLoading={progressLoading} courseProgress={courseProgress} />
          </motion.div>
        )}

        {activeTab === "schedule" && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ScheduleTab
              course={course}
              weeklySchedule={weeklySchedule}
              scheduleLoading={scheduleLoading}
              onGenerate={generateWeeklySchedule}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <CourseChat
        chatHistory={chatHistory}
        chatInput={chatInput}
        chatLoading={chatLoading}
        chatBottomRef={chatBottomRef}
        onInputChange={setChatInput}
        onSend={handleCourseChat}
        onClear={clearChat}
      />

      {showAssignModal && <AssignLessonModal course={course} onClose={() => setShowAssignModal(false)} lang="tr" />}
    </div>
  );
}
