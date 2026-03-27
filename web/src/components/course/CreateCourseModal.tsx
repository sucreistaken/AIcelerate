import { useState } from "react";
import { useCourseStore } from "../../stores/courseStore";
import { t } from "../../utils/i18n";

export function CreateCourseModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const createCourse = useCourseStore((s) => s.createCourse);

  const handleCreate = async () => {
    if (!code.trim() || !name.trim()) return;
    await createCourse(code.trim(), name.trim(), desc.trim() || undefined);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-title h3 mb-4">{t("course.createNewCourse")}</div>
        <label className="label">{t("course.courseCodeLabel")}</label>
        <input
          autoFocus
          className="lc-textarea input mb-3 w-full"
          placeholder={t("course.courseCodePlaceholder")}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <label className="label">{t("course.courseNameLabel")}</label>
        <input
          className="lc-textarea input mb-3 w-full"
          placeholder={t("course.courseNamePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <label className="label">{t("course.descriptionOptional")}</label>
        <textarea
          className="lc-textarea textarea mb-3 w-full"
          placeholder={t("course.descriptionPlaceholder")}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
        />
        <div className="modal-actions flex justify-end gap-2">
          <button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={!code.trim() || !name.trim()}>
            {t("course.createCourse")}
          </button>
        </div>
      </div>
    </div>
  );
}
