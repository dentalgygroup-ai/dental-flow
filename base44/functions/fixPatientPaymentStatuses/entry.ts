import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all patients that are in payment-related states
  const patients = await base44.asServiceRole.entities.Patient.filter({});
  const paymentStates = ['aceptado_pendiente_pago', 'pagado_parcialmente', 'pagado'];
  const candidates = patients.filter(p => paymentStates.includes(p.status));

  let fixed = 0;
  const details = [];

  for (const patient of candidates) {
    // Get all payments for this patient
    const payments = await base44.asServiceRole.entities.Payment.filter({ patient_id: patient.id });
    const totalCobrado = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const importeAceptado = patient.importe_aceptado ?? 0;
    const saldoPendiente = Math.max(0, importeAceptado - totalCobrado);

    let correctStatus;
    if (totalCobrado <= 0) {
      correctStatus = 'aceptado_pendiente_pago';
    } else if (saldoPendiente <= 0) {
      correctStatus = 'pagado';
    } else {
      correctStatus = 'pagado_parcialmente';
    }

    const needsUpdate =
      patient.status !== correctStatus ||
      Math.abs((patient.total_cobrado ?? 0) - totalCobrado) > 0.01 ||
      Math.abs((patient.saldo_pendiente ?? 0) - saldoPendiente) > 0.01;

    if (needsUpdate) {
      await base44.asServiceRole.entities.Patient.update(patient.id, {
        total_cobrado: totalCobrado,
        saldo_pendiente: saldoPendiente,
        status: correctStatus,
      });
      fixed++;
      details.push({
        name: `${patient.first_name} ${patient.last_name}`,
        oldStatus: patient.status,
        newStatus: correctStatus,
        totalCobrado,
        saldoPendiente,
      });
    }
  }

  return Response.json({ fixed, total: candidates.length, details });
});