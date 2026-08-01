import { createClient } from "jsr:@supabase/supabase-js@2";

// Mirrors signup-organization: create the auth user, then do every row insert
// in one RPC so a failure can't leave an orphaned user behind.
Deno.serve(async (req) => {
  const body = await req.json();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: body.workEmail,
    password: body.password,
    email_confirm: false,
  });
  if (authError || !created.user) {
    return Response.json({ error: authError?.message ?? "User creation failed" }, { status: 400 });
  }
  const userId = created.user.id;

  const { data: businessRow, error: rpcError } = await admin.rpc("create_business_with_owner", {
    p_user_id: userId,
    p_full_name: body.contactName,
    p_phone: body.phone,
    p_business_name: body.businessName,
    p_business_type: body.businessType,
    p_ein: body.ein ?? "",
    p_street: body.street,
    p_city: body.city,
    p_state: body.state,
    p_zip: body.zip,
  });

  if (rpcError) {
    await admin.auth.admin.deleteUser(userId); // no orphaned auth users
    return Response.json({ error: rpcError.message }, { status: 400 });
  }

  return Response.json({ userId, businessId: businessRow });
});
