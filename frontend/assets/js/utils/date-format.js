const LOCALE = "es-MX";

function parseUTC(value) {
  if (!value) return null;
  // El backend guarda timestamps UTC sin sufijo de zona
  const iso = typeof value === "string" && !value.endsWith("Z") && !value.includes("+")
    ? value + "Z"
    : value;
  return new Date(iso);
}

export function formatDate(value) {
  const d = parseUTC(value);
  if (!d) return "—";
  return d.toLocaleDateString(LOCALE, { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(value) {
  const d = parseUTC(value);
  if (!d) return "—";
  return d.toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(value) {
  const d = parseUTC(value);
  if (!d) return "—";
  return d.toLocaleDateString(LOCALE, { day: "2-digit", month: "short", year: "2-digit" });
}
