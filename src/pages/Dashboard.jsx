import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
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
import { usePatientMutations } from '../hooks/usePatientMutations';

const DATE_RANGE_KEY = 'dental_flow_date_range';

const getCurrentMonthRange = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { from, to };
};

const getInitialDateRange = () => {
  try {
    const stored = localStorage.getItem(DATE_RANGE_KEY);
    if (stored) {
      const { from, to } = JSON.parse(stored);
      if (from && to) return { from: new Date(from), to: new Date(to) };
    }
  } catch (e) {}
  return getCurrentMonthRange();
};

export default function Dashboard() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    assigned_to: '',
    doctor_id: '',
    treatments: [],
    source: '',
    patient_type: '',
    budget_min: '',
    budget_max: ''
  });
  
  const [dateRange, setDateRange] = useState(getInitialDateRange);
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

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors', clinicId],
    queryFn: () => clinicId ? base44.entities.Doctor.filter({ clinic_id: clinicId }, 'name') : [],
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
      if (filters.doctor_id && p.doctor_id !== filters.doctor_id) return false;
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
    // Importe aceptado: usar importe_aceptado si existe, sino budget_amount
    const acceptedAmount = accepted.reduce((sum, p) => sum + (p.importe_aceptado ?? p.budget_amount ?? 0), 0);
    const rejectedAmount = rejected.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    const inFollowUpAmount = inFollowUp.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    const activeAmount = activePatients.reduce((sum, p) => sum + (p.budget_amount || 0), 0);

    // Sold amounts (importe vendido real = importe_aceptado)
    const soldAmount = accepted.reduce((sum, p) => sum + (p.importe_aceptado ?? p.budget_amount ?? 0), 0);
    const budgetWithSold = budgetDelivered.filter(p => p.budget_amount > 0);
    const totalBudgetForRatio = budgetWithSold.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    const totalSoldForRatio = budgetWithSold.reduce((sum, p) => sum + (p.importe_aceptado ?? p.budget_amount ?? 0), 0);
    const soldVsBudgetRatio = totalBudgetForRatio > 0 ? ((totalSoldForRatio / totalBudgetForRatio) * 100).toFixed(1) : '—';

    // % Cierre sobre importe presupuestado: importe aceptado / presupuesto original de los pacientes ACEPTADOS
    const allAcceptedAmount = accepted.reduce((sum, p) => sum + (p.importe_aceptado ?? p.budget_amount ?? 0), 0);
    const allBudgetedOfAccepted = accepted.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    const allBudgetedAmount = allBudgetedOfAccepted; // kept for subtitle display
    const cierreImporteRatio = allBudgetedOfAccepted > 0 ? ((allAcceptedAmount / allBudgetedOfAccepted) * 100).toFixed(1) : '—';

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
      soldAmount,
      soldVsBudgetRatio,
      rejectedCount: rejected.length,
      rejectedAmount,
      inFollowUpCount: inFollowUp.length,
      inFollowUpAmount,
      activeCount: activePatients.length,
      activeAmount,
      closeRatio,
      financedCount: financedPatients.length,
      gastosFinancierosTotal,
      cierreImporteRatio,
      allAcceptedAmount,
      allBudgetedAmount
    };
  }, [filteredPatients, onlyNewInPeriod, dateRange]);

  // Animated counters
  const animatedNew = useAnimatedCounter(kpis.newPatientsCount);
  const animatedBudgetCount = useAnimatedCounter(kpis.budgetDeliveredCount);
  const animatedAcceptedCount = useAnimatedCounter(kpis.acceptedCount);
  const animatedRejectedCount = useAnimatedCounter(kpis.rejectedCount);
  const animatedFollowUpCount = useAnimatedCounter(kpis.inFollowUpCount);
  const animatedActiveCount = useAnimatedCounter(kpis.activeCount);

  const { handleSavePatient: _handleSave, handleAddAction } = usePatientMutations({
    currentUser,
    refetchPatients,
    selectedPatientId: selectedPatient?.id,
    onClose: () => setSelectedPatient(null)
  });

  const handleSavePatient = (updatedPatient) => _handleSave(selectedPatient, updatedPatient);

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
            onDateRangeChange={(range) => {
              setDateRange(range);
              localStorage.setItem(DATE_RANGE_KEY, JSON.stringify({ from: range.from.toISOString(), to: range.to.toISOString() }));
            }}
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
            doctors={doctors.filter(d => d.is_active)}
            showStateFilter={true}
          />
        </div>

        {/* Main KPIs - Period Based */}
        {(() => {
          const mainKpis = [
            { title: "Nuevos clientes", value: animatedNew, icon: UserPlus, subtitle: "Altas en el período" },
            { title: "Presupuestado", value: animatedBudgetCount, icon: FileText, subtitle: formatCurrency(kpis.budgetDeliveredAmount) },
            { title: "Aceptado", value: animatedAcceptedCount, icon: CheckCircle, subtitle: formatCurrency(kpis.acceptedAmount) },
            { title: "Rechazado", value: animatedRejectedCount, icon: XCircle, subtitle: formatCurrency(kpis.rejectedAmount) },
            { title: "En seguimiento", value: animatedFollowUpCount, icon: Clock, subtitle: formatCurrency(kpis.inFollowUpAmount) },
          ];
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {mainKpis.map((kpi, index) => (
                <motion.div
                  key={kpi.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="h-full"
                >
                  <KPICard title={kpi.title} value={kpi.value} icon={kpi.icon} subtitle={kpi.subtitle} />
                </motion.div>
              ))}
            </div>
          );
        })()}

        {/* Secondary KPIs */}
        {(() => {
          const secondaryKpis = [
            { title: "Pacientes activos", value: animatedActiveCount, icon: Users, subtitle: "En pipeline actual" },
            { title: "Ratio de cierre", value: kpis.closeRatio !== '—' ? `${kpis.closeRatio}%` : '—', icon: TrendingUp, subtitle: "Aceptados / Total cerrados" },
            { title: "% Cierre s/ presupuestado", value: kpis.cierreImporteRatio !== '—' ? `${kpis.cierreImporteRatio}%` : '—', icon: TrendingUp, subtitle: `${formatCurrency(kpis.allAcceptedAmount)} / ${formatCurrency(kpis.allBudgetedAmount)}` },
            { title: "Importe potencial activo", value: formatCurrency(kpis.activeAmount), icon: Euro, subtitle: "En pipeline" },
            { title: "Gastos financieros", value: formatCurrency(kpis.gastosFinancierosTotal), icon: CreditCard, subtitle: `${kpis.financedCount} paciente${kpis.financedCount !== 1 ? 's' : ''} financiado${kpis.financedCount !== 1 ? 's' : ''}` },
          ];
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {secondaryKpis.map((kpi, index) => (
                <motion.div
                  key={kpi.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.08 }}
                  className="h-full"
                >
                  <KPICard title={kpi.title} value={kpi.value} icon={kpi.icon} subtitle={kpi.subtitle} />
                </motion.div>
              ))}
            </div>
          );
        })()}

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
            doctors={doctors.filter(d => d.is_active)}
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