import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const patientId = body?.data?.patient_id;
    if (!patientId) {
      return Response.json({ error: 'No patient_id in payload' }, { status: 400 });
    }

    // Fetch all payments for this patient
    const payments = await base44.asServiceRole.entities.Payment.filter({ patient_id: patientId });
    const totalCobrado = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Fetch the patient to get importe_aceptado
    const patients = await base44.asServiceRole.entities.Patient.filter({ id: patientId });
    const patient = patients[0];
    if (!patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    const importeAceptado = patient.importe_aceptado ?? 0;
    const saldoPendiente = importeAceptado - totalCobrado;

    await base44.asServiceRole.entities.Patient.update(patientId, {
      total_cobrado: totalCobrado,
      saldo_pendiente: saldoPendiente
    });

    return Response.json({ ok: true, total_cobrado: totalCobrado, saldo_pendiente: saldoPendiente });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});