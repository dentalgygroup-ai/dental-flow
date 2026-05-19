import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Search, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import PatientDrawer from '../components/crm/PatientDrawer';
import { getTreatmentById, formatCurrency, formatDate } from '../components/crm/constants';
import { usePermissions } from '../components/crm/usePermissions';
import { usePatientMutations } from '../hooks/usePatientMutations';
import { useQueryClient } from '@tanstack/react-query';

export default function TratamientoFinalizado() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const clinicId = currentUser?.clinic_id;

  const { data: patients = [], refetch: refetchPatients } = useQuery({
    queryKey: ['patientsFinalizado', clinicId],
    queryFn: () => clinicId
      ? base44.entities.Patient.filter({ clinic_id: clinicId, tratamiento_finalizado: true }, '-tratamiento_finalizado_date')
      : [],
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

  const { data: actions = [] } = useQuery({
    queryKey: ['patientActions', selectedPatient?.id],
    queryFn: () => selectedPatient
      ? base44.entities.PatientAction.filter({ patient_id: selectedPatient.id }, '-created_date')
      : [],
    enabled: !!selectedPatient,
  });

  const { data: patientTasks = [], refetch: refetchPatientTasks } = useQuery({
    queryKey: ['patientTasks', selectedPatient?.id],
    queryFn: () => selectedPatient
      ? base44.entities.Task.filter({ patient_id: selectedPatient.id }, '-created_date')
      : [],
    enabled: !!selectedPatient,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['clinicUsers', clinicId],
    queryFn: () => clinicId ? base44.entities.User.filter({ clinic_id: clinicId }) : [],
    enabled: !!clinicId,
  });

  const permissions = usePermissions(currentUser);
  const activeResponsibles = responsibles.filter(r => r.is_active);

  const { handleSavePatient: _handleSave, handleAddAction } = usePatientMutations({
    currentUser,
    refetchPatients,
    selectedPatientId: selectedPatient?.id,
    onClose: () => setSelectedPatient(null)
  });

  const handleSavePatient = (updatedPatient) => _handleSave(selectedPatient, updatedPatient);

  const filtered = useMemo(() => {
    if (!search) return patients;
    const s = search.toLowerCase();
    return patients.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(s) ||
      p.phone?.includes(s) ||
      p.email?.toLowerCase().includes(s)
    );
  }, [patients, search]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              Tratamientos finalizados
            </h1>
            <p className="text-sm text-gray-500 mt-1">{filtered.length} pacientes con tratamiento completado</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar paciente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Tratamientos</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Doctor/a</TableHead>
                  <TableHead className="text-right">Importe aceptado</TableHead>
                  <TableHead>Fin tratamiento</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-gray-400">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                      No hay tratamientos finalizados todavía
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(patient => (
                    <TableRow
                      key={patient.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <TableCell className="font-medium">
                        {patient.first_name} {patient.last_name}
                      </TableCell>
                      <TableCell>
                        <a href={`tel:${patient.phone}`} onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline">
                          {patient.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {patient.treatments?.map(t => {
                            const treatment = getTreatmentById(t);
                            return treatment ? (
                              <Badge key={t} variant="secondary" className={`${treatment.color} text-xs`}>{treatment.label}</Badge>
                            ) : null;
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{patient.assigned_to_name || '—'}</TableCell>
                      <TableCell className="text-sm text-gray-600">{patient.doctor_name || '—'}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-700">
                        {formatCurrency(patient.importe_aceptado)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {patient.tratamiento_finalizado_date ? formatDate(patient.tratamiento_finalizado_date) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedPatient(patient)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

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