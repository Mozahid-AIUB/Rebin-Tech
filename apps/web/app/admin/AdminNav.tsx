"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

/**
 * The rail's sections.
 *
 * Each carries a glyph drawn from the same vocabulary as the rest of the
 * console: a via for the overview, a route for the queue, three linked vias
 * for agents, a contact pad for accounts. They are marks rather than
 * pictograms -- at 16px an icon that tries to depict "organization" (or a
 * person, for an agent) reads as noise, while a shape that matches the board
 * motif reads as part of the instrument.
 */
const LINKS = [
  {
    href: "/admin",
    label: "Overview",
    glyph: (
      <>
        <circle cx="8" cy="8" r="5.25" />
        <circle cx="8" cy="8" r="1.75" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    href: "/admin/requests",
    section: "Organizations",
    label: "Requests",
    glyph: (
      <>
        <path d="M2 4.5h5l2.5 2.5H14" />
        <path d="M2 11.5h5L9.5 9H14" />
        <circle cx="14" cy="7" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="14" cy="9" r="1.4" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    href: "/admin/quotes",
    section: "Sellers",
    label: "Quotes",
    glyph: (
      <>
        <rect x="3" y="2.5" width="10" height="11" rx="1.25" />
        <path d="M5.25 5.75h5.5M5.25 8h5.5M5.25 10.25h3" />
      </>
    ),
  },
  {
    href: "/admin/payouts",
    section: "Sellers",
    label: "Payouts",
    glyph: (
      <>
        <path d="M2.5 5.5h11v6h-11z" />
        <path d="M2.5 8h11" />
        <circle cx="11.5" cy="9.75" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    href: "/admin/prices",
    section: "Setup",
    label: "Prices",
    glyph: (
      <>
        <path d="M8 2v3.2M8 10.8V14" />
        <path d="M4.75 5.2h4.75a1.75 1.75 0 0 1 0 3.5h-3a1.75 1.75 0 0 0 0 3.5h4.75" />
      </>
    ),
  },
  {
    href: "/admin/agents",
    section: "Setup",
    label: "Agents",
    glyph: (
      <>
        <circle cx="4" cy="4.5" r="1.6" />
        <circle cx="12" cy="4.5" r="1.6" />
        <circle cx="8" cy="11.75" r="1.6" />
        <path d="M5.3 5.5 7 10.4M10.7 5.5 9 10.4M5.6 4.5h4.8" />
      </>
    ),
  },
  {
    href: "/admin/operators",
    section: "Setup",
    label: "Operators",
    glyph: (
      <>
        <circle cx="6" cy="6" r="2.4" />
        <path d="M2.5 13c0-2.2 1.6-3.6 3.5-3.6s3.5 1.4 3.5 3.6" />
        <path d="M11.5 5.5v4M9.5 7.5h4" />
      </>
    ),
  },
  {
    href: "/admin/accounts",
    section: "Setup",
    label: "Accounts",
    glyph: (
      <>
        <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
        <path d="M2.5 6.5h11" />
        <path d="M6 10h4" />
      </>
    ),
  },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav">
      {LINKS.map((link, i) => {
        // A heading appears the first time a section is seen. Derived from the
        // array rather than nesting the links inside group objects: the order
        // is the grouping, and a flat list keeps `current` and the keyboard
        // order trivially correct.
        const section = "section" in link ? link.section : undefined;
        const previous = i > 0 ? LINKS[i - 1] : undefined;
        const previousSection =
          previous && "section" in previous ? previous.section : undefined;
        const startsSection = section !== undefined && section !== previousSection;

        // Overview owns only its exact path; the others own their subtrees, so
        // a request detail page keeps "Requests" marked as the current section.
        const current =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);

        return (
          <div key={link.href} className="admin-nav-item">
            {startsSection && <span className="admin-nav-heading">{section}</span>}
          {/* `as Route` because typedRoutes infers Link's generic from the
                first member of this `as const` union and then rejects the
                rest -- every href here is a real route, and the generated
                route table agrees. */}
          <Link href={link.href as Route} aria-current={current ? "page" : undefined}>
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {link.glyph}
            </svg>
            {link.label}
          </Link>
          </div>
        );
      })}
    </nav>
  );
}
