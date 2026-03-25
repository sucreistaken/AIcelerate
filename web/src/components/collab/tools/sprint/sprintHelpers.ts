export const RADIUS = 90;
export const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const SPRINT_TEMPLATES = [
  { label: "Klasik", study: 25, break_: 5, desc: "25/5 Pomodoro" },
  { label: "Uzun Odak", study: 50, break_: 10, desc: "50/10 derin \çal\ı\şma" },
  { label: "Maraton", study: 90, break_: 20, desc: "90/20 uzun oturum" },
];

export const formatTime = (s: number): string =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

export const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const statusColor = (status: string) => {
  if (status === "studying") return "var(--accent-2)";
  if (status === "break") return "#22c55e";
  return "var(--border)";
};

export const statusLabel = (status: string) => {
  if (status === "studying") return "\Çal\ı\ş\ıyor";
  if (status === "break") return "Molada";
  return "Bekliyor";
};
