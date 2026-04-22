import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Admin-only migration: assigns clinic_id to orphan records.
 * Pass ?entity=patients|actions|payments|tasks|responsibles|doctors|config to run per entity.
 * Default runs all but with a delay between updates to avoid rate limit.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    let entity = 'patients';
    try {
      const body = await req.json();
      if (body && body.entity) entity = body.entity;
    } catch (_) { /* no body, use default */ }

    const sr = base44.asServiceRole;

    // Build lookup maps (always needed)
    const allClinics = await sr.entities.Clinic.list(undefined, 200, 0);
    const clinicByOwnerEmail = {};
    allClinics.forEach(c => { clinicByOwnerEmail[c.owner_email] = c.id; });

    const allUsers = await sr.entities.User.list(undefined, 500, 0);
    const clinicIdByEmail = {};
    allUsers.forEach(u => { if (u.email && u.clinic_id) clinicIdByEmail[u.email] = u.clinic_id; });

    const resolveClinicId = (createdBy, altEmail) => {
      const emails = [createdBy, altEmail].filter(Boolean);
      for (const e of emails) {
        const found = clinicIdByEmail[e] || clinicByOwnerEmail[e];
        if (found) return found;
      }
      return null;
    };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const BATCH_SIZE = 30;
    const fixEntity = async (entityObj, items, resolverFn) => {
      const orphans = items.filter(i => !i.clinic_id);
      let fixed = 0, skipped = 0;
      const toFix = orphans.slice(0, BATCH_SIZE); // process max 30 per call
      for (const item of toFix) {
        const cid = resolverFn(item);
        if (cid) {
          await entityObj.update(item.id, { clinic_id: cid });
          fixed++;
          await sleep(200); // avoid rate limit
        } else {
          skipped++;
        }
      }
      return { total: items.length, orphans: orphans.length, fixed, skipped, remaining: orphans.length - toFix.length };
    };

    if (entity === 'patients') {
      const all = await sr.entities.Patient.list(undefined, 500, 0);
      const result = await fixEntity(
        sr.entities.Patient, all,
        p => resolveClinicId(p.created_by)
      );
      return Response.json({ success: true, entity: 'patients', result });
    }

    if (entity === 'actions') {
      // Need patient->clinic map
      const patients = await sr.entities.Patient.list(undefined, 500, 0);
      const clinicByPatientId = {};
      patients.forEach(p => { if (p.clinic_id) clinicByPatientId[p.id] = p.clinic_id; });

      const all = await sr.entities.PatientAction.list(undefined, 500, 0);
      const result = await fixEntity(
        sr.entities.PatientAction, all,
        a => clinicByPatientId[a.patient_id] || resolveClinicId(a.performed_by, a.created_by)
      );
      return Response.json({ success: true, entity: 'actions', result });
    }

    if (entity === 'payments') {
      const patients = await sr.entities.Patient.list(undefined, 500, 0);
      const clinicByPatientId = {};
      patients.forEach(p => { if (p.clinic_id) clinicByPatientId[p.id] = p.clinic_id; });

      const all = await sr.entities.Payment.list(undefined, 500, 0);
      const result = await fixEntity(
        sr.entities.Payment, all,
        p => clinicByPatientId[p.patient_id] || resolveClinicId(p.performed_by, p.created_by)
      );
      return Response.json({ success: true, entity: 'payments', result });
    }

    if (entity === 'tasks') {
      const patients = await sr.entities.Patient.list(undefined, 500, 0);
      const clinicByPatientId = {};
      patients.forEach(p => { if (p.clinic_id) clinicByPatientId[p.id] = p.clinic_id; });

      const all = await sr.entities.Task.list(undefined, 500, 0);
      const result = await fixEntity(
        sr.entities.Task, all,
        t => clinicByPatientId[t.patient_id] || resolveClinicId(t.created_by)
      );
      return Response.json({ success: true, entity: 'tasks', result });
    }

    if (entity === 'responsibles') {
      const all = await sr.entities.Responsible.list(undefined, 500, 0);
      const result = await fixEntity(
        sr.entities.Responsible, all,
        r => resolveClinicId(r.created_by)
      );
      return Response.json({ success: true, entity: 'responsibles', result });
    }

    if (entity === 'doctors') {
      const all = await sr.entities.Doctor.list(undefined, 500, 0);
      const result = await fixEntity(
        sr.entities.Doctor, all,
        d => resolveClinicId(d.created_by)
      );
      return Response.json({ success: true, entity: 'doctors', result });
    }

    if (entity === 'config') {
      const allSC = await sr.entities.SystemConfig.list(undefined, 500, 0);
      const resultSC = await fixEntity(
        sr.entities.SystemConfig, allSC,
        c => resolveClinicId(c.created_by)
      );
      const allAC = await sr.entities.AppConfig.list(undefined, 200, 0);
      const resultAC = await fixEntity(
        sr.entities.AppConfig, allAC,
        c => resolveClinicId(c.created_by)
      );
      return Response.json({ success: true, entity: 'config', systemConfig: resultSC, appConfig: resultAC });
    }

    return Response.json({ error: 'Unknown entity. Use: patients|actions|payments|tasks|responsibles|doctors|config' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});