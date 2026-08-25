import { createClient } from "jsr:@supabase/supabase-js@2";

// Delete the caller's own account, in one call.
//
// delete_own_account() runs first, as the caller -- so its own guards (no
// platform staff, no owner with other active members) apply before anything
// irreversible happens. Only on success does this reach for the
// service-role key, and only to do the one thing this system genuinely
// needs it for: auth.admin.deleteUser() has no RLS-respecting equivalent,
// the same reason create-operator holds this key to call
// auth.admin.createUser().
//
// The RPC runs before the auth deletion, not after: if it were the other
// way around, a caller who fails the RPC's guards would already be logged
// out with no session left to retry from, having gained nothing.
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  // The caller, as themselves. Their token, the anon key, RLS applying --
  // which is what makes delete_own_account()'s own checks mean anything.
  const caller = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: userError,
  } = await caller.auth.getUser();
  if (userError || !user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { error: rpcError } = await caller.rpc("delete_own_account");
  if (rpcError) {
    // Whatever delete_own_account() raised -- "Remove your platform access
    // first" or "Transfer ownership..." -- reaches the app verbatim. The
    // auth user is never touched when this branch runs.
    return Response.json({ error: rpcError.message }, { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    // The profile is already archived and the RPC's audit event already
    // written. A failure here leaves someone who can no longer do anything
    // meaningful (their profile reads "Deleted user") but can still log in
    // -- worth surfacing as a real error rather than swallowing, since it
    // means Apple's specific requirement (removing the credential) did not
    // complete, even though the rest of the account was cleared.
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
});
