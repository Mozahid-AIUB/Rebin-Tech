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

const DAY_MS = 86_400_000;

/** Weekend by UTC day-of-week; these dates are plain calendar days, not instants. */
function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * The bookable pickup dates on and after `from`, as YYYY-MM-DD.
 *
 * Two business days of lead time (S26) so dispatch can staff the job, and
 * weekends dropped entirely -- an agent can't serve a Saturday slot, so
 * offering one would only produce a request that has to be rescheduled.
 */
export function nextPickupDates(from: string, count: number): string[] {
  const cursor = new Date(`${from}T00:00:00Z`);
  let leadRemaining = 2;
  while (leadRemaining > 0) {
    cursor.setTime(cursor.getTime() + DAY_MS);
    if (!isWeekend(cursor)) leadRemaining -= 1;
  }

  const dates: string[] = [];
  while (dates.length < count) {
    if (!isWeekend(cursor)) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setTime(cursor.getTime() + DAY_MS);
  }
  return dates;
}

/** How far `timeZone` sits from UTC at one specific instant, in ms. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // `hour12: false` renders midnight as "24" in some engines; %24 normalises it.
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asIfUtc - instant.getTime();
}

/** A wall-clock time in a facility's own zone, as a real UTC instant. */
function zonedWallClockToUtc(date: string, time: string, timeZone: string): Date {
  const naive = Date.parse(`${date}T${time}:00Z`);
  // Two passes: the offset that applies at the *answer* is what's needed, and
  // near a DST transition it differs from the offset at the naive guess.
  const guess = naive - zoneOffsetMs(new Date(naive), timeZone);
  return new Date(naive - zoneOffsetMs(new Date(guess), timeZone));
}

/**
 * A calendar date plus a "HH:MM-HH:MM" slot, as the two timestamptz values
 * pickup_requests stores.
 *
 * The slot is wall-clock time at the facility, so the same "8 – 11 AM" is a
 * different pair of instants in January than in August. Resolving that here
 * keeps every caller from having to think about DST.
 */
export function buildPickupWindow(
  date: string,
  slot: string,
  timeZone: string,
): { windowStart: string; windowEnd: string } {
  const [start, end] = slot.split("-");
  if (!start || !end) throw new Error(`Malformed time slot: ${slot}`);
  return {
    windowStart: zonedWallClockToUtc(date, start, timeZone).toISOString(),
    windowEnd: zonedWallClockToUtc(date, end, timeZone).toISOString(),
  };
}
