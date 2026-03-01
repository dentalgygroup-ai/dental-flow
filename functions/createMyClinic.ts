import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Must be authenticated (any role)
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If user already has a clinic, don't allow creating another
    if (user.clinic_id) {
      return Response.json({ error: 'User already belongs to a clinic' }, { status: 400 });
    }

    const { clinic_name } = await req.json();
    if (!clinic_name || !clinic_name.trim()) {
      return Response.json({ error: 'clinic_name is required' }, { status: 400 });
    }

    // Create the clinic
    const clinic = await base44.asServiceRole.entities.Clinic.create({
      name: clinic_name.trim(),
      owner_email: user.email,
      max_users: 4,
      subscription_status: 'none',
    });

    // Link the user to the clinic and make them admin
    await base44.asServiceRole.entities.User.update(user.id, {
      clinic_id: clinic.id,
      clinic_name: clinic.name,
      is_clinic_owner: true,
      role: 'admin',
    });

    return Response.json({ success: true, clinic });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});