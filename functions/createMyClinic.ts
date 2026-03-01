import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Master SystemConfig template (based on clinic 69a345beb72532b308e26959)
const MASTER_SYSTEM_CONFIG = [
  // Treatments
  { config_type: 'treatment', value: 'Implantes',   label: 'Implantes',   is_active: true, order: 0 },
  { config_type: 'treatment', value: 'Ortodoncia',  label: 'Ortodoncia',  is_active: true, order: 1 },
  { config_type: 'treatment', value: 'Estética',    label: 'Estética',    is_active: true, order: 2 },
  { config_type: 'treatment', value: 'General',     label: 'General',     is_active: true, order: 3 },
  { config_type: 'treatment', value: 'endodoncia',  label: 'Endodoncia',  is_active: true, order: 4 },
  // Rejection reasons
  { config_type: 'rejection_reason', value: 'precio',          label: 'Precio',          is_active: true, order: 0 },
  { config_type: 'rejection_reason', value: 'tiempo',          label: 'Tiempo',          is_active: true, order: 1 },
  { config_type: 'rejection_reason', value: 'competencia',     label: 'Competencia',     is_active: true, order: 2 },
  { config_type: 'rejection_reason', value: 'no_interesado',   label: 'No interesado',   is_active: true, order: 3 },
  { config_type: 'rejection_reason', value: 'sin_financiacion',label: 'Sin financiación',is_active: true, order: 4 },
  { config_type: 'rejection_reason', value: 'otro',            label: 'Otro',            is_active: true, order: 5 },
  // Sources
  { config_type: 'source', value: 'walk_in',       label: 'Walk-in',       is_active: true, order: 0 },
  { config_type: 'source', value: 'web',           label: 'Web',           is_active: true, order: 1 },
  { config_type: 'source', value: 'referido',      label: 'Referido',      is_active: true, order: 2 },
  { config_type: 'source', value: 'campana',       label: 'Campaña',       is_active: true, order: 3 },
  { config_type: 'source', value: 'redes_sociales',label: 'Redes sociales',is_active: true, order: 4 },
  { config_type: 'source', value: 'otro',          label: 'Otro',          is_active: true, order: 5 },
  // Patient types
  { config_type: 'patient_type', value: 'primera_visita', label: 'Primera visita',         is_active: true, order: 0 },
  { config_type: 'patient_type', value: 'old_contact',    label: 'Contacto antiguo',        is_active: true, order: 1 },
  { config_type: 'patient_type', value: 'referencia',     label: 'Referencia',              is_active: true, order: 2 },
  { config_type: 'patient_type', value: 'ampliacion',     label: 'Ampliación de tratamiento',is_active: true, order: 3 },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.clinic_id) {
      return Response.json({ error: 'User already belongs to a clinic' }, { status: 400 });
    }

    const { clinic_name } = await req.json();
    if (!clinic_name || !clinic_name.trim()) {
      return Response.json({ error: 'clinic_name is required' }, { status: 400 });
    }

    // Create the clinic using service role
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    const clinic = await base44.asServiceRole.entities.Clinic.create({
      name: clinic_name.trim(),
      owner_email: user.email,
      max_users: 4,
      subscription_status: 'trialing',
      trial_end_date: trialEndDate.toISOString(),
    });

    // Link the user to the clinic - DO NOT update 'role' field (platform restriction)
    await base44.asServiceRole.entities.User.update(user.id, {
      clinic_id: clinic.id,
      clinic_name: clinic.name,
      is_clinic_owner: true,
    });

    return Response.json({ success: true, clinic });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});