export function formatUsDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function formatUsTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatUsTimeWindow(startIso: string, endIso: string, timeZone: string): string {
  return `${formatUsTime(startIso, timeZone)} – ${formatUsTime(endIso, timeZone)}`;
}
