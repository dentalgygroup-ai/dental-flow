import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TaskForm({ task, patients, responsibles, systemUsers = [], tasks, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    patient_id: '',
    patient_name: '',
    assigned_to: '',
    assigned_to_name: '',
    task_type: 'llamada',
    status: 'pendiente',
    priority: 'media',
    due_date: '',
    notes: '',
    parent_task_id: '',
  });

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        patient_id: task.patient_id || '',
        patient_name: task.patient_name || '',
        assigned_to: task.assigned_to || '',
        assigned_to_name: task.assigned_to_name || '',
        task_type: task.task_type || 'llamada',
        status: task.status || 'pendiente',
        priority: task.priority || 'media',
        due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
        notes: task.notes || '',
        parent_task_id: task.parent_task_id || '',
      });
    }
  }, [task]);

  const isSubtask = !!form.parent_task_id;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePatientChange = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    setForm(prev => ({
      ...prev,
      patient_id: patientId,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : ''
    }));
  };

  const handleResponsibleChange = (respId) => {
    const resp = responsibles.find(r => r.id === respId);
    setForm(prev => ({
      ...prev,
      assigned_to: respId,
      assigned_to_name: resp ? resp.name : ''
    }));
  };

  const handleSubmit = () => {
    if (!form.title) return;
    const data = {
      ...form,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      parent_task_id: form.parent_task_id || null,
      patient_id: form.patient_id || null,
      patient_name: form.patient_name || null,
      assigned_to: form.assigned_to || null,
      assigned_to_name: form.assigned_to_name || null,
    };
    onSave(data);
  };

  return (
    <Card className="border-blue-200 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {task?.id ? 'Editar tarea' : isSubtask ? 'Nueva subtarea' : 'Nueva tarea'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Parent task selector */}
        {!task?.id && (
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Tarea padre (opcional, para subtarea)</Label>
            <Select value={form.parent_task_id} onValueChange={(v) => handleChange('parent_task_id', v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin tarea padre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin tarea padre</SelectItem>
                {tasks.filter(t => !t.parent_task_id).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Título *</Label>
          <Input
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Título de la tarea..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Tipo</Label>
            <Select value={form.task_type} onValueChange={(v) => handleChange('task_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['llamada', 'whatsapp', 'email', 'cita', 'seguimiento', 'recordatorio', 'otro'].map(t => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Prioridad</Label>
            <Select value={form.priority} onValueChange={(v) => handleChange('priority', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Estado</Label>
            <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_progreso">En progreso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Fecha límite</Label>
            <Input
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Paciente relacionado</Label>
          <Select value={form.patient_id} onValueChange={handlePatientChange}>
            <SelectTrigger>
              <SelectValue placeholder="Ningún paciente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Ningún paciente</SelectItem>
              {patients.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Responsable</Label>
          <Select value={form.assigned_to} onValueChange={handleResponsibleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sin asignar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Sin asignar</SelectItem>
              {responsibles.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Notas</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Notas adicionales..."
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button onClick={handleSubmit} disabled={!form.title} className="flex-1 gap-2">
            <Save className="w-4 h-4" />
            {task?.id ? 'Actualizar' : 'Crear tarea'}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );
}