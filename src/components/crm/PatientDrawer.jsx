import React, { useState, useEffect } from 'react';
import { 
  X, Phone, Mail, Calendar, Clock, User, FileText, 
  History, Bell, Save, Plus, Check, AlertCircle, CreditCard
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { 
  PIPELINE_STATES, TREATMENTS, SOURCES, PATIENT_TYPES, 
  ACTION_TYPES, REJECTION_REASONS,
  formatCurrency, formatDateTime, getStateById, getTreatmentById,
  getActionTypeById, getPatientTypeById, getSourceById, getRejectionReasonById
} from './constants';

export default function PatientDrawer({ 
  patient, 
  onClose, 
  onSave, 
  onAddAction,
  actions = [],
  users = [],
  systemUsers = [],
  doctors = [],
  patientTasks = [],
  onTasksChange,
  permissions,
  isLoading = false
}) {
  const [formData, setFormData] = useState(patient || {});
  const [activeTab, setActiveTab] = useState('resumen');
  const [newAction, setNewAction] = useState({ action_type: '', description: '' });
  const [showNewAction, setShowNewAction] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [nextActionAssignedTo, setNextActionAssignedTo] = useState('');
  const [nextActionAssignedToName, setNextActionAssignedToName] = useState('');

  // Combined list of all possible assignees (responsibles + system users)
  const allAssignees = [
    ...users.map(r => ({ id: r.id, name: r.name, type: 'responsible' })),
    ...systemUsers
      .filter(u => !users.some(r => r.email === u.email))
      .map(u => ({ id: `user_${u.id}`, name: u.full_name || u.email, type: 'user' }))
  ];

  useEffect(() => {
    setFormData(patient || {});
    setValidationError('');
    setNextActionAssignedTo('');
    setNextActionAssignedToName('');
  }, [patient]);

  if (!patient) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationError('');
  };

  const handleTreatmentToggle = (treatmentId) => {
    const current = formData.treatments || [];
    const updated = current.includes(treatmentId)
      ? current.filter(t => t !== treatmentId)
      : [...current, treatmentId];
    handleChange('treatments', updated);
  };

  const handleStatusChange = (newStatus) => {
    handleChange('status', newStatus);
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleAddAction = () => {
    if (!newAction.action_type) return;
    onAddAction({
      ...newAction,
      patient_id: patient.id
    });
    setNewAction({ action_type: '', description: '' });
    setShowNewAction(false);
  };

  // Creates a Task from "Próxima acción" fields and syncs back to patient
  const handleCreateNextActionTask = async () => {
    if (!formData.next_action_type || !formData.next_action_date) return;
    const task = await base44.entities.Task.create({
      title: `${getActionTypeById(formData.next_action_type)?.label || formData.next_action_type} - ${patient.first_name} ${patient.last_name}`,
      description: formData.next_action_notes || '',
      task_type: formData.next_action_type,
      patient_id: patient.id,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      assigned_to: nextActionAssignedTo || null,
      assigned_to_name: nextActionAssignedToName || null,
      due_date: formData.next_action_date,
      status: 'pendiente',
      priority: 'media',
      notes: formData.next_action_notes || ''
    });
    if (onTasksChange) onTasksChange();
  };

  // Mark the linked task as completed
  const handleCompleteNextAction = async () => {
    // Find the linked pending task
    const linkedTask = patientTasks.find(
      t => t.status !== 'completada' && t.status !== 'cancelada' && t.task_type === formData.next_action_type
    );
    if (linkedTask) {
      await base44.entities.Task.update(linkedTask.id, {
        status: 'completada',
        completed_date: new Date().toISOString()
      });
    }
    onAddAction({
      patient_id: patient.id,
      action_type: formData.next_action_type,
      description: `Acción completada: ${formData.next_action_notes || ''}`
    });
    handleChange('next_action_type', null);
    handleChange('next_action_date', null);
    handleChange('next_action_notes', '');
    handleChange('last_action_date', new Date().toISOString());
    setNextActionAssignedTo('');
    setNextActionAssignedToName('');
    if (onTasksChange) onTasksChange();
  };

  const currentState = getStateById(formData.status);
  const canEdit = permissions?.canEdit;
  const canEditBudget = permissions?.canEditBudget;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h2>
            <Badge className={`${currentState?.color} mt-1`}>
              {currentState?.label}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 p-4 border-b bg-white">
          <a href={`tel:${patient.phone}`} className="flex-1">
            <Button variant="outline" className="w-full gap-2" size="sm">
              <Phone className="w-4 h-4" />
              Llamar
            </Button>
          </a>
          <a href={`mailto:${patient.email}`} className="flex-1">
            <Button variant="outline" className="w-full gap-2" size="sm">
              <Mail className="w-4 h-4" />
              Email
            </Button>
          </a>
        </div>

        {/* Validation error */}
        {validationError && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{validationError}</div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-4 grid grid-cols-4 h-10">
            <TabsTrigger value="resumen" className="text-xs">
              <FileText className="w-4 h-4 mr-1" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="acciones" className="text-xs">
              <History className="w-4 h-4 mr-1" />
              Acciones
            </TabsTrigger>
            <TabsTrigger value="proxima" className="text-xs">
              <Bell className="w-4 h-4 mr-1" />
              Próxima
            </TabsTrigger>
            <TabsTrigger value="notas" className="text-xs">
              <FileText className="w-4 h-4 mr-1" />
              Notas
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Resumen Tab */}
            <TabsContent value="resumen" className="mt-0 space-y-4">
              {/* Contact info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Nombre</Label>
                  <Input
                    value={formData.first_name || ''}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Apellidos</Label>
                  <Input
                    value={formData.last_name || ''}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Teléfono</Label>
                  <Input
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Email</Label>
                  <Input
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={handleStatusChange}
                  disabled={!permissions?.canMove}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STATES.map(state => (
                      <SelectItem key={state.id} value={state.id}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rejection reason - only show if rejected */}
              {formData.status === 'rechazado' && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Motivo de rechazo *</Label>
                  <Select
                    value={formData.rejection_reason || ''}
                    onValueChange={(value) => handleChange('rejection_reason', value)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {REJECTION_REASONS.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Responsible */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Responsable</Label>
                <Select
                  value={formData.assigned_to || ''}
                  onValueChange={(value) => {
                    const resp = users.find(u => u.id === value);
                    handleChange('assigned_to', value);
                    handleChange('assigned_to_name', resp?.name || '');
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Asignar responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(resp => (
                      <SelectItem key={resp.id} value={resp.id}>
                        {resp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Doctor — visible desde cita_agendada en adelante */}
              {['cita_agendada','cita_realizada','presupuesto_entregado','en_negociacion','aceptado_pendiente_pago','pagado','pendiente_cita','citado','en_tratamiento'].includes(formData.status) && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Doctor/a asignado/a</Label>
                  <Select
                    value={formData.doctor_id || ''}
                    onValueChange={(value) => {
                      const doc = doctors.find(d => d.id === value);
                      handleChange('doctor_id', value || null);
                      handleChange('doctor_name', doc?.name || '');
                    }}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Asignar doctor/a" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sin asignar</SelectItem>
                      {doctors.filter(d => d.is_active).map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Treatments */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Tratamientos</Label>
                <div className="flex flex-wrap gap-2">
                  {TREATMENTS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => canEdit && handleTreatmentToggle(t.id)}
                      disabled={!canEdit}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        (formData.treatments || []).includes(t.id)
                          ? t.color + ' ring-2 ring-offset-1 ring-gray-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Presupuesto</Label>
                  <Input
                    type="number"
                    value={formData.budget_amount || ''}
                    onChange={(e) => handleChange('budget_amount', parseFloat(e.target.value) || null)}
                    disabled={!canEditBudget}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Moneda</Label>
                  <Select
                    value={formData.budget_currency || 'EUR'}
                    onValueChange={(value) => handleChange('budget_currency', value)}
                    disabled={!canEditBudget}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Financiación — solo visible en estados aceptado/pagado */}
              {['aceptado_pendiente_pago', 'pagado', 'pendiente_cita', 'citado', 'en_tratamiento'].includes(formData.status) && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="financia_tratamiento"
                      checked={!!formData.financia_tratamiento}
                      onCheckedChange={(checked) => {
                        handleChange('financia_tratamiento', !!checked);
                        if (!checked) handleChange('gastos_financieros', null);
                      }}
                      disabled={!canEditBudget}
                    />
                    <Label htmlFor="financia_tratamiento" className="flex items-center gap-2 text-sm font-medium text-blue-800 cursor-pointer">
                      <CreditCard className="w-4 h-4" />
                      El paciente financia el tratamiento
                    </Label>
                  </div>
                  {formData.financia_tratamiento && (
                    <div className="space-y-1 pl-7">
                      <Label className="text-xs text-gray-500">Gastos financieros (€)</Label>
                      <Input
                        type="number"
                        value={formData.gastos_financieros || ''}
                        onChange={(e) => handleChange('gastos_financieros', parseFloat(e.target.value) || null)}
                        disabled={!canEditBudget}
                        placeholder="0.00"
                        className="w-40"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Patient Type and Source */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Tipo de paciente</Label>
                  <Select
                    value={formData.patient_type || 'primera_visita'}
                    onValueChange={(value) => handleChange('patient_type', value)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PATIENT_TYPES.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Fuente</Label>
                  <Select
                    value={formData.source || ''}
                    onValueChange={(value) => handleChange('source', value)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="acciones" className="mt-0 space-y-4">
              {canEdit && (
                <div className="space-y-3">
                  {!showNewAction ? (
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={() => setShowNewAction(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Añadir acción
                    </Button>
                  ) : (
                    <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                      <Select
                        value={newAction.action_type}
                        onValueChange={(value) => setNewAction(prev => ({ ...prev, action_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo de acción" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder="Descripción de la acción..."
                        value={newAction.description}
                        onChange={(e) => setNewAction(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddAction} disabled={!newAction.action_type}>
                          <Check className="w-4 h-4 mr-1" />
                          Guardar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowNewAction(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions timeline */}
              <div className="space-y-3">
                {actions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No hay acciones registradas
                  </p>
                ) : (
                  actions.map((action, index) => {
                    const actionType = getActionTypeById(action.action_type);
                    return (
                      <div key={action.id || index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border">
                          <History className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{actionType?.label || action.action_type}</span>
                            {action.old_value && action.new_value && (
                              <span className="text-xs text-gray-500">
                                {action.old_value} → {action.new_value}
                              </span>
                            )}
                          </div>
                          {action.description && (
                            <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span>{action.performed_by_name || action.performed_by}</span>
                            <span>•</span>
                            <span>{formatDateTime(action.created_date)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* Next Action Tab */}
            <TabsContent value="proxima" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Tipo de acción</Label>
                <Select
                  value={formData.next_action_type || ''}
                  onValueChange={(value) => handleChange('next_action_type', value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Fecha y hora</Label>
                <Input
                  type="datetime-local"
                  value={formData.next_action_date ? new Date(formData.next_action_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('next_action_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Responsable asignado</Label>
                <Select
                  value={nextActionAssignedTo || ''}
                  onValueChange={(value) => {
                    const found = allAssignees.find(a => a.id === value);
                    setNextActionAssignedTo(value);
                    setNextActionAssignedToName(found?.name || '');
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    {allAssignees.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Notas</Label>
                <Textarea
                  value={formData.next_action_notes || ''}
                  onChange={(e) => handleChange('next_action_notes', e.target.value)}
                  disabled={!canEdit}
                  rows={3}
                  placeholder="Notas sobre la próxima acción..."
                />
              </div>

              {canEdit && formData.next_action_type && formData.next_action_date && (
                <div className="space-y-2">
                  <Button 
                    variant="outline"
                    className="w-full gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={handleCreateNextActionTask}
                  >
                    <Plus className="w-4 h-4" />
                    Guardar como tarea
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={handleCompleteNextAction}
                  >
                    <Check className="w-4 h-4" />
                    Marcar como completada
                  </Button>
                </div>
              )}

              {/* Tareas vinculadas a este paciente */}
              {patientTasks.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Tareas del paciente</p>
                  <div className="space-y-2">
                    {patientTasks.slice(0, 5).map(task => (
                      <div key={task.id} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                        task.status === 'completada' ? 'bg-green-50' : 
                        task.status === 'cancelada' ? 'bg-gray-50' : 'bg-yellow-50'
                      }`}>
                        <div className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${
                          task.status === 'completada' ? 'bg-green-500' :
                          task.status === 'cancelada' ? 'bg-gray-400' : 'bg-yellow-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{task.title}</p>
                          <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                            {task.assigned_to_name && <span>{task.assigned_to_name}</span>}
                            {task.due_date && <span>· {new Date(task.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notas" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Observaciones internas</Label>
                <Textarea
                  value={formData.internal_notes || ''}
                  onChange={(e) => handleChange('internal_notes', e.target.value)}
                  disabled={!canEdit}
                  rows={10}
                  placeholder="Notas internas sobre el paciente..."
                  className="resize-none"
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer with save button */}
        {canEdit && (
          <div className="p-4 border-t bg-gray-50">
            <Button 
              className="w-full gap-2" 
              onClick={handleSave}
              disabled={isLoading}
            >
              <Save className="w-4 h-4" />
              Guardar cambios
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}