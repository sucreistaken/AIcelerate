export function strengthClass(s: number) {
  if (s >= 0.7) return "conn-strength--high";
  if (s >= 0.4) return "conn-strength--mid";
  return "conn-strength--low";
}

export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}
