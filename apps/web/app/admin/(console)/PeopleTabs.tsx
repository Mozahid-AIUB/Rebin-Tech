import Link from "next/link";
import type { Route } from "next";

/**
 * One header over the three screens that answer "who is in this system".
 *
 * Accounts, Agents and Operators were three sibling entries in the navigation,
 * which made them look like three unrelated jobs. They are one job seen from
 * three angles: a customer waiting to be let in, a driver who collects, and a
 * colleague who runs the console. An operator arriving with "sort out this
 * person" should land in one place and pick, rather than remember which of
 * three screens holds which kind of person.
 *
 * Tabs rather than a merged table: the three read different tables with
 * different columns and different actions, and forcing them into one grid
 * would mean a row where most cells are empty. What they share is the
 * question, so the question is what the header carries.
 */
const TABS = [
  { href: "/admin/accounts", label: "Waiting to join", hint: "Organizations and businesses" },
  { href: "/admin/agents", label: "Agents", hint: "Who collects" },
  { href: "/admin/operators", label: "Operators", hint: "Who runs the console" },
] as const;

export function PeopleTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <div className="filters" style={{ marginBottom: "1.25rem" }}>
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          // Cast for the same reason AdminNav does: typedRoutes infers the
          // generic from the first member of this `as const` union and then
          // rejects the others, all of which are real routes.
          href={tab.href as Route}
          className="filter"
          aria-current={tab.href === current}
          title={tab.hint}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
