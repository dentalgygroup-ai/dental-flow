import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Master SystemConfig template (based on clinic 69a345beb72532b308e26959)
const MASTER_SYSTEM_CONFIG = [
  // Products / Services (generic CRM)
  { config_type: 'treatment', value: 'producto_a',   label: 'Producto A',      is_active: true, order: 0 },
  { config_type: 'treatment', value: 'producto_b',   label: 'Producto B',      is_active: true, order: 1 },
  { config_type: 'treatment', value: 'servicio_a',   label: 'Servicio A',      is_active: true, order: 2 },
  { config_type: 'treatment', value: 'servicio_b',   label: 'Servicio B',      is_active: true, order: 3 },
  { config_type: 'treatment', value: 'consultoría',  label: 'Consultoría',     is_active: true, order: 4 },
  // Rejection / loss reasons (generic CRM)
  { config_type: 'rejection_reason', value: 'precio',           label: 'Precio',               is_active: true, order: 0 },
  { config_type: 'rejection_reason', value: 'presupuesto',      label: 'Sin presupuesto',       is_active: true, order: 1 },
  { config_type: 'rejection_reason', value: 'competencia',      label: 'Se fue a la competencia',is_active: true, order: 2 },
  { config_type: 'rejection_reason', value: 'no_necesidad',     label: 'No tiene necesidad',    is_active: true, order: 3 },
  { config_type: 'rejection_reason', value: 'timing',           label: 'Mal momento',           is_active: true, order: 4 },
  { config_type: 'rejection_reason', value: 'sin_respuesta',    label: 'Sin respuesta',         is_active: true, order: 5 },
  { config_type: 'rejection_reason', value: 'otro',             label: 'Otro',                  is_active: true, order: 6 },
  // Acquisition sources (generic CRM)
  { config_type: 'source', value: 'web',            label: 'Web / SEO',         is_active: true, order: 0 },
  { config_type: 'source', value: 'publicidad',     label: 'Publicidad online', is_active: true, order: 1 },
  { config_type: 'source', value: 'redes_sociales', label: 'Redes sociales',    is_active: true, order: 2 },
  { config_type: 'source', value: 'referido',       label: 'Referido',          is_active: true, order: 3 },
  { config_type: 'source', value: 'evento',         label: 'Evento / Feria',    is_active: true, order: 4 },
  { config_type: 'source', value: 'llamada',        label: 'Llamada en frío',   is_active: true, order: 5 },
  { config_type: 'source', value: 'email',          label: 'Email marketing',   is_active: true, order: 6 },
  { config_type: 'source', value: 'otro',           label: 'Otro',              is_active: true, order: 7 },
  // Customer types (generic CRM)
  { config_type: 'patient_type', value: 'nuevo_lead',     label: 'Nuevo lead',           is_active: true, order: 0 },
  { config_type: 'patient_type', value: 'cliente_activo', label: 'Cliente activo',       is_active: true, order: 1 },
  { config_type: 'patient_type', value: 'referencia',     label: 'Referencia',           is_active: true, order: 2 },
  { config_type: 'patient_type', value: 'upsell',         label: 'Ampliación / Upsell',  is_active: true, order: 3 },
  { config_type: 'patient_type', value: 'reactivacion',   label: 'Reactivación',         is_active: true, order: 4 },
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

    // Seed master SystemConfig for the new clinic
    const seedItems = MASTER_SYSTEM_CONFIG.map(item => ({ ...item, clinic_id: clinic.id }));
    await base44.asServiceRole.entities.SystemConfig.bulkCreate(seedItems);

    return Response.json({ success: true, clinic });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});