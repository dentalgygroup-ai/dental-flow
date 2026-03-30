import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { UserPlus, FileText, CheckCircle, XCircle, TrendingUp, Euro, Users, Clock, CreditCard } from 'lucide-react';
import KPICard from '../components/crm/KPICard';
import NextActionsTable from '../components/crm/NextActionsTable';
import ResponsibleStats from '../components/crm/ResponsibleStats';
import StateAmountsChart from '../components/crm/StateAmountsChart';
import FilterBar from '../components/crm/FilterBar';
import PatientDrawer from '../components/crm/PatientDrawer';
import RequiresAttentionList from '../components/crm/RequiresAttentionList';
import CalendarExport from '../components/crm/CalendarExport';
import DateFilter from '../components/crm/DateFilter';
import { ACTIVE_STATES, formatCurrency } from '../components/crm/constants';
import { usePermissions } from '../components/crm/usePermissions';

export default function Dashboard() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    assigned_to: '',
    treatments: [],
    source: '',
    patient_type: '',
    budget_min: '',
    budget_max: ''
  });
  
  // Initialize date range to current month
  const getCurrentMonthRange = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { from, to };
  };
  
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());
  const [onlyNewInPeriod, setOnlyNewInPeriod] = useState(false);

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

  const { data: config = [] } = useQuery({
    queryKey: ['appConfig', clinicId],
    queryFn: () => clinicId ? base44.entities.AppConfig.filter({ clinic_id: clinicId }) : [],
    enabled: !!clinicId,
  });

  const permissions = usePermissions(currentUser);

  // Parse config
  const configValues = useMemo(() => ({
    days_no_movement: config.find(c => c.config_key === 'days_no_movement')?.config_value || 7,
    days_in_negotiation: config.find(c => c.config_key === 'days_in_negotiation')?.config_value || 14
  }), [config]);

  // Filter patients by date range and other filters
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // Date range filter
      if (dateRange?.from && dateRange?.to) {
        const createdDate = new Date(p.created_date);
        if (createdDate < dateRange.from || createdDate > dateRange.to) {
          return false;
        }
      }
      
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        if (!fullName.includes(search) && 
            !p.phone?.includes(search) && 
            !p.email?.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (filters.status && p.status !== filters.status) return false;
      if (filters.assigned_to && p.assigned_to !== filters.assigned_to) return false;
      if (filters.treatments?.length > 0 && !filters.treatments.some(t => p.treatments?.includes(t))) return false;
      if (filters.source && p.source !== filters.source) return false;
      if (filters.patient_type && p.patient_type !== filters.patient_type) return false;
      if (filters.budget_min && (p.budget_amount || 0) < parseFloat(filters.budget_min)) return false;
      if (filters.budget_max && (p.budget_amount || 0) > parseFloat(filters.budget_max)) return false;
      return true;
    });
  }, [patients, filters, dateRange]);

  // Helper to check if patient was created in period
  const isCreatedInPeriod = (patient) => {
    if (!dateRange?.from || !dateRange?.to) return true;
    const created = new Date(patient.created_date);
    return created >= dateRange.from && created <= dateRange.to;
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    // All patients created in the period
    const newPatients = filteredPatients.filter(p => isCreatedInPeriod(p));
    
    // Active patients
    const activePatients = filteredPatients.filter(p => ACTIVE_STATES.includes(p.status));
    
    // Presupuestado = Aceptado + Rechazado + En seguimiento (todos los estados desde presupuesto entregado en adelante)
    const budgetDeliveredStatuses = [
      'presupuesto_entregado', 'en_negociacion', 'rechazado',
      'aceptado_pendiente_pago', 'pagado', 'pendiente_cita', 'citado', 'en_tratamiento'
    ];
    let budgetDelivered = filteredPatients.filter(p => budgetDeliveredStatuses.includes(p.status));
    if (onlyNewInPeriod) {
      budgetDelivered = budgetDelivered.filter(isCreatedInPeriod);
    }

    // Aceptado = aceptado_pendiente_pago + pagado + pendiente_cita + citado + en_tratamiento
    const acceptedStatuses = ['aceptado_pendiente_pago', 'pagado', 'pendiente_cita', 'citado', 'en_tratamiento'];
    let accepted = filteredPatients.filter(p => acceptedStatuses.includes(p.status));
    if (onlyNewInPeriod) {
      accepted = accepted.filter(isCreatedInPeriod);
    }

    // Rechazado = solo rechazado
    let rejected = filteredPatients.filter(p => p.status === 'rechazado');
    if (onlyNewInPeriod) {
      rejected = rejected.filter(isCreatedInPeriod);
    }

    // En seguimiento = presupuesto_entregado + en_negociacion
    const followUpStatuses = ['presupuesto_entregado', 'en_negociacion'];
    let inFollowUp = filteredPatients.filter(p => followUpStatuses.includes(p.status));
    if (onlyNewInPeriod) {
      inFollowUp = inFollowUp.filter(isCreatedInPeriod);
    }

    // Calculate amounts
    const budgetDeliveredAmount = budgetDelivered.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    const acceptedAmount = accepted.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    const rejectedAmount = rejected.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    const inFollowUpAmount = inFollowUp.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    const activeAmount = activePatients.reduce((sum, p) => sum + (p.budget_amount || 0), 0);

    // Close ratio
    const totalClosed = accepted.length + rejected.length;
    const closeRatio = totalClosed > 0 ? ((accepted.length / totalClosed) * 100).toFixed(1) : '—';

    // Gastos financieros — pacientes aceptados que financian
    const financedPatients = accepted.filter(p => p.financia_tratamiento);
    const gastosFinancierosTotal = financedPatients.reduce((sum, p) => sum + (p.gastos_financieros || 0), 0);

    return {
      newPatientsCount: newPatients.length,
      budgetDeliveredCount: budgetDelivered.length,
      budgetDeliveredAmount,
      acceptedCount: accepted.length,
      acceptedAmount,
      rejectedCount: rejected.length,
      rejectedAmount,
      inFollowUpCount: inFollowUp.length,
      inFollowUpAmount,
      activeCount: activePatients.length,
      activeAmount,
      closeRatio,
      financedCount: financedPatients.length,
      gastosFinancierosTotal
    };
  }, [filteredPatients, onlyNewInPeriod, dateRange]);

  // Handle patient update
  const handleSavePatient = async (updatedPatient) => {
    const oldPatient = selectedPatient;
    
    await base44.entities.Patient.update(updatedPatient.id, {
      ...updatedPatient,
      last_action_date: new Date().toISOString()
    });

    // Log status change if different
    if (oldPatient.status !== updatedPatient.status) {
      await base44.entities.PatientAction.create({
        patient_id: updatedPatient.id,
        action_type: 'cambio_estado',
        description: `Estado cambiado de ${oldPatient.status} a ${updatedPatient.status}`,
        performed_by: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        old_value: oldPatient.status,
        new_value: updatedPatient.status
      });
    }

    // Log budget change if different
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

    refetchPatients();
    setSelectedPatient(null);
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

    refetchPatients();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Comercial</h1>
            <p className="text-sm text-gray-600 mt-2">
              Resumen ejecutivo de tu pipeline comercial
            </p>
          </div>
          <CalendarExport patients={filteredPatients} variant="default" className="shadow-sm" />
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <DateFilter
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onlyNewInPeriod={onlyNewInPeriod}
            onOnlyNewInPeriodChange={setOnlyNewInPeriod}
          />
        </div>

        {/* Standard Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            users={activeResponsibles}
            showStateFilter={true}
          />
        </div>

        {/* Main KPIs - Period Based */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Nuevos clientes"
            value={kpis.newPatientsCount}
            icon={UserPlus}
            subtitle="Altas en el período"
          />
          <KPICard
            title="Presupuestado"
            value={kpis.budgetDeliveredCount}
            icon={FileText}
            subtitle={formatCurrency(kpis.budgetDeliveredAmount)}
          />
          <KPICard
            title="Aceptado"
            value={kpis.acceptedCount}
            icon={CheckCircle}
            subtitle={formatCurrency(kpis.acceptedAmount)}
          />
          <KPICard
            title="Rechazado"
            value={kpis.rejectedCount}
            icon={XCircle}
            subtitle={formatCurrency(kpis.rejectedAmount)}
          />
          <KPICard
            title="En seguimiento"
            value={kpis.inFollowUpCount}
            icon={Clock}
            subtitle={formatCurrency(kpis.inFollowUpAmount)}
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            title="Pacientes activos"
            value={kpis.activeCount}
            icon={Users}
            subtitle="En pipeline actual"
          />
          <KPICard
            title="Ratio de cierre"
            value={kpis.closeRatio !== '—' ? `${kpis.closeRatio}%` : '—'}
            icon={TrendingUp}
            subtitle="Aceptados / Total cerrados"
          />
          <KPICard
            title="Importe potencial activo"
            value={formatCurrency(kpis.activeAmount)}
            icon={Euro}
            subtitle="En pipeline"
          />
          <KPICard
            title="Gastos financieros"
            value={formatCurrency(kpis.gastosFinancierosTotal)}
            icon={CreditCard}
            subtitle={`${kpis.financedCount} paciente${kpis.financedCount !== 1 ? 's' : ''} financiado${kpis.financedCount !== 1 ? 's' : ''}`}
          />
        </div>

        {/* Charts and Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StateAmountsChart patients={filteredPatients} />
          <ResponsibleStats patients={filteredPatients} users={activeResponsibles} />
        </div>

        {/* Requires Attention */}
        <RequiresAttentionList 
          patients={filteredPatients}
          onPatientClick={setSelectedPatient}
          config={configValues}
          limit={10}
        />
        
        {/* Next Actions */}
        <NextActionsTable 
          patients={filteredPatients} 
          onPatientClick={setSelectedPatient}
        />

        {/* Patient Drawer */}
        {selectedPatient && (
          <PatientDrawer
            patient={selectedPatient}
            onClose={() => setSelectedPatient(null)}
            onSave={handleSavePatient}
            onAddAction={handleAddAction}
            actions={actions}
            users={activeResponsibles}
            systemUsers={users}
            patientTasks={patientTasks}
            onTasksChange={() => {
              refetchPatientTasks();
              queryClient.invalidateQueries({ queryKey: ['tasks', clinicId] });
            }}
            permissions={permissions}
          />
        )}
      </div>
    </div>
  );
}