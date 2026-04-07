import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { PIPELINE_STATES } from '../components/crm/constants';

/**
 * Centralizes handleSavePatient and handleAddAction logic shared across
 * Pipeline, Patients, Dashboard and Calendar pages.
 *
 * @param {object}   currentUser      - Authenticated user object
 * @param {Function} refetchPatients  - Function to refetch the patients list
 * @param {string}   selectedPatientId - ID of the currently selected patient (for invalidation)
 * @param {Function} [onClose]        - Optional callback called after saving (e.g. close drawer)
 */
export function usePatientMutations({ currentUser, refetchPatients, selectedPatientId, onClose }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSavePatient = async (oldPatient, updatedPatient) => {
    let finalData = { ...updatedPatient };
    const logPromises = [];

    // ── AUTOMATISMO: aceptación de presupuesto ──
    // Cuando se guarda importe_aceptado > 0 con status presupuesto_entregado
    const isAccepting = (
      oldPatient.status === 'presupuesto_entregado' &&
      updatedPatient.importe_aceptado > 0 &&
      updatedPatient.importe_aceptado !== oldPatient.importe_aceptado
    );

    if (isAccepting) {
      const totalCobrado = updatedPatient.total_cobrado || 0;
      const importeAceptado = updatedPatient.importe_aceptado;
      let newStatus;
      if (totalCobrado <= 0) {
        newStatus = 'aceptado_pendiente_pago';
      } else if (totalCobrado < importeAceptado) {
        newStatus = 'pagado_parcialmente';
      } else {
        newStatus = 'pagado';
      }
      const saldoPendiente = Math.max(0, importeAceptado - totalCobrado);
      finalData = { ...finalData, status: newStatus, saldo_pendiente: saldoPendiente };

      logPromises.push(base44.entities.PatientAction.create({
        patient_id: updatedPatient.id,
        action_type: 'cambio_estado',
        description: `Presupuesto aceptado · ${importeAceptado}€ pendientes`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        old_value: oldPatient.status,
        new_value: newStatus
      }));
    }

    await base44.entities.Patient.update(finalData.id, {
      ...finalData,
      last_action_date: new Date().toISOString()
    });

    if (!isAccepting && oldPatient.status !== finalData.status) {
      logPromises.push(base44.entities.PatientAction.create({
        patient_id: finalData.id,
        action_type: 'cambio_estado',
        description: `Estado cambiado de ${PIPELINE_STATES.find(s => s.id === oldPatient.status)?.label || oldPatient.status} a ${PIPELINE_STATES.find(s => s.id === finalData.status)?.label || finalData.status}`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        old_value: oldPatient.status,
        new_value: finalData.status
      }));
    }

    if (oldPatient.budget_amount !== finalData.budget_amount) {
      logPromises.push(base44.entities.PatientAction.create({
        patient_id: finalData.id,
        action_type: 'cambio_presupuesto',
        description: `Presupuesto actualizado`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        old_value: String(oldPatient.budget_amount || 0),
        new_value: String(finalData.budget_amount || 0)
      }));
    }

    if (logPromises.length > 0) await Promise.all(logPromises);

    queryClient.invalidateQueries({ queryKey: ['patientActions', finalData.id] });
    refetchPatients();

    toast({ title: 'Cambios guardados', duration: 2000 });

    onClose?.();
  };

  const handleAddAction = async (action) => {
    await base44.entities.PatientAction.create({
      ...action,
      performed_by: currentUser?.email,
      performed_by_name: currentUser?.full_name
    });

    if (action.patient_id) {
      await base44.entities.Patient.update(action.patient_id, {
        last_action_date: new Date().toISOString()
      });
    }

    queryClient.invalidateQueries({ queryKey: ['patientActions', action.patient_id] });
    refetchPatients();
  };

  return { handleSavePatient, handleAddAction };
}