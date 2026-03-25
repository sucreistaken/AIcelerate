import type { ChannelNoteItem } from "../../../../types";

export type NoteCategory = ChannelNoteItem["category"];
export type FilterCategory = "all" | NoteCategory;

export const EMPTY_NOTES: ChannelNoteItem[] = [];

export const CATEGORIES: { value: NoteCategory; label: string; icon: string }[] = [
  { value: "concept", label: "Kavram", icon: "K" },
  { value: "formula", label: "Form\ül", icon: "F" },
  { value: "example", label: "\Örnek", icon: "O" },
  { value: "tip", label: "\İpucu", icon: "i" },
  { value: "warning", label: "Uyar\ı", icon: "!" },
  { value: "summary", label: "\Özet", icon: "Z" },
];

export const CATEGORY_MAP: Record<NoteCategory, { label: string; icon: string }> = {
  concept: { label: "Kavram", icon: "K" },
  formula: { label: "Form\ül", icon: "F" },
  example: { label: "\Örnek", icon: "O" },
  tip: { label: "\İpucu", icon: "i" },
  warning: { label: "Uyar\ı", icon: "!" },
  summary: { label: "\Özet", icon: "Z" },
};

export const FILTER_OPTIONS: { value: FilterCategory; label: string }[] = [
  { value: "all", label: "T\üm\ü" },
  ...CATEGORIES.map((c) => ({ value: c.value as FilterCategory, label: `${c.icon} ${c.label}` })),
];
