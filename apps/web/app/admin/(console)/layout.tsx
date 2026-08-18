import { redirect } from "next/navigation";
import Link from "next/link";
import { getStaffUser } from "@/lib/supabase/server";
import { AdminNav } from "../AdminNav";
import { SignOutButton } from "../SignOutButton";

/**
 * The gate.
 *
 * Every page under `/admin` renders inside this layout, so a visitor who is
 * not platform staff is redirected before any admin markup is produced --
 * they never receive the HTML, not merely a hidden version of it.
 *
 * This is access control, not the security boundary. Even if it were removed
 * entirely, every mutation in this panel calls a `security definer` RPC that
 * checks `is_platform_staff()` on its own and raises 42501 for anyone else.
 * The database is what makes an unauthorised write impossible; this is what
 * makes an unauthorised visitor's experience comprehensible.
 *
 * The navigation is a left rail rather than a top bar. Sections here are a
 * fixed, short list that an operator moves between all day, and a rail keeps
 * them in the same place at the same size while the tables beside them get
 * the full width of the screen for columns.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getStaffUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="admin">
      <aside className="admin-rail">
        <Link href="/admin" className="admin-mark">
          <span className="admin-mark-node" aria-hidden="true" />
          <span className="admin-mark-text">
            Rebin<em>Console</em>
          </span>
        </Link>

        <AdminNav />

        <div className="admin-who">
          <span className="admin-who-name">{user.name}</span>
          <span className="admin-who-role">{user.role.replace("platform_", "")}</span>
          <SignOutButton />
        </div>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}
