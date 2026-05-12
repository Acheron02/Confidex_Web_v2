export function normalizePhone(phone: string): string {
  const trimmed = String(phone || "")
    .replace(/\s+/g, "")
    .trim();

  if (trimmed.startsWith("+63")) return trimmed;
  if (trimmed.startsWith("63")) return `+${trimmed}`;
  if (trimmed.startsWith("0")) return `+63${trimmed.slice(1)}`;

  return trimmed;
}
