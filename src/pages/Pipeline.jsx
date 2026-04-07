import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import confetti from 'canvas-confetti';
import { DragDropContext } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import KanbanColumn from '../components/crm/KanbanColumn';
import FilterBar from '../components/crm/FilterBar';
import PatientDrawer from '../components/crm/PatientDrawer';
import NewPatientModal from '../components/crm/NewPatientModal';
import StatusChangeModal from '../components/crm/StatusChangeModal';
import CalendarExport from '../components/crm/CalendarExport';
import { PIPELINE_STATES, STATE_REQUIREMENTS, ALLOWED_TRANSITIONS } from '../components/crm/constants';
import { usePermissions } from '../components/crm/usePermissions';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Pipeline() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [statusChangeModal, setStatusChangeModal] = useState({ isOpen: false, patient: null, targetStatus: null });
  const [filters, setFilters] = useState({
    search: '',
    assigned_to: '',
    doctor_id: '',
    treatments: [],
    source: '',
    priority: '',
    budget_min: '',
    budget_max: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const clinicId = currentUser?.clinic_id;

  const { data: patients = [], refetch: refetchPatients } = useQuery({
    queryKey: ['patients', clinicId],
    queryFn: () => clinicId ? base44.entities.Patient.filter({ clinic_id: clinicId }, '-created_date') : [],
    enabled: !!clinicId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['clinicUsers', clinicId],
    queryFn: () => clinicId ? base44.entities.User.filter({ clinic_id: clinicId }) : [],
    enabled: !!clinicId,
  });

  const { data: responsibles = [] } = useQuery({
    queryKey: ['responsibles', clinicId],
    queryFn: () => clinicId ? base44.entities.Responsible.filter({ clinic_id: clinicId }, 'name') : [],
    enabled: !!clinicId,
  });

  const activeResponsibles = responsibles.filter(r => r.is_active);

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors', clinicId],
    queryFn: () => clinicId ? base44.entities.Doctor.filter({ clinic_id: clinicId }, 'name') : [],
    enabled: !!clinicId,
  });

  const { data: config = [] } = useQuery({
    queryKey: ['appConfig', clinicId],
    queryFn: () => clinicId ? base44.entities.AppConfig.filter({ clinic_id: clinicId }) : [],
    enabled: !!clinicId,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['patientActions', selectedPatient?.id],
    queryFn: () => selectedPatient 
      ? base44.entities.PatientAction.filter({ patient_id: selectedPatient.id }, '-created_date')
      : [],
    enabled: !!selectedPatient
  });

  const { data: patientTasks = [], refetch: refetchPatientTasks } = useQuery({
    queryKey: ['patientTasks', selectedPatient?.id],
    queryFn: () => selectedPatient
      ? base44.entities.Task.filter({ patient_id: selectedPatient.id }, '-created_date')
      : [],
    enabled: !!selectedPatient
  });

  const permissions = usePermissions(currentUser);
  const isMobile = useIsMobile();

  // Parse config
  const configValues = useMemo(() => ({
    days_no_movement: config.find(c => c.config_key === 'days_no_movement')?.config_value || 7,
    days_in_negotiation: config.find(c => c.config_key === 'days_in_negotiation')?.config_value || 14
  }), [config]);

  // Filter patients
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        if (!fullName.includes(search) && 
            !p.phone?.includes(search) && 
            !p.email?.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (filters.assigned_to && p.assigned_to !== filters.assigned_to) return false;
      if (filters.doctor_id && p.doctor_id !== filters.doctor_id) return false;
      if (filters.treatments?.length > 0 && !filters.treatments.some(t => p.treatments?.includes(t))) return false;
      if (filters.source && p.source !== filters.source) return false;
      if (filters.patient_type && p.patient_type !== filters.patient_type) return false;
      if (filters.budget_min && (p.budget_amount || 0) < parseFloat(filters.budget_min)) return false;
      if (filters.budget_max && (p.budget_amount || 0) > parseFloat(filters.budget_max)) return false;
      return true;
    });
  }, [patients, filters]);

  // Group patients by status
  const patientsByStatus = useMemo(() => {
    const grouped = {};
    PIPELINE_STATES.forEach(state => {
      grouped[state.id] = filteredPatients.filter(p => p.status === state.id);
    });
    return grouped;
  }, [filteredPatients]);

  // Check if a transition requires additional data
  const transitionNeedsData = (patient, newStatus) => {
    const requirements = STATE_REQUIREMENTS[newStatus];
    if (!requirements) return false;
    // Only apply if coming from one of the defined fromStates
    if (requirements.fromStates && !requirements.fromStates.includes(patient.status)) return false;
    return requirements.fields && requirements.fields.length > 0;
  };

  // Handle drag end
  const handleDragEnd = async (result) => {
    if (!result.destination || !permissions.canMove) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const patient = patients.find(p => p.id === draggableId);

    if (!patient || patient.status === newStatus) return;

    // Validate transition is allowed
    const allowed = ALLOWED_TRANSITIONS[patient.status] || [];
    if (!allowed.includes(newStatus)) {
      toast({
        title: "Transición no permitida",
        description: `No se puede mover directamente de "${PIPELINE_STATES.find(s => s.id === patient.status)?.label}" a "${PIPELINE_STATES.find(s => s.id === newStatus)?.label}"`,
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    // Check if transition requires extra data
    if (transitionNeedsData(patient, newStatus)) {
      setStatusChangeModal({ isOpen: true, patient, targetStatus: newStatus });
      return;
    }

    // Proceed with update
    await updatePatientStatus(patient, newStatus);
  };

  // Update patient status
  const updatePatientStatus = async (patient, newStatus, additionalData = {}) => {
    const oldStatus = patient.status;

    // Merge additionalData with existing patient data (never overwrite with undefined)
    const cleanAdditional = Object.fromEntries(
      Object.entries(additionalData).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );

    await base44.entities.Patient.update(patient.id, {
      status: newStatus,
      last_action_date: new Date().toISOString(),
      ...cleanAdditional
    });

    // Log the state change
    const logPromises = [
      base44.entities.PatientAction.create({
        patient_id: patient.id,
        action_type: 'cambio_estado',
        description: `Estado cambiado de "${PIPELINE_STATES.find(s => s.id === oldStatus)?.label}" a "${PIPELINE_STATES.find(s => s.id === newStatus)?.label}"`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        old_value: oldStatus,
        new_value: newStatus
      })
    ];

    // Log appointment/follow-up dates as separate actions for history
    if (cleanAdditional.appointment_date) {
      logPromises.push(base44.entities.PatientAction.create({
        patient_id: patient.id,
        action_type: 'cita',
        description: `Cita agendada para el ${new Date(cleanAdditional.appointment_date).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        new_value: cleanAdditional.appointment_date
      }));
    }
    if (cleanAdditional.follow_up_date) {
      logPromises.push(base44.entities.PatientAction.create({
        patient_id: patient.id,
        action_type: 'seguimiento',
        description: `Seguimiento programado para el ${new Date(cleanAdditional.follow_up_date).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        new_value: cleanAdditional.follow_up_date
      }));
    }
    if (cleanAdditional.treatment_appointment_date) {
      logPromises.push(base44.entities.PatientAction.create({
        patient_id: patient.id,
        action_type: 'cita',
        description: `Cita de tratamiento programada para el ${new Date(cleanAdditional.treatment_appointment_date).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        new_value: cleanAdditional.treatment_appointment_date
      }));
    }
    if (cleanAdditional.budget_amount) {
      logPromises.push(base44.entities.PatientAction.create({
        patient_id: patient.id,
        action_type: 'cambio_presupuesto',
        description: `Presupuesto registrado: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cleanAdditional.budget_amount)}`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        new_value: String(cleanAdditional.budget_amount)
      }));
    }
    if (cleanAdditional.rejection_reason) {
      logPromises.push(base44.entities.PatientAction.create({
        patient_id: patient.id,
        action_type: 'nota',
        description: `Motivo de rechazo: ${cleanAdditional.rejection_reason}`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        new_value: cleanAdditional.rejection_reason
      }));
    }

    await Promise.all(logPromises);

    queryClient.invalidateQueries({ queryKey: ['patientActions', patient.id] });
    refetchPatients();

    if (newStatus === 'pagado') {
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#2563eb', '#16a34a', '#fbbf24', '#ffffff'],
          disableForReducedMotion: true,
        });
      }, 300);
    }
    
    toast({
      title: "Estado actualizado",
      description: `${patient.first_name} ${patient.last_name} movido a ${PIPELINE_STATES.find(s => s.id === newStatus)?.label}`,
      duration: 3000
    });
  };

  // Handle status change modal confirm
  const handleStatusChangeConfirm = async (additionalData) => {
    const { patient, targetStatus } = statusChangeModal;
    await updatePatientStatus(patient, targetStatus, additionalData);
    setStatusChangeModal({ isOpen: false, patient: null, targetStatus: null });
  };

  // Handle new patient
  const handleCreatePatient = async (patientData) => {
    await base44.entities.Patient.create({
      ...patientData,
      clinic_id: clinicId,
      last_action_date: new Date().toISOString()
    });

    refetchPatients();
    
    toast({
      title: "Paciente creado",
      description: `${patientData.first_name} ${patientData.last_name} añadido al pipeline`,
      duration: 3000
    });
  };

  // Handle patient update
  const handleSavePatient = async (updatedPatient) => {
    const oldPatient = selectedPatient;
    
    await base44.entities.Patient.update(updatedPatient.id, {
      ...updatedPatient,
      last_action_date: new Date().toISOString()
    });

    // Log changes
    if (oldPatient.status !== updatedPatient.status) {
      await base44.entities.PatientAction.create({
        patient_id: updatedPatient.id,
        action_type: 'cambio_estado',
        description: `Estado cambiado`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        old_value: oldPatient.status,
        new_value: updatedPatient.status
      });
    }

    if (oldPatient.budget_amount !== updatedPatient.budget_amount) {
      await base44.entities.PatientAction.create({
        patient_id: updatedPatient.id,
        action_type: 'cambio_presupuesto',
        description: `Presupuesto actualizado`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        old_value: String(oldPatient.budget_amount || 0),
        new_value: String(updatedPatient.budget_amount || 0)
      });
    }

    queryClient.invalidateQueries({ queryKey: ['patientActions', selectedPatient?.id] });
    refetchPatients();
    setSelectedPatient(null);
    
    toast({
      title: "Cambios guardados",
      duration: 2000
    });
  };

  // Handle add action
  const handleAddAction = async (action) => {
    await base44.entities.PatientAction.create({
      ...action,
      performed_by: currentUser?.email,
      performed_by_name: currentUser?.full_name
    });

    await base44.entities.Patient.update(selectedPatient.id, {
      last_action_date: new Date().toISOString()
    });

    queryClient.invalidateQueries({ queryKey: ['patientActions', selectedPatient?.id] });
    refetchPatients();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="p-4 md:p-6">
          <div className="flex flex-col gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pipeline Comercial</h1>
              <p className="text-sm text-gray-500 mt-1">
                {filteredPatients.length} pacientes en seguimiento
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <CalendarExport patients={filteredPatients} variant="outline" className="w-full sm:w-auto" />
              {permissions.canCreate && (
                <Button onClick={() => setShowNewPatient(true)} className="gap-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  Nuevo paciente
                </Button>
              )}
            </div>
          </div>
          
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            users={activeResponsibles}
            doctors={doctors.filter(d => d.is_active)}
            showStateFilter={false}
          />
        </div>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="p-4 md:p-6 overflow-x-auto">
          {isMobile && (
            <div className="flex justify-center items-center gap-1 text-gray-400 text-xs mb-2 animate-pulse">
              <span>←</span> Desliza para ver más <span>→</span>
            </div>
          )}
          <div
            className="flex gap-4 min-w-max pb-4 items-start"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
          >
            {/* FASE COMERCIAL */}
            <div className="flex gap-4 items-start">
              <div className="flex flex-col items-center mr-1">
                <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase writing-mode-vertical rotate-180 select-none" style={{ writingMode: 'vertical-rl' }}>
                  Fase Comercial
                </span>
              </div>
              {PIPELINE_STATES.filter(s => ['nuevo_paciente','contactado','cita_agendada','cita_realizada','presupuesto_entregado','rechazado'].includes(s.id)).map(state => (
                <div key={state.id} style={{ scrollSnapAlign: 'start' }}>
                  <KanbanColumn
                    state={state}
                    patients={patientsByStatus[state.id] || []}
                    onPatientClick={setSelectedPatient}
                    config={configValues}
                  />
                </div>
              ))}
            </div>

            {/* Divisor */}
            <div className="flex flex-col items-center self-stretch mx-2">
              <div className="w-px flex-1 bg-gradient-to-b from-blue-200 via-purple-300 to-emerald-200" />
            </div>

            {/* FASE CLÍNICA */}
            <div className="flex gap-4 items-start">
              <div className="flex flex-col items-center mr-1">
                <span className="text-[10px] font-bold tracking-widest text-emerald-500 uppercase select-none" style={{ writingMode: 'vertical-rl' }}>
                  Fase Clínica
                </span>
              </div>
              {PIPELINE_STATES.filter(s => ['aceptado_pendiente_pago','pagado_parcialmente','pagado','pendiente_cita_tratamiento','citado_tratamiento','en_tratamiento'].includes(s.id)).map(state => (
                <div key={state.id} style={{ scrollSnapAlign: 'start' }}>
                  <KanbanColumn
                    state={state}
                    patients={patientsByStatus[state.id] || []}
                    onPatientClick={setSelectedPatient}
                    config={configValues}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DragDropContext>

      {/* Modals and Drawers */}
      {selectedPatient && (
        <PatientDrawer
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onSave={handleSavePatient}
          onAddAction={handleAddAction}
          actions={actions}
          users={activeResponsibles}
          systemUsers={users}
          doctors={doctors.filter(d => d.is_active)}
          patientTasks={patientTasks}
          onTasksChange={() => {
            refetchPatientTasks();
            queryClient.invalidateQueries({ queryKey: ['tasks', clinicId] });
          }}
          permissions={permissions}
        />
      )}

      <NewPatientModal
        isOpen={showNewPatient}
        onClose={() => setShowNewPatient(false)}
        onSave={handleCreatePatient}
        users={activeResponsibles}
        currentUser={currentUser}
      />

      <StatusChangeModal
        isOpen={statusChangeModal.isOpen}
        onClose={() => setStatusChangeModal({ isOpen: false, patient: null, targetStatus: null })}
        patient={statusChangeModal.patient}
        targetStatus={statusChangeModal.targetStatus}
        onConfirm={handleStatusChangeConfirm}
        clinicId={clinicId}
      />
    </div>
  );
}