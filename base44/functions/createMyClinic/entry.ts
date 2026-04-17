import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Master SystemConfig template (based on clinic 69a345beb72532b308e26959)
const DEFAULT_MAX_USERS = parseInt(Deno.env.get('DEFAULT_MAX_USERS') || '4');

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
    trialEndDate.setDate(trialEndDate.getDate() + 15);

    const clinic = await base44.asServiceRole.entities.Clinic.create({
      name: clinic_name.trim(),
      owner_email: user.email,
      max_users: DEFAULT_MAX_USERS,
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

    // ── SEED DEMO DATA ──
    const now = new Date();
    const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString();
    const daysFromNow = (n) => new Date(now.getTime() + n * 86400000).toISOString();

    // Responsables
    const [laura, javier] = await Promise.all([
      base44.asServiceRole.entities.Responsible.create({
        clinic_id: clinic.id, name: 'Laura Martínez',
        email: 'laura@clinicademo.es', phone: '612345678', is_active: true
      }),
      base44.asServiceRole.entities.Responsible.create({
        clinic_id: clinic.id, name: 'Javier Sánchez',
        email: 'javier@clinicademo.es', phone: '623456789', is_active: true
      }),
    ]);

    // Doctores
    await Promise.all([
      base44.asServiceRole.entities.Doctor.create({
        clinic_id: clinic.id, name: 'Dra. Ana Romero',
        specialties: ['Ortodoncia', 'Implantes'], is_active: true
      }),
      base44.asServiceRole.entities.Doctor.create({
        clinic_id: clinic.id, name: 'Dr. Carlos Vega',
        specialties: ['Estética', 'endodoncia'], is_active: true
      }),
    ]);

    // Pacientes
    const patientsData = [
      {
        first_name: 'María', last_name: 'García López', phone: '611000001',
        status: 'presupuesto_entregado', budget_amount: 2400, treatments: ['Ortodoncia'],
        source: 'web', assigned_to: laura.id, assigned_to_name: laura.name,
        patient_type: 'primera_visita', is_demo: true,
        follow_up_date: daysFromNow(2),
      },
      {
        first_name: 'Carlos', last_name: 'Ruiz Moreno', phone: '611000002',
        status: 'aceptado_pendiente_pago', budget_amount: 1800, treatments: ['Implantes'],
        source: 'referido', assigned_to: javier.id, assigned_to_name: javier.name,
        patient_type: 'primera_visita', is_demo: true,
        importe_aceptado: 1800, total_cobrado: 0, saldo_pendiente: 1800,
      },
      {
        first_name: 'Ana', last_name: 'Fernández Díaz', phone: '611000003',
        status: 'pagado_parcialmente', budget_amount: 3200, treatments: ['Implantes'],
        source: 'campana', assigned_to: laura.id, assigned_to_name: laura.name,
        patient_type: 'primera_visita', is_demo: true,
        importe_aceptado: 3200, total_cobrado: 1600, saldo_pendiente: 1600,
      },
      {
        first_name: 'Pedro', last_name: 'Sánchez Gil', phone: '611000004',
        status: 'en_tratamiento', budget_amount: 950, treatments: ['Estética'],
        source: 'walk_in', assigned_to: javier.id, assigned_to_name: javier.name,
        patient_type: 'primera_visita', is_demo: true,
        importe_aceptado: 950, total_cobrado: 950, saldo_pendiente: 0,
      },
      {
        first_name: 'Lucía', last_name: 'Torres Vega', phone: '611000005',
        status: 'contactado', budget_amount: 0, treatments: [],
        source: 'redes_sociales', assigned_to: laura.id, assigned_to_name: laura.name,
        patient_type: 'primera_visita', is_demo: true,
      },
      {
        first_name: 'Roberto', last_name: 'Molina Paz', phone: '611000006',
        status: 'presupuesto_entregado', budget_amount: 1200, treatments: ['General', 'endodoncia'],
        source: 'web', assigned_to: javier.id, assigned_to_name: javier.name,
        patient_type: 'primera_visita', is_demo: true,
        follow_up_date: daysFromNow(5),
      },
      {
        first_name: 'Elena', last_name: 'Jiménez Ramos', phone: '611000007',
        status: 'rechazado', budget_amount: 4500, treatments: ['Ortodoncia'],
        source: 'web', assigned_to: laura.id, assigned_to_name: laura.name,
        patient_type: 'primera_visita', is_demo: true,
        rejection_reason: 'precio',
      },
      {
        first_name: 'Miguel', last_name: 'Herrera León', phone: '611000008',
        status: 'nuevo_paciente', budget_amount: 0, treatments: [],
        source: 'referido', assigned_to: javier.id, assigned_to_name: javier.name,
        patient_type: 'primera_visita', is_demo: true,
      },
    ];

    const createdPatients = await Promise.all(
      patientsData.map(p => base44.asServiceRole.entities.Patient.create({
        ...p, clinic_id: clinic.id, last_action_date: daysAgo(1)
      }))
    );

    const [pMaria, pCarlos, pAna] = createdPatients;

    // Payment para Ana Fernández
    await base44.asServiceRole.entities.Payment.create({
      patient_id: pAna.id,
      patient_name: 'Ana Fernández Díaz',
      clinic_id: clinic.id,
      amount: 1600,
      payment_date: daysAgo(10),
      payment_method: 'transferencia',
      performed_by: user.email,
      performed_by_name: user.full_name || user.email,
    });

    // Tareas demo
    await Promise.all([
      base44.asServiceRole.entities.Task.create({
        clinic_id: clinic.id,
        title: 'Llamar a María García López',
        task_type: 'llamada', status: 'pendiente', priority: 'alta',
        patient_id: pMaria.id, patient_name: 'María García López',
        assigned_to: laura.id, assigned_to_name: laura.name,
        due_date: daysFromNow(1),
        notes: 'Lleva 5 días sin respuesta al presupuesto',
      }),
      base44.asServiceRole.entities.Task.create({
        clinic_id: clinic.id,
        title: 'WhatsApp a Carlos Ruiz Moreno',
        task_type: 'whatsapp', status: 'pendiente', priority: 'alta',
        patient_id: pCarlos.id, patient_name: 'Carlos Ruiz Moreno',
        assigned_to: javier.id, assigned_to_name: javier.name,
        due_date: daysFromNow(0),
        notes: 'Confirmar forma de pago del implante',
      }),
      base44.asServiceRole.entities.Task.create({
        clinic_id: clinic.id,
        title: 'Seguimiento a Lucía Torres Vega',
        task_type: 'seguimiento', status: 'pendiente', priority: 'media',
        patient_id: createdPatients[4].id, patient_name: 'Lucía Torres Vega',
        assigned_to: laura.id, assigned_to_name: laura.name,
        due_date: daysFromNow(3),
        notes: 'Primer contacto por Instagram, interesada en ortodoncia',
      }),
    ]);

    return Response.json({ success: true, clinic });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});