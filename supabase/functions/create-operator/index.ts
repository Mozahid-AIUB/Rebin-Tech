import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Create an operator account and grant it the console, in one call.
//
// Every other signup function here is a public front door: anyone may call it,
// and what they get is an unprivileged tenant. This one hands out platform
// access, so it cannot be. The caller's own JWT is checked against
// is_platform_staff() before the service-role key is touched at all -- an
// operator is issued by an operator, never claimed.
//
// The service-role key lives here rather than in the console for the same
// reason it lives in the other signup functions: creating an auth user is the
// one thing this system genuinely needs it for, and an edge function is where
// a key that bypasses RLS can sit without ever reaching a browser.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "Not signed in" }, { status: 401, headers: corsHeaders });
  }

  // The caller, as themselves. Their token, the anon key, RLS applying --
  // which is what makes the staff check below mean anything.
  const caller = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: isStaff, error: staffError } = await caller.rpc("is_platform_staff");
  if (staffError) {
    return Response.json({ error: staffError.message }, { status: 500, headers: corsHeaders });
  }
  if (isStaff !== true) {
    return Response.json(
      { error: "Only an existing operator can add another operator" },
      { status: 403, headers: corsHeaders },
    );
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";

  if (!email || !password) {
    return Response.json(
      { error: "An email and a password are required" },
      { status: 400, headers: corsHeaders },
    );
  }
  // Matches what the mobile signup schema asks of everyone else. A shorter
  // password on the account that can move money would be the wrong place to
  // be lenient.
  if (password.length < 10) {
    return Response.json(
      { error: "The password must be at least 10 characters" },
      { status: 400, headers: corsHeaders },
    );
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Confirmed at creation, like every other signup here: GoTrue refuses a
  // login while email_confirmed_at is null and there is no verification
  // screen in this product. Access is gated on the role grant below, not on
  // whether an inbox was reached.
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !created.user) {
    const message = authError?.message ?? "Could not create the account";
    // A duplicate is the common mistake and deserves the instruction, not the
    // raw GoTrue string.
    const duplicate = /already (been )?registered|already exists/i.test(message);
    return Response.json(
      {
        error: duplicate
          ? "An account with that email already exists. Grant it access from the Operators screen instead."
          : message,
      },
      { status: 400, headers: corsHeaders },
    );
  }

  // The grant runs as the caller, not as service-role, so grant_operator's own
  // is_platform_staff() check applies and the audit event records who did it.
  const { error: grantError } = await caller.rpc("grant_operator", { p_email: email });

  if (grantError) {
    // The account exists but has no access, which is a half-finished state an
    // operator cannot see or fix. Remove it and report the real failure.
    await admin.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: grantError.message }, { status: 400, headers: corsHeaders });
  }

  if (fullName) {
    await admin.from("profiles").update({ full_name: fullName }).eq("id", created.user.id);
  }

  return Response.json({ userId: created.user.id, email }, { headers: corsHeaders });
});
