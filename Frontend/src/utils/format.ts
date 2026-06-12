export function formatDateLabel(value?: string | null): string {
  if (!value) return "No definido";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No definido";

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

export function getTodayLabel(): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date())
    .replace(".", "")
    .toUpperCase();
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CP";

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function normalizeDni(value: string): string {
  return value.replace(/\D/g, "").slice(0, 15);
}


export function formatDateTimeLabel(value?: string | null): string {
  if (!value) return "No definido";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No definido";

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}
