"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The rail's sections.
 *
 * Each carries a glyph drawn from the same vocabulary as the rest of the
 * console: a via for the overview, a route for the queue, a contact pad for
 * accounts. They are marks rather than pictograms -- at 16px an icon that
 * tries to depict "organization" reads as noise, while a shape that matches
 * the board motif reads as part of the instrument.
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
    href: "/admin/accounts",
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
      {LINKS.map((link) => {
        // Overview owns only its exact path; the others own their subtrees, so
        // a request detail page keeps "Requests" marked as the current section.
        const current =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);

        return (
          <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
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
        );
      })}
    </nav>
  );
}
