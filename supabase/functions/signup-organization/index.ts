import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const body = await req.json();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: body.workEmail,
    password: body.password,
    // Confirmed at creation. GoTrue's password grant refuses a user whose
    // email_confirmed_at is null -- signup returned 200 and then every login
    // failed with "Email not confirmed", with nothing wrong visible in the
    // row. There is no email-verification screen in the app either; access is
    // gated on profiles.status / organizations.status, which start as
    // 'pending_verification' and are cleared by a human.
    email_confirm: true,
  });
  if (authError || !created.user) {
    return Response.json({ error: authError?.message ?? "User creation failed" }, { status: 400 });
  }
  const userId = created.user.id;

  const { data: orgRow, error: rpcError } = await admin.rpc("create_organization_with_owner", {
    p_user_id: userId,
    p_full_name: body.contactName,
    p_phone: body.phone,
    p_org_name: body.orgName,
    p_org_type: body.orgType,
    p_street: body.street,
    p_city: body.city,
    p_state: body.state,
    p_zip: body.zip,
    p_dock_access: body.dockAccess,
  });

  if (rpcError) {
    await admin.auth.admin.deleteUser(userId); // no orphaned auth users
    return Response.json({ error: rpcError.message }, { status: 400 });
  }

  return Response.json({ userId, orgId: orgRow });
});
