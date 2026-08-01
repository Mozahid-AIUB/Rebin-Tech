import { createClient } from "jsr:@supabase/supabase-js@2";

// Mirrors signup-organization / signup-business. An agent creates no tenant,
// so the RPC returns the user's own id rather than an entity id.
Deno.serve(async (req) => {
  const body = await req.json();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: false,
  });
  if (authError || !created.user) {
    return Response.json({ error: authError?.message ?? "User creation failed" }, { status: 400 });
  }
  const userId = created.user.id;

  const { error: rpcError } = await admin.rpc("create_field_agent", {
    p_user_id: userId,
    p_full_name: body.fullName,
    p_phone: body.phone,
    p_service_city: body.serviceCity,
    p_service_state: body.serviceState,
    p_service_zip: body.serviceZip,
    p_vehicle: body.vehicle,
    p_has_drivers_license: body.hasDriversLicense,
  });

  if (rpcError) {
    await admin.auth.admin.deleteUser(userId); // no orphaned auth users
    return Response.json({ error: rpcError.message }, { status: 400 });
  }

  return Response.json({ userId });
});
