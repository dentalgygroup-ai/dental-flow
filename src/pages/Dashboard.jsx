import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Handshake, FileText, CheckCircle, TrendingUp, Euro, Wallet } from 'lucide-react';
import KPICard from '../components/crm/KPICard';
import NextActionsTable from '../components/crm/NextActionsTable';
import ResponsibleStats from '../components/crm/ResponsibleStats';
import StateAmountsChart from '../components/crm/StateAmountsChart';
import FilterBar from '../components/crm/FilterBar';
import PatientDrawer from '../components/crm/PatientDrawer';
import RequiresAttentionList from '../components/crm/RequiresAttentionList';
import CalendarExport from '../components/crm/CalendarExport';
import { ACTIVE_STATES, formatCurrency } from '../components/crm/constants';
import { usePermissions } from '../components/crm/usePermissions';

export default function Dashboard() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    assigned_to: '',
    treatments: [],
    source: '',
    priority: '',
    budget_min: '',
    budget_max: ''
  });

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

  const { data: actions = [] } = useQuery({
    queryKey: ['patientActions', selectedPatient?.id],
    queryFn: () => selectedPatient 
      ? base44.entities.PatientAction.filter({ patient_id: selectedPatient.id }, '-created_date')
      : [],
    enabled: !!selectedPatient
  });

  const { data: config = [] } = useQuery({
    queryKey: ['appConfig'],
    queryFn: () => base44.entities.AppConfig.list()
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
      if (filters.status && p.status !== filters.status) return false;
      if (filters.assigned_to && p.assigned_to !== filters.assigned_to) return false;
      if (filters.treatments?.length > 0 && !filters.treatments.some(t => p.treatments?.includes(t))) return false;
      if (filters.source && p.source !== filters.source) return false;
      if (filters.patient_type && p.patient_type !== filters.patient_type) return false;
      if (filters.budget_min && (p.budget_amount || 0) < parseFloat(filters.budget_min)) return false;
      if (filters.budget_max && (p.budget_amount || 0) > parseFloat(filters.budget_max)) return false;
      return true;
    });
  }, [patients, filters]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const activePatients = filteredPatients.filter(p => ACTIVE_STATES.includes(p.status));
    const inNegotiation = filteredPatients.filter(p => p.status === 'en_negociacion');
    const budgetDelivered = filteredPatients.filter(p => p.status === 'presupuesto_entregado');
    const paid = filteredPatients.filter(p => p.status === 'pagado');
    const rejected = filteredPatients.filter(p => p.status === 'rechazado');

    const negotiationAmount = inNegotiation.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    const paidAmount = paid.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
    const activeAmount = activePatients.reduce((sum, p) => sum + (p.budget_amount || 0), 0);

    const totalClosed = paid.length + rejected.length;
    const closeRatio = totalClosed > 0 ? ((paid.length / totalClosed) * 100).toFixed(1) : '—';

    return {
      activeCount: activePatients.length,
      negotiationCount: inNegotiation.length,
      budgetDeliveredCount: budgetDelivered.length,
      paidCount: paid.length,
      closeRatio,
      negotiationAmount,
      paidAmount,
      activeAmount
    };
  }, [filteredPatients]);

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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Comercial</h1>
            <p className="text-sm text-gray-500 mt-1">
              Resumen ejecutivo de tu pipeline comercial
            </p>
          </div>
          <div className="flex justify-end">
            <CalendarExport patients={filteredPatients} variant="outline" />
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          users={users}
          showStateFilter={true}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Pacientes activos"
            value={kpis.activeCount}
            icon={Users}
          />
          <KPICard
            title="En negociación"
            value={kpis.negotiationCount}
            icon={Handshake}
          />
          <KPICard
            title="Presupuestos entregados"
            value={kpis.budgetDeliveredCount}
            icon={FileText}
          />
          <KPICard
            title="Cerrados pagados"
            value={kpis.paidCount}
            icon={CheckCircle}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Ratio de cierre"
            value={kpis.closeRatio !== '—' ? `${kpis.closeRatio}%` : '—'}
            icon={TrendingUp}
            subtitle="Pagados / (Pagados + Rechazados)"
          />
          <KPICard
            title="Importe en negociación"
            value={formatCurrency(kpis.negotiationAmount)}
            icon={Wallet}
          />
          <KPICard
            title="Importe cerrado"
            value={formatCurrency(kpis.paidAmount)}
            icon={Euro}
          />
          <KPICard
            title="Importe potencial activo"
            value={formatCurrency(kpis.activeAmount)}
            icon={Euro}
          />
        </div>

        {/* Requires Attention */}
        <RequiresAttentionList 
          patients={filteredPatients}
          onPatientClick={setSelectedPatient}
          config={configValues}
          limit={10}
        />

        {/* Charts and tables */}
        <StateAmountsChart patients={filteredPatients} />
        
        <NextActionsTable 
          patients={filteredPatients} 
          onPatientClick={setSelectedPatient}
        />

        <ResponsibleStats patients={filteredPatients} users={users} />

        {/* Patient Drawer */}
        {selectedPatient && (
          <PatientDrawer
            patient={selectedPatient}
            onClose={() => setSelectedPatient(null)}
            onSave={handleSavePatient}
            onAddAction={handleAddAction}
            actions={actions}
            users={users}
            permissions={permissions}
          />
        )}
      </div>
    </div>
  );
}