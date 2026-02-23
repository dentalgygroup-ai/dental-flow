import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Download, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import FilterBar from '../components/crm/FilterBar';
import PatientDrawer from '../components/crm/PatientDrawer';
import NewPatientModal from '../components/crm/NewPatientModal';
import CalendarExport from '../components/crm/CalendarExport';
import { 
  getStateById, 
  getTreatmentById, 
  formatCurrency, 
  formatDate,
  getActionTypeById,
  isOverdue,
  isToday
} from '../components/crm/constants';
import { usePermissions } from '../components/crm/usePermissions';

export default function Patients() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [sortField, setSortField] = useState('next_action_date');
  const [sortOrder, setSortOrder] = useState('asc');
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

  const { data: responsibles = [] } = useQuery({
    queryKey: ['responsibles'],
    queryFn: () => base44.entities.Responsible.list('name')
  });

  const activeResponsibles = responsibles.filter(r => r.is_active);

  const { data: actions = [] } = useQuery({
    queryKey: ['patientActions', selectedPatient?.id],
    queryFn: () => selectedPatient 
      ? base44.entities.PatientAction.filter({ patient_id: selectedPatient.id }, '-created_date')
      : [],
    enabled: !!selectedPatient
  });

  const permissions = usePermissions(currentUser);

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    let result = patients.filter(p => {
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

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) aVal = sortOrder === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortOrder === 'asc' ? Infinity : -Infinity;

      // Handle dates
      if (sortField.includes('date')) {
        aVal = aVal === Infinity || aVal === -Infinity ? aVal : new Date(aVal).getTime();
        bVal = bVal === Infinity || bVal === -Infinity ? bVal : new Date(bVal).getTime();
      }

      // Handle strings
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [patients, filters, sortField, sortOrder]);

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Export to CSV
  const handleExport = () => {
    if (!permissions.canExport) {
      toast({
        title: "Sin permisos",
        description: "No tienes permisos para exportar datos",
        variant: "destructive"
      });
      return;
    }

    const headers = ['Nombre', 'Apellidos', 'Teléfono', 'Email', 'Tratamientos', 'Estado', 'Responsable', 'Presupuesto', 'Próxima acción', 'Última acción'];
    const rows = filteredPatients.map(p => [
      p.first_name,
      p.last_name,
      p.phone,
      p.email,
      p.treatments?.join(', ') || '',
      getStateById(p.status)?.label || p.status,
      p.assigned_to_name || '',
      p.budget_amount || '',
      p.next_action_date ? formatDate(p.next_action_date) : '',
      p.last_action_date ? formatDate(p.last_action_date) : ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pacientes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exportación completada",
      description: `${filteredPatients.length} pacientes exportados`,
      duration: 3000
    });
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
      description: `${patientData.first_name} ${patientData.last_name} añadido`,
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

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filteredPatients.length} pacientes
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <CalendarExport patients={filteredPatients} variant="outline" className="w-full sm:w-auto" />
            {permissions.canExport && (
              <Button variant="outline" onClick={handleExport} className="gap-2 w-full sm:w-auto">
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            )}
            {permissions.canCreate && (
              <Button onClick={() => setShowNewPatient(true)} className="gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                Nuevo paciente
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          users={activeResponsibles}
          showStateFilter={true}
        />

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('first_name')}
                  >
                    <div className="flex items-center gap-1">
                      Nombre <SortIcon field="first_name" />
                    </div>
                  </TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tratamientos</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Estado <SortIcon field="status" />
                    </div>
                  </TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 text-right"
                    onClick={() => handleSort('budget_amount')}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Presupuesto <SortIcon field="budget_amount" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('next_action_date')}
                  >
                    <div className="flex items-center gap-1">
                      Próxima acción <SortIcon field="next_action_date" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('last_action_date')}
                  >
                    <div className="flex items-center gap-1">
                      Última acción <SortIcon field="last_action_date" />
                    </div>
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                      No se encontraron pacientes
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map(patient => {
                    const state = getStateById(patient.status);
                    const actionType = getActionTypeById(patient.next_action_type);
                    const overdue = isOverdue(patient.next_action_date);
                    const today = isToday(patient.next_action_date);

                    return (
                      <TableRow 
                        key={patient.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <TableCell className="font-medium">
                          {patient.first_name} {patient.last_name}
                        </TableCell>
                        <TableCell>
                          <a 
                            href={`tel:${patient.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:underline"
                          >
                            {patient.phone}
                          </a>
                        </TableCell>
                        <TableCell>
                          <a 
                            href={`mailto:${patient.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:underline truncate block max-w-[150px]"
                          >
                            {patient.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {patient.treatments?.map(t => {
                              const treatment = getTreatmentById(t);
                              return treatment ? (
                                <Badge key={t} variant="secondary" className={`${treatment.color} text-xs`}>
                                  {treatment.label}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${state?.color} text-xs`}>
                            {state?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {patient.assigned_to_name || '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(patient.budget_amount, patient.budget_currency)}
                        </TableCell>
                        <TableCell>
                          {patient.next_action_date ? (
                            <div className={`text-sm ${overdue ? 'text-red-600' : today ? 'text-blue-600' : ''}`}>
                              <span className="font-medium">{actionType?.label}</span>
                              <br />
                              <span className="text-xs">{formatDate(patient.next_action_date)}</span>
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(patient.last_action_date)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedPatient(patient)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Modals and Drawers */}
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

        <NewPatientModal
          isOpen={showNewPatient}
          onClose={() => setShowNewPatient(false)}
          onSave={handleCreatePatient}
          users={users}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}