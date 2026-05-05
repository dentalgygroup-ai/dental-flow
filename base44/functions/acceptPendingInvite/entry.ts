import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sr = base44.asServiceRole;

    // Find pending invite for this user's email
    const invites = await sr.entities.PendingInvite.filter({ email: user.email });
    if (!invites || invites.length === 0) {
      return Response.json({ found: false });
    }

    const invite = invites[0];

    // Link the user to the clinic
    await sr.entities.User.update(user.id, {
      clinic_id: invite.clinic_id,
      clinic_name: invite.clinic_name,
      is_clinic_owner: false,
    });

    // Delete the pending invite(s) for this email
    await Promise.all(invites.map(i => sr.entities.PendingInvite.delete(i.id)));

    return Response.json({ found: true, clinic_id: invite.clinic_id, clinic_name: invite.clinic_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});