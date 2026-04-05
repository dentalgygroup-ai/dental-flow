import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

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
    await base44.entities.Patient.update(updatedPatient.id, {
      ...updatedPatient,
      last_action_date: new Date().toISOString()
    });

    const logPromises = [];

    if (oldPatient.status !== updatedPatient.status) {
      logPromises.push(base44.entities.PatientAction.create({
        patient_id: updatedPatient.id,
        action_type: 'cambio_estado',
        description: `Estado cambiado de ${oldPatient.status} a ${updatedPatient.status}`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        old_value: oldPatient.status,
        new_value: updatedPatient.status
      }));
    }

    if (oldPatient.budget_amount !== updatedPatient.budget_amount) {
      logPromises.push(base44.entities.PatientAction.create({
        patient_id: updatedPatient.id,
        action_type: 'cambio_presupuesto',
        description: `Presupuesto actualizado`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        old_value: String(oldPatient.budget_amount || 0),
        new_value: String(updatedPatient.budget_amount || 0)
      }));
    }

    if (logPromises.length > 0) await Promise.all(logPromises);

    queryClient.invalidateQueries({ queryKey: ['patientActions', updatedPatient.id] });
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