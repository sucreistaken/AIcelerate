export interface TemplateChannel {
  name: string;
  type: "text" | "announcement" | "study-tool";
  toolType?: string;
}

export interface TemplateCategory {
  name: string;
  channels: TemplateChannel[];
}

export interface ServerTemplate {
  id: string;
  label: string;
  description: string;
  categories: TemplateCategory[];
}

const SERVER_TEMPLATES: ServerTemplate[] = [
  {
    id: "study-group",
    label: "Ders Çalışma Grubu",
    description: "Ders çalışma araçları ve sohbet kanalları",
    categories: [
      {
        name: "Genel",
        channels: [
          { name: "genel", type: "text" },
          { name: "duyurular", type: "announcement" },
          { name: "kaynaklar", type: "text" },
        ],
      },
      {
        name: "Çalışma Araçları",
        channels: [
          { name: "deep-dive", type: "study-tool", toolType: "deep-dive" },
          { name: "flashcards", type: "study-tool", toolType: "flashcards" },
          { name: "quiz-yarışması", type: "study-tool", toolType: "quiz" },
          { name: "zihin-haritası", type: "study-tool", toolType: "mind-map" },
        ],
      },
      {
        name: "Sprint",
        channels: [
          { name: "pomodoro", type: "study-tool", toolType: "sprint" },
          { name: "notlar", type: "study-tool", toolType: "notes" },
        ],
      },
    ],
  },
  {
    id: "exam-prep",
    label: "Sınav Hazırlık Odası",
    description: "Sınav hazırlığı için odaklanmış çalışma ortamı",
    categories: [
      {
        name: "Genel",
        channels: [
          { name: "genel", type: "text" },
          { name: "sınav-tarihi", type: "announcement" },
        ],
      },
      {
        name: "Soru Çözüm",
        channels: [
          { name: "soru-cevap", type: "text" },
          { name: "deep-dive", type: "study-tool", toolType: "deep-dive" },
        ],
      },
      {
        name: "Yarışma",
        channels: [
          { name: "quiz-yarışması", type: "study-tool", toolType: "quiz" },
          { name: "flashcards", type: "study-tool", toolType: "flashcards" },
        ],
      },
      {
        name: "Özet",
        channels: [
          { name: "notlar", type: "study-tool", toolType: "notes" },
          { name: "zihin-haritası", type: "study-tool", toolType: "mind-map" },
        ],
      },
    ],
  },
  {
    id: "project-group",
    label: "Proje Grubu",
    description: "Proje çalışması için organize çalışma alanı",
    categories: [
      {
        name: "Genel",
        channels: [
          { name: "genel", type: "text" },
          { name: "görevler", type: "announcement" },
        ],
      },
      {
        name: "Çalışma",
        channels: [
          { name: "deep-dive", type: "study-tool", toolType: "deep-dive" },
          { name: "notlar", type: "study-tool", toolType: "notes" },
        ],
      },
      {
        name: "Sprint",
        channels: [
          { name: "pomodoro", type: "study-tool", toolType: "sprint" },
        ],
      },
    ],
  },
];

export function getServerTemplates(): ServerTemplate[] {
  return SERVER_TEMPLATES;
}
