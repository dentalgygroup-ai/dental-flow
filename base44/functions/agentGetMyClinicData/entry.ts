import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clinicId = user.clinic_id;

    if (!clinicId) {
      return Response.json({ error: 'Este usuario no tiene una clínica asignada.' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // Fetch all data filtered strictly by clinic_id
    const [patients, tasks, payments, responsibles, doctors, actions] = await Promise.all([
      sr.entities.Patient.filter({ clinic_id: clinicId }, '-created_date', 200),
      sr.entities.Task.filter({ clinic_id: clinicId }, '-created_date', 100),
      sr.entities.Payment.filter({ clinic_id: clinicId }, '-payment_date', 100),
      sr.entities.Responsible.filter({ clinic_id: clinicId }, 'name', 50),
      sr.entities.Doctor.filter({ clinic_id: clinicId }, 'name', 50),
      sr.entities.PatientAction.filter({ clinic_id: clinicId }, '-created_date', 200),
    ]);

    return Response.json({
      clinic_id: clinicId,
      clinic_name: user.clinic_name || null,
      patients,
      tasks,
      payments,
      responsibles,
      doctors,
      actions,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});