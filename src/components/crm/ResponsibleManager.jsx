import React, { useState } from 'react';
import { UserPlus, Pencil, UserX, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';

export default function ResponsibleManager({ clinicId }) {
  const { toast } = useToast();

  const { data: responsibles = [], refetch } = useQuery({
    queryKey: ['responsibles', clinicId],
    queryFn: () => clinicId ? base44.entities.Responsible.filter({ clinic_id: clinicId }, 'name') : [],
    enabled: !!clinicId,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

  // Deactivate flow
  const [deactivateModal, setDeactivateModal] = useState({ open: false, responsible: null });
  const [reassignTo, setReassignTo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const activeResponsibles = responsibles.filter(r => r.is_active);

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    if (editingId) {
      await base44.entities.Responsible.update(editingId, formData);
      toast({ title: 'Responsable actualizado', duration: 2000 });
    } else {
      await base44.entities.Responsible.create({ ...formData, clinic_id: clinicId, is_active: true });
      toast({ title: 'Responsable creado', duration: 2000 });
    }
    await refetch();
    setIsProcessing(false);
    resetForm();
  };

  const handleEdit = (responsible) => {
    setFormData({ name: responsible.name, email: responsible.email || '', phone: responsible.phone || '' });
    setEditingId(responsible.id);
    setShowForm(true);
  };

  const handleDeactivateRequest = (responsible) => {
    setDeactivateModal({ open: true, responsible });
    setReassignTo('');
  };

  const handleDeactivateConfirm = async () => {
    const { responsible } = deactivateModal;
    setIsProcessing(true);

    // Reassign all patients of this responsible to the new one
    const newResp = responsibles.find(r => r.id === reassignTo);
    if (reassignTo && newResp) {
      const patients = await base44.entities.Patient.filter({ assigned_to: responsible.id });
      for (const patient of patients) {
        await base44.entities.Patient.update(patient.id, {
          assigned_to: newResp.id,
          assigned_to_name: newResp.name
        });
      }
    }

    await base44.entities.Responsible.update(responsible.id, { is_active: false });

    toast({
      title: 'Responsable dado de baja',
      description: reassignTo && newResp
        ? `Sus clientes han sido reasignados a ${newResp.name}`
        : 'Sin reasignación de clientes',
      duration: 3000
    });

    await refetch();
    setIsProcessing(false);
    setDeactivateModal({ open: false, responsible: null });
    setReassignTo('');
  };

  const handleReactivate = async (responsible) => {
    await base44.entities.Responsible.update(responsible.id, { is_active: true });
    await refetch();
    toast({ title: 'Responsable reactivado', duration: 2000 });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Responsables</CardTitle>
              <CardDescription>
                Gestiona los responsables comerciales asignables a pacientes
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => { resetForm(); setShowForm(true); }}>
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo responsable
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                {editingId ? 'Editar responsable' : 'Nuevo responsable'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs mb-1">Nombre *</Label>
                  <Input
                    placeholder="Nombre completo"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1">Email</Label>
                  <Input
                    type="email"
                    placeholder="email@clinica.com"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1">Teléfono</Label>
                  <Input
                    placeholder="+34 600 000 000"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={isProcessing}>
                  <Check className="w-4 h-4 mr-1" />
                  {isProcessing ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="divide-y">
            {responsibles.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">No hay responsables creados</p>
            )}
            {responsibles.map(r => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                    {r.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{r.name}</p>
                    {(r.email || r.phone) && (
                      <p className="text-xs text-gray-500 truncate">{r.email}{r.email && r.phone ? ' · ' : ''}{r.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                    {r.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                  {r.is_active ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(r)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeactivateRequest(r)}>
                        <UserX className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-green-600" onClick={() => handleReactivate(r)}>
                      Reactivar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deactivate confirmation dialog */}
      <Dialog open={deactivateModal.open} onOpenChange={open => !open && setDeactivateModal({ open: false, responsible: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="w-5 h-5" />
              Dar de baja responsable
            </DialogTitle>
            <DialogDescription>
              Vas a dar de baja a <strong>{deactivateModal.responsible?.name}</strong>. ¿A qué responsable se reasignan sus clientes?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Label>Reasignar clientes a:</Label>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar responsable (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {activeResponsibles
                  .filter(r => r.id !== deactivateModal.responsible?.id)
                  .map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Si no seleccionas ninguno, los clientes quedarán sin responsable asignado.
            </p>
          </div>

          <div className="flex gap-3 border-t pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeactivateModal({ open: false, responsible: null })}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeactivateConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? 'Procesando...' : 'Dar de baja'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}