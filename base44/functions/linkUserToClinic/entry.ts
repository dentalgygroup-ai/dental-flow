import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { target_user_id, clinic_id, clinic_name } = await req.json();

    if (!target_user_id || !clinic_id || !clinic_name) {
      return Response.json({ error: 'Missing params' }, { status: 400 });
    }

    // Platform admin can link anyone; clinic owner can only link to their own clinic
    const isPlatformAdmin = user.role === 'admin';
    const isClinicOwner = user.is_clinic_owner && user.clinic_id === clinic_id;

    if (!isPlatformAdmin && !isClinicOwner) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
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