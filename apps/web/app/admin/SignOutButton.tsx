"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "./actions";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="admin-signout"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await signOut();
          // `replace`, not `push`: the console should not be sitting one Back
          // press behind a signed-out operator.
          router.replace("/admin/login");
        })
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
