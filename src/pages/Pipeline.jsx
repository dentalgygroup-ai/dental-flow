import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
import { PIPELINE_STATES, STATE_REQUIREMENTS } from '../components/crm/constants';
import { usePermissions } from '../components/crm/usePermissions';

export default function Pipeline() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [statusChangeModal, setStatusChangeModal] = useState({ isOpen: false, patient: null, targetStatus: null });
  const [filters, setFilters] = useState({
    search: '',
    assigned_to: '',
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

  const { data: patients = [], refetch: refetchPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: responsibles = [] } = useQuery({
    queryKey: ['responsibles'],
    queryFn: () => base44.entities.Responsible.list('name')
  });

  const activeResponsibles = responsibles.filter(r => r.is_active);

  const { data: config = [] } = useQuery({
    queryKey: ['appConfig'],
    queryFn: () => base44.entities.AppConfig.list()
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['patientActions', selectedPatient?.id],
    queryFn: () => selectedPatient 
      ? base44.entities.PatientAction.filter({ patient_id: selectedPatient.id }, '-created_date')
      : [],
    enabled: !!selectedPatient
  });

  const permissions = usePermissions(currentUser);

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

    await base44.entities.Patient.update(patient.id, {
      status: newStatus,
      last_action_date: new Date().toISOString(),
      ...additionalData
    });

    // Log the change
    await base44.entities.PatientAction.create({
      patient_id: patient.id,
      action_type: 'cambio_estado',
      description: `Estado cambiado`,
      performed_by: currentUser?.email,
      performed_by_name: currentUser?.full_name,
      old_value: oldStatus,
      new_value: newStatus
    });

    refetchPatients();
    
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
            showStateFilter={false}
          />
        </div>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="p-4 md:p-6 overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {PIPELINE_STATES.map(state => (
              <KanbanColumn
                key={state.id}
                state={state}
                patients={patientsByStatus[state.id] || []}
                onPatientClick={setSelectedPatient}
                config={configValues}
              />
            ))}
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
      />
    </div>
  );
}