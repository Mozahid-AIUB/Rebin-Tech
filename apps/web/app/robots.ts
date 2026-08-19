import type { MetadataRoute } from "next";

/**
 * Keep the console out of search results.
 *
 * This is not a security control -- the gate is the staff check in
 * `app/admin/(console)/layout.tsx`, and a crawler that ignores this file gets
 * a redirect to the login screen like everyone else. What it prevents is the
 * console turning up in a search for the company's name, which invites the
 * curious to a door they would otherwise never have found.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/"],
    },
  };
}
