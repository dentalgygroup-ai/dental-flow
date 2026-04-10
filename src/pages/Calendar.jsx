import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PatientDrawer from '../components/crm/PatientDrawer';
import { 
  getStateById, 
  getActionTypeById, 
  formatDate,
  isOverdue,
  isToday
} from '../components/crm/constants';
import { usePermissions } from '../components/crm/usePermissions';
import { usePatientMutations } from '../hooks/usePatientMutations';

export default function CalendarPage() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'

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

  const { data: actions = [] } = useQuery({
    queryKey: ['patientActions', selectedPatient?.id],
    queryFn: () => selectedPatient 
      ? base44.entities.PatientAction.filter({ patient_id: selectedPatient.id }, '-created_date')
      : [],
    enabled: !!selectedPatient
  });

  const permissions = usePermissions(currentUser);

  // Build all calendar events from multiple date fields
  const calendarEvents = useMemo(() => {
    const events = [];

    patients.forEach(patient => {
      const name = `${patient.first_name} ${patient.last_name}`;

      if (patient.appointment_date) {
        events.push({ patient, date: new Date(patient.appointment_date), label: 'Cita', color: 'bg-purple-100 text-purple-800 border-purple-200', type: 'cita' });
      }
      if (patient.follow_up_date) {
        events.push({ patient, date: new Date(patient.follow_up_date), label: 'Seguimiento', color: 'bg-amber-100 text-amber-800 border-amber-200', type: 'seguimiento' });
      }
      if (patient.treatment_appointment_date) {
        events.push({ patient, date: new Date(patient.treatment_appointment_date), label: 'Cita tratamiento', color: 'bg-green-100 text-green-800 border-green-200', type: 'cita_tratamiento' });
      }
      if (patient.next_action_date && patient.next_action_type) {
        // Avoid duplicating if same date as other events
        events.push({ patient, date: new Date(patient.next_action_date), label: patient.next_action_type, color: 'bg-blue-100 text-blue-800 border-blue-200', type: 'next_action' });
      }
    });

    return events;
  }, [patients]);

  // Keep for header count
  const patientsWithActions = useMemo(() => {
    return patients.filter(p => p.next_action_date && p.next_action_type);
  }, [patients]);

  // Get days to display based on view mode
  const daysToDisplay = useMemo(() => {
    const days = [];
    const startDate = new Date(currentDate);
    
    if (viewMode === 'month') {
      startDate.setDate(1);
      const month = startDate.getMonth();
      // Add null padding for days before the 1st (Mon=0 ... Sun=6)
      const firstDayOfWeek = startDate.getDay();
      const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
      for (let i = 0; i < offset; i++) days.push(null);
      
      while (startDate.getMonth() === month) {
        days.push(new Date(startDate));
        startDate.setDate(startDate.getDate() + 1);
      }
    } else {
      // Week view
      const dayOfWeek = startDate.getDay();
      const monday = new Date(startDate);
      monday.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      
      for (let i = 0; i < 7; i++) {
        days.push(new Date(monday));
        monday.setDate(monday.getDate() + 1);
      }
    }
    
    return days;
  }, [currentDate, viewMode]);

  // Group events by date
  const actionsByDate = useMemo(() => {
    const grouped = {};
    
    calendarEvents.forEach(event => {
      const dateKey = event.date.toDateString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    
    return grouped;
  }, [calendarEvents]);

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const { handleSavePatient: _handleSave, handleAddAction } = usePatientMutations({
    currentUser,
    refetchPatients,
    selectedPatientId: selectedPatient?.id,
    onClose: () => setSelectedPatient(null)
  });

  const handleSavePatient = (updatedPatient) => _handleSave(selectedPatient, updatedPatient);

  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 capitalize">{monthName}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {patientsWithActions.length} acciones programadas
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Mes
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
            </div>
            <Button variant="outline" onClick={handleToday}>
              Hoy
            </Button>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={handlePrevious}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className={`grid gap-px bg-gray-200 ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
            {/* Weekday headers */}
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, idx) => (
              <div key={idx} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-600">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {daysToDisplay.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="bg-white p-3 min-h-[120px]" />;
              }
              const dateKey = day.toDateString();
              const dayActions = actionsByDate[dateKey] || [];
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isTodayDate = isToday(day.toISOString());
              
              return (
                <div
                  key={idx}
                  className={`bg-white p-3 min-h-[120px] ${
                    !isCurrentMonth && viewMode === 'month' ? 'opacity-40' : ''
                  } ${isTodayDate ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    isTodayDate ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {day.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayActions.map((event, eIdx) => {
                      const { patient, label, color } = event;
                      const overdue = event.date < new Date();
                      
                      return (
                        <button
                          key={`${patient.id}-${eIdx}`}
                          onClick={() => setSelectedPatient(patient)}
                          className={`w-full text-left p-2 rounded text-xs border-l-2 ${
                            overdue ? 'border-red-400 bg-red-50' : `border-blue-400 ${color || 'bg-blue-50'}`
                          } hover:opacity-80`}
                        >
                          <div className="font-medium truncate">
                            {patient.first_name} {patient.last_name}
                          </div>
                          <div className="truncate capitalize">
                            {label}
                          </div>
                          {patient.assigned_to_name && (
                            <div className="flex items-center gap-1 mt-1">
                              <User className="w-3 h-3" />
                              <span className="truncate text-gray-500">
                                {patient.assigned_to_name}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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