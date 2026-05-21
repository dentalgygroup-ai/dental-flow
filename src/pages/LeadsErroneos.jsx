import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Download, Phone, Mail, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SOURCES, formatDate } from '../components/crm/constants';
import { useToast } from '@/components/ui/use-toast';

function exportToCSV(patients) {
  const headers = ['Nombre', 'Apellidos', 'Teléfono', 'Email', 'Fuente', 'Fecha alta'];
  const rows = patients.map(p => [
    p.first_name,
    p.last_name,
    p.phone || '',
    p.email || '',
    SOURCES.find(s => s.id === p.source)?.label || p.source || '',
    formatDate(p.created_date)
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_erroneos_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsErroneos() {
  const [sourceFilter, setSourceFilter] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const clinicId = currentUser?.clinic_id;

  const { data: leads = [], refetch } = useQuery({
    queryKey: ['leadsErroneos', clinicId],
    queryFn: () => clinicId
      ? base44.entities.Patient.filter({ clinic_id: clinicId, status: 'erroneo' }, '-created_date')
      : [],
    enabled: !!clinicId,
  });

  const filtered = useMemo(() => {
    if (!sourceFilter) return leads;
    return leads.filter(p => p.source === sourceFilter);
  }, [leads, sourceFilter]);

  const handleReactivar = async (patient) => {
    await base44.entities.Patient.update(patient.id, {
      status: 'nuevo_paciente',
      last_action_date: new Date().toISOString()
    });
    await base44.entities.PatientAction.create({
      patient_id: patient.id,
      clinic_id: patient.clinic_id,
      action_type: 'cambio_estado',
      description: 'Lead reactivado desde Erróneos',
      performed_by: currentUser?.email,
      performed_by_name: currentUser?.full_name,
      old_value: 'erroneo',
      new_value: 'nuevo_paciente'
    });
    queryClient.invalidateQueries({ queryKey: ['leadsErroneos', clinicId] });
    queryClient.invalidateQueries({ queryKey: ['pipelinePatients', clinicId] });
    queryClient.invalidateQueries({ queryKey: ['patients', clinicId] });
    toast({ title: 'Lead reactivado', description: `${patient.first_name} ${patient.last_name} vuelve al pipeline`, duration: 3000 });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Leads erróneos</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {filtered.length} lead{filtered.length !== 1 ? 's' : ''} con datos incorrectos o inservibles
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filtro por fuente */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filtrar por fuente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todas las fuentes</SelectItem>
                {SOURCES.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => exportToCSV(filtered)} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay leads erróneos</p>
            <p className="text-gray-400 text-sm mt-1">
              {sourceFilter ? 'Prueba cambiando el filtro de fuente' : 'Los leads marcados como erróneos aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fuente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Alta</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(patient => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{patient.first_name} {patient.last_name}</p>
                      {patient.internal_notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{patient.internal_notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 space-y-1">
                      {patient.phone && (
                        <a href={`tel:${patient.phone}`} className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 transition-colors">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{patient.phone}</span>
                        </a>
                      )}
                      {patient.email && (
                        <a href={`mailto:${patient.email}`} className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 transition-colors truncate max-w-xs">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{patient.email}</span>
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {patient.source ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {SOURCES.find(s => s.id === patient.source)?.label || patient.source}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(patient.created_date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleReactivar(patient)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors ml-auto"
                        title="Reactivar en pipeline"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reactivar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}