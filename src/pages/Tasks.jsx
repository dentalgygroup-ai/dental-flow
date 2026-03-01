import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronRight, CalendarDays, List, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import TaskForm from '../components/crm/TaskForm';
import TaskCard from '../components/crm/TaskCard';
import TaskCalendarView from '../components/crm/TaskCalendarView';
import { formatDate } from '../components/crm/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const TASK_TYPE_LABELS = {
  llamada: 'Llamada',
  whatsapp: 'WhatsApp',
  email: 'Email',
  cita: 'Cita',
  seguimiento: 'Seguimiento',
  recordatorio: 'Recordatorio',
  otro: 'Otro'
};

export const PRIORITY_COLORS = {
  baja: 'bg-gray-100 text-gray-600',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700'
};

export const STATUS_COLORS = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  en_progreso: 'bg-blue-100 text-blue-700',
  completada: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-500'
};

export default function Tasks() {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [filterPatient, setFilterPatient] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedTasks, setExpandedTasks] = useState({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clinicId = currentUser?.clinic_id;

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', clinicId],
    queryFn: () => clinicId ? base44.entities.Task.filter({ clinic_id: clinicId }, '-created_date') : [],
    enabled: !!clinicId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', clinicId],
    queryFn: () => clinicId ? base44.entities.Patient.filter({ clinic_id: clinicId }, 'first_name') : [],
    enabled: !!clinicId,
  });

  const { data: responsibles = [] } = useQuery({
    queryKey: ['responsibles', clinicId],
    queryFn: () => clinicId ? base44.entities.Responsible.filter({ clinic_id: clinicId }, 'name') : [],
    enabled: !!clinicId,
  });

  const { data: systemUsers = [] } = useQuery({
    queryKey: ['clinicUsers', clinicId],
    queryFn: () => clinicId ? base44.entities.User.filter({ clinic_id: clinicId }) : [],
    enabled: !!clinicId,
  });

  // Combined list for responsible selector
  const allAssignees = useMemo(() => {
    const activeResponsibles = responsibles.filter(r => r.is_active);
    const userEmails = activeResponsibles.map(r => r.email).filter(Boolean);
    return [
      ...activeResponsibles.map(r => ({ id: r.id, name: r.name, type: 'responsible' })),
      ...systemUsers
        .filter(u => !userEmails.includes(u.email))
        .map(u => ({ id: `user_${u.id}`, name: u.full_name || u.email, type: 'user' }))
    ];
  }, [responsibles, systemUsers]);

  // Separate parent tasks and subtasks
  const parentTasks = useMemo(() => tasks.filter(t => !t.parent_task_id), [tasks]);
  const subtasksByParent = useMemo(() => {
    const map = {};
    tasks.filter(t => t.parent_task_id).forEach(t => {
      if (!map[t.parent_task_id]) map[t.parent_task_id] = [];
      map[t.parent_task_id].push(t);
    });
    return map;
  }, [tasks]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return parentTasks.filter(t => {
      if (filterPatient && t.patient_id !== filterPatient) return false;
      if (filterResponsible && t.assigned_to !== filterResponsible) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      return true;
    });
  }, [parentTasks, filterPatient, filterResponsible, filterStatus]);

  // Group by status for list view
  const grouped = useMemo(() => ({
    pendiente: filteredTasks.filter(t => t.status === 'pendiente'),
    en_progreso: filteredTasks.filter(t => t.status === 'en_progreso'),
    completada: filteredTasks.filter(t => t.status === 'completada'),
    cancelada: filteredTasks.filter(t => t.status === 'cancelada'),
  }), [filteredTasks]);

  const handleSaveTask = async (data) => {
    if (editingTask?.id) {
      await base44.entities.Task.update(editingTask.id, data);
      toast({ title: 'Tarea actualizada', duration: 2000 });
    } else {
      await base44.entities.Task.create({ ...data, clinic_id: clinicId });
      toast({ title: 'Tarea creada', duration: 2000 });
    }
    queryClient.invalidateQueries({ queryKey: ['tasks', clinicId] });
    setShowForm(false);
    setEditingTask(null);
  };

  const handleComplete = async (task) => {
    await base44.entities.Task.update(task.id, {
      status: 'completada',
      completed_date: new Date().toISOString()
    });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast({ title: 'Tarea completada', duration: 2000 });
  };

  const handleDelete = async (task) => {
    if (!confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
    await base44.entities.Task.delete(task.id);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast({ title: 'Tarea eliminada', duration: 2000 });
  };

  const toggleExpand = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const pendingCount = tasks.filter(t => t.status === 'pendiente' || t.status === 'en_progreso').length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Tareas
              {pendingCount > 0 && (
                <Badge className="bg-blue-600 text-white text-xs">{pendingCount}</Badge>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Gestión de tareas y recordatorios</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border bg-white overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <CalendarDays className="w-4 h-4" />
                Calendario
              </button>
            </div>
            <Button onClick={() => { setEditingTask(null); setShowForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva tarea
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          <Filter className="w-4 h-4 text-gray-400 mt-2" />
          <Select value={filterPatient} onValueChange={setFilterPatient}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Todos los pacientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos los pacientes</SelectItem>
              {patients.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterResponsible} onValueChange={setFilterResponsible}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Todos los responsables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos los responsables</SelectItem>
              {responsibles.filter(r => r.is_active).map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_progreso">En progreso</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>

          {(filterPatient || filterResponsible || filterStatus) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterPatient(''); setFilterResponsible(''); setFilterStatus(''); }}>
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <TaskForm
            task={editingTask}
            patients={patients}
            responsibles={responsibles.filter(r => r.is_active)}
            systemUsers={systemUsers}
            tasks={parentTasks}
            onSave={handleSaveTask}
            onCancel={() => { setShowForm(false); setEditingTask(null); }}
          />
        )}

        {/* Content */}
        {viewMode === 'calendar' ? (
          <TaskCalendarView
            tasks={filteredTasks}
            subtasksByParent={subtasksByParent}
            onEdit={(task) => { setEditingTask(task); setShowForm(true); }}
            onComplete={handleComplete}
          />
        ) : (
          <div className="space-y-6">
            {/* Pending & In Progress */}
            {['pendiente', 'en_progreso'].map(status => (
              grouped[status].length > 0 && (
                <div key={status}>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    {status === 'pendiente' ? <Clock className="w-4 h-4 text-yellow-500" /> : <AlertCircle className="w-4 h-4 text-blue-500" />}
                    {status === 'pendiente' ? 'Pendientes' : 'En progreso'}
                    <Badge variant="secondary">{grouped[status].length}</Badge>
                  </h2>
                  <div className="space-y-2">
                    {grouped[status].map(task => (
                      <div key={task.id}>
                        <TaskCard
                          task={task}
                          subtasks={subtasksByParent[task.id] || []}
                          expanded={expandedTasks[task.id]}
                          onToggleExpand={() => toggleExpand(task.id)}
                          onEdit={() => { setEditingTask(task); setShowForm(true); }}
                          onComplete={handleComplete}
                          onDelete={handleDelete}
                          onAddSubtask={() => {
                            setEditingTask({ parent_task_id: task.id, patient_id: task.patient_id, patient_name: task.patient_name });
                            setShowForm(true);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}

            {/* Completed */}
            {grouped['completada'].length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Completadas
                  <Badge variant="secondary">{grouped['completada'].length}</Badge>
                </h2>
                <div className="space-y-2 opacity-70">
                  {grouped['completada'].slice(0, 10).map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      subtasks={subtasksByParent[task.id] || []}
                      expanded={expandedTasks[task.id]}
                      onToggleExpand={() => toggleExpand(task.id)}
                      onEdit={() => { setEditingTask(task); setShowForm(true); }}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                      onAddSubtask={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredTasks.length === 0 && !showForm && (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No hay tareas</p>
                <p className="text-sm text-gray-400 mt-1">Crea la primera tarea con el botón superior</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}