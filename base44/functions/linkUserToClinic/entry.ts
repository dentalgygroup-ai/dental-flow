import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { target_user_id, clinic_id, clinic_name } = await req.json();

    if (!target_user_id || !clinic_id || !clinic_name) {
      return Response.json({ error: 'Missing params' }, { status: 400 });
    }

    // Use service role to update another user's data
    await base44.asServiceRole.entities.User.update(target_user_id, {
      clinic_id,
      clinic_name,
      is_clinic_owner: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});