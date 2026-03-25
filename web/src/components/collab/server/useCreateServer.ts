import { useState } from "react";
import { useServerStore } from "../../../stores/serverStore";
import { useProfileStore } from "../../../stores/profileStore";
import type { ServerTemplate } from "../../../types";

export const COLORS = [
  "#6C5CE7", "#00B894", "#FDCB6E", "#E17055", "#0984E3",
  "#D63031", "#A29BFE", "#55A3E8", "#F78FB3", "#3DC1D3",
];

export const BUILT_IN_TEMPLATES: ServerTemplate[] = [
  {
    id: "study-group",
    label: "Ders Çalışma Odası",
    description: "Ders çalışma araçları ve sohbet",
    categories: [
      { name: "Genel", channels: [{ name: "genel", type: "text" }, { name: "duyurular", type: "announcement" }, { name: "kaynaklar", type: "text" }] },
      { name: "Çalışma Araçları", channels: [{ name: "deep-dive", type: "study-tool", toolType: "deep-dive" }, { name: "flashcards", type: "study-tool", toolType: "flashcards" }, { name: "quiz-yarışması", type: "study-tool", toolType: "quiz" }, { name: "zihin-haritası", type: "study-tool", toolType: "mind-map" }] },
      { name: "Sprint", channels: [{ name: "pomodoro", type: "study-tool", toolType: "sprint" }, { name: "notlar", type: "study-tool", toolType: "notes" }] },
    ],
  },
  {
    id: "exam-prep",
    label: "Sınav Hazırlık Odası",
    description: "Sınav hazırlığı için odaklanmış çalışma ortamı",
    categories: [
      { name: "Genel", channels: [{ name: "genel", type: "text" }, { name: "sınav-tarihi", type: "announcement" }] },
      { name: "Soru Çözüm", channels: [{ name: "soru-cevap", type: "text" }, { name: "deep-dive", type: "study-tool", toolType: "deep-dive" }] },
      { name: "Yarışma", channels: [{ name: "quiz-yarışması", type: "study-tool", toolType: "quiz" }, { name: "flashcards", type: "study-tool", toolType: "flashcards" }] },
      { name: "Özet", channels: [{ name: "notlar", type: "study-tool", toolType: "notes" }, { name: "zihin-haritası", type: "study-tool", toolType: "mind-map" }] },
    ],
  },
  {
    id: "project-group",
    label: "Proje Odası",
    description: "Proje çalışması için organize çalışma alanı",
    categories: [
      { name: "Genel", channels: [{ name: "genel", type: "text" }, { name: "görevler", type: "announcement" }] },
      { name: "Çalışma", channels: [{ name: "deep-dive", type: "study-tool", toolType: "deep-dive" }, { name: "notlar", type: "study-tool", toolType: "notes" }] },
      { name: "Sprint", channels: [{ name: "pomodoro", type: "study-tool", toolType: "sprint" }] },
    ],
  },
];

export const TEMPLATE_ICONS: Record<string, string> = {
  "study-group": "S",
  "exam-prep": "E",
  "project-group": "P",
};

export const CHANNEL_TYPE_ICONS: Record<string, string> = {
  text: "#",
  announcement: "!",
  "study-tool": "#",
};

export const TOOL_ICONS: Record<string, string> = {
  "deep-dive": "D",
  flashcards: "F",
  quiz: "Q",
  "mind-map": "M",
  sprint: "S",
  notes: "N",
};

export type ModalTab = "create" | "join";
export type Step = "purpose" | "details" | "preview";

export function useCreateServer(onClose: () => void) {
  const [tab, setTab] = useState<ModalTab>("create");
  const [step, setStep] = useState<Step>("purpose");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [university, setUniversity] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const createServer = useServerStore((s) => s.createServer);
  const selectServer = useServerStore((s) => s.selectServer);
  const joinByInvite = useServerStore((s) => s.joinByInvite);
  const profile = useProfileStore((s) => s.profile);

  const currentTemplate = BUILT_IN_TEMPLATES.find((t) => t.id === selectedTemplate);

  const reset = () => {
    setStep("purpose");
    setSelectedTemplate(null);
    setName("");
    setDescription("");
    setColor(COLORS[0]);
    setUniversity("");
    setTagsInput("");
    setIsPublic(false);
    setInviteCode("");
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSelectTemplate = (templateId: string | null) => {
    setSelectedTemplate(templateId);
    setStep("details");
  };

  const handleCreate = async () => {
    if (!name.trim() || !profile) return;
    setLoading(true);
    setError("");
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const server = await createServer(
        name.trim(),
        description.trim(),
        profile.id,
        color,
        {
          tags,
          university: university.trim() || undefined,
          isPublic,
          templateId: selectedTemplate || undefined,
        }
      );
      await selectServer(server.id);
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim() || !profile) return;
    setLoading(true);
    setError("");
    try {
      const server = await joinByInvite(inviteCode.trim(), profile.id);
      await selectServer(server.id);
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    tab, setTab,
    step, setStep,
    selectedTemplate,
    name, setName,
    description, setDescription,
    color, setColor,
    university, setUniversity,
    tagsInput, setTagsInput,
    isPublic, setIsPublic,
    inviteCode, setInviteCode,
    error, setError,
    loading,
    currentTemplate,
    handleClose,
    handleSelectTemplate,
    handleCreate,
    handleJoin,
  };
}
