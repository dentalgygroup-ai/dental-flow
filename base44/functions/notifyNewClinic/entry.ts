import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json();
    const { data: clinic, event } = body;

    // Only act on clinic creation
    if (event?.type !== 'create') {
      return Response.json({ skipped: true });
    }

    if (!clinic) {
      return Response.json({ error: 'No clinic data in payload' }, { status: 400 });
    }

    // Get all platform admins
    const admins = await sr.entities.User.filter({ role: 'admin' });

    if (!admins || admins.length === 0) {
      return Response.json({ message: 'No admins found, no email sent.' });
    }

    const trialEnd = clinic.trial_end_date
      ? new Date(clinic.trial_end_date).toLocaleDateString('es-ES')
      : '—';

    const subject = `🦷 Nueva alta en Dental Flow: ${clinic.name}`;
    const body_html = `
Nueva clínica registrada en Dental Flow.

📋 Datos de la clínica:
- Nombre: ${clinic.name}
- Propietario: ${clinic.owner_email}
- Fin del período de prueba: ${trialEnd}
- Estado: ${clinic.subscription_status}
- Fecha de alta: ${new Date().toLocaleString('es-ES')}

Accede al panel de administración para más detalles.
    `.trim();

    // Send email to each admin
    await Promise.all(
      admins.map(admin =>
        sr.integrations.Core.SendEmail({
          to: admin.email,
          subject,
          body: body_html,
        })
      )
    );

    return Response.json({ success: true, notified: admins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});