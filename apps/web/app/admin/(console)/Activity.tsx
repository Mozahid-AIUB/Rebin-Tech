import Link from "next/link";
import type { Route } from "next";
import { When, Empty } from "../ui";
import type { StatusTone } from "@/lib/transitions";

/**
 * One thing that happened, from whichever table it happened in.
 *
 * There is no event log to read from: `audit_events` exists and is empty --
 * nothing writes to it, so a feed built on it would be a permanently blank
 * panel. What the console does have is four tables that each carry their own
 * `created_at`, which is the same history seen from four angles. This is the
 * shape they are flattened into.
 */
export type ActivityEvent = {
  kind: "request" | "quote" | "payout" | "account";
  /** Which customer the row is about. */
  title: string;
  /** The status or amount that makes it worth a glance. */
  detail: string;
  at: string;
  /** Where clicking it goes; null when the row has no screen of its own. */
  href: string | null;
  tone: StatusTone;
};

const KIND_LABEL: Record<ActivityEvent["kind"], string> = {
  request: "Pickup",
  quote: "Quote",
  payout: "Payout",
  account: "Account",
};

/**
 * How many events one page shows.
 *
 * Twenty is roughly a screen and a half at this row height: enough that
 * paging feels worth the click, few enough that page two is not empty in a
 * quiet week.
 */
export const PAGE_SIZE = 20;

/**
 * The numbered pager under the feed.
 *
 * Links rather than buttons, so the back button works and a page can be
 * bookmarked or opened in a new tab -- local state would break all three.
 *
 * Long histories collapse in the middle: first, last, and a window around the
 * current page. Without that, a busy year is a hundred numbers wrapping over
 * four lines.
 */
function Pager({ page, pages }: { page: number; pages: number }) {
  if (pages <= 1) return null;

  const shownPages = new Set<number>([1, pages, page - 1, page, page + 1]);
  // Near the ends there is no page 0 or page n+1 to spend, so the window
  // leans inward rather than rendering a shorter row.
  if (page <= 3) [2, 3, 4].forEach((n) => shownPages.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => shownPages.add(n));

  const shown = [...shownPages].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  // Page one is the bare URL: an operator who pages back to the start should
  // land on the address they started from, not on /admin?p=1.
  const to = (n: number) => (n === 1 ? "/admin" : `/admin?p=${n}`) as Route;

  return (
    <nav className="pager" aria-label="Activity pages">
      {page > 1 ? (
        <Link className="pager-step" href={to(page - 1)} rel="prev" aria-label="Previous page">
          ←
        </Link>
      ) : (
        <span className="pager-step is-off" aria-hidden="true">←</span>
      )}

      {shown.map((n, i) => (
        <span key={n} className="pager-cell">
          {/* A break in the run means pages were collapsed away. */}
          {i > 0 && n - shown[i - 1]! > 1 ? <span className="pager-gap">…</span> : null}
          {n === page ? (
            <span className="pager-num is-here" aria-current="page">{n}</span>
          ) : (
            <Link className="pager-num" href={to(n)}>{n}</Link>
          )}
        </span>
      ))}

      {page < pages ? (
        <Link className="pager-step" href={to(page + 1)} rel="next" aria-label="Next page">
          →
        </Link>
      ) : (
        <span className="pager-step is-off" aria-hidden="true">→</span>
      )}
    </nav>
  );
}

/**
 * Everything that has happened, newest first.
 *
 * Deliberately mixed rather than split by type. An operator opening the
 * console wants to know what moved since they last looked; whether that was a
 * quote or a pickup is a property of the row, not a reason to look somewhere
 * else. Every line names its own type, so the mix stays readable.
 */
export function Activity({
  events,
  page,
  total,
}: {
  events: ActivityEvent[];
  page: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="admin-head">
        <h2 className="admin-h1">Activity</h2>
        <span className="admin-count">
          {total.toLocaleString("en-US")} {total === 1 ? "event" : "events"}
        </span>
      </div>

      <div className="table-wrap">
        {events.length === 0 ? (
          <Empty
            title="Nothing yet"
            hint="Pickups, quotes, payouts and new accounts appear here as they happen."
          />
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>What</th>
                <th>Who</th>
                <th>Detail</th>
                <th>When</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => (
                <tr key={`${event.kind}-${event.at}-${i}`}>
                  <td>
                    <span className="kind" data-kind={event.kind}>
                      {KIND_LABEL[event.kind]}
                    </span>
                  </td>
                  <td className="cell-name">{event.title}</td>
                  <td>
                    <span className="status" data-tone={event.tone}>
                      {event.detail}
                    </span>
                  </td>
                  <td>
                    <When value={event.at} />
                  </td>
                  <td className="cell-actions">
                    {event.href ? (
                      <Link href={event.href as Route} className="btn btn-ghost btn-sm">
                        Open
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pager page={page} pages={pages} />
    </>
  );
}
