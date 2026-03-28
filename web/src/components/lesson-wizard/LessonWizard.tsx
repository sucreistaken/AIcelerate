import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLessonWizard } from "../../hooks/useLessonWizard";
import { useLessonStore } from "../../stores/lessonStore";
import { t } from "../../utils/i18n";
import WizardStepHeader from "./WizardStepHeader";
import LessonInfoStep from "./LessonInfoStep";
import SlidesUploadStep from "./SlidesUploadStep";
import AudioUploadStep from "./AudioUploadStep";
import SummaryStep from "./SummaryStep";

export default function LessonWizard() {
  const w = useLessonWizard();
  const lessonStore = useLessonStore();

  return (
    <div style={{ minHeight: "60vh", padding: "0 8px" }}>
      {/* Header with back navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button
          className="btn btn-ghost"
          onClick={w.goBack}
          style={{ fontSize: 13, padding: "4px 10px" }}
        >
          {w.selectedCourse ? t("wizard.returnToCourse", { code: w.selectedCourse.code }) : t("wizard.back")}
        </button>
      </div>

      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <h2 className="h2" style={{ fontSize: 20 }}>{t("wizard.newLessonTitle")}</h2>
        {w.selectedCourse && (
          <span className="muted" style={{ fontSize: 12 }}>
            {w.selectedCourse.code} — {w.selectedCourse.name}
          </span>
        )}
      </div>

      {/* Step indicator */}
      <WizardStepHeader
        currentStep={w.step}
        onStepClick={(s) => {
          if (s < w.step) w.setStep(s);
        }}
      />

      {/* Step content with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={w.step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {w.step === 1 && (
            <LessonInfoStep
              title={w.title}
              weekNumber={w.weekNumber}
              courses={w.courses}
              selectedCourseId={w.selectedCourseId}
              isCreating={w.isCreating}
              error={w.error}
              canProceed={w.canProceed}
              onTitleChange={w.setTitle}
              onWeekChange={w.setWeekNumber}
              onCourseChange={w.setSelectedCourseId}
              onCourseCreated={() => {/* course store auto-updates */}}
              onNext={w.createLessonAndNext}
            />
          )}

          {w.step === 2 && (
            <SlidesUploadStep
              slidesText={w.slidesText}
              isUploading={w.isUploadingPdf}
              pdfFileName={w.pdfFileName}
              error={w.error}
              onPdfUpload={w.handlePdfUpload}
              onSlidesTextChange={w.setSlidesText}
              onNext={w.nextStep}
              onBack={w.prevStep}
            />
          )}

          {w.step === 3 && (
            <AudioUploadStep
              lectureText={w.lectureText}
              stt={w.stt}
              error={w.error}
              onAudioUpload={w.handleAudioUpload}
              onLectureTextChange={(text) => lessonStore.setLectureText(text)}
              onClearTranscription={w.clearTranscription}
              onNext={w.nextStep}
              onBack={w.prevStep}
            />
          )}

          {w.step === 4 && (
            <SummaryStep
              title={w.title}
              weekNumber={w.weekNumber}
              course={w.selectedCourse}
              slidesText={w.slidesText}
              lectureText={w.lectureText}
              isAnalyzing={w.isAnalyzing}
              canAnalyze={w.canProceed}
              error={w.error}
              streaming={w.streaming}
              onAnalyze={w.handleAnalyze}
              onBack={w.prevStep}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
