import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TREATMENTS, SOURCES, PATIENT_TYPES } from './constants';

export default function NewPatientModal({ 
  isOpen, 
  onClose, 
  onSave, 
  users = [],
  currentUser
}) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    treatments: [],
    source: '',
    priority: 'media',
    assigned_to: currentUser?.email || '',
    assigned_to_name: currentUser?.full_name || '',
    status: 'nuevo_paciente'
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleTreatmentToggle = (treatmentId) => {
    const current = formData.treatments || [];
    const updated = current.includes(treatmentId)
      ? current.filter(t => t !== treatmentId)
      : [...current, treatmentId];
    handleChange('treatments', updated);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name?.trim()) newErrors.first_name = 'Nombre obligatorio';
    if (!formData.last_name?.trim()) newErrors.last_name = 'Apellidos obligatorios';
    if (!formData.phone?.trim()) newErrors.phone = 'Teléfono obligatorio';
    if (!formData.email?.trim()) newErrors.email = 'Email obligatorio';
    if (!formData.treatments?.length) newErrors.treatments = 'Selecciona al menos un tratamiento';
    if (!formData.assigned_to) newErrors.assigned_to = 'Asigna un responsable';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave(formData);
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      treatments: [],
      source: '',
      priority: 'media',
      assigned_to: currentUser?.email || '',
      assigned_to_name: currentUser?.full_name || '',
      status: 'nuevo_paciente'
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo paciente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Nombre *</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                className={errors.first_name ? 'border-red-500' : ''}
                placeholder="Nombre"
              />
              {errors.first_name && (
                <p className="text-xs text-red-500">{errors.first_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Apellidos *</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                className={errors.last_name ? 'border-red-500' : ''}
                placeholder="Apellidos"
              />
              {errors.last_name && (
                <p className="text-xs text-red-500">{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* Contact fields */}
          <div className="space-y-2">
            <Label className="text-sm">Teléfono *</Label>
            <Input
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={errors.phone ? 'border-red-500' : ''}
              placeholder="+34 600 000 000"
            />
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
              placeholder="email@ejemplo.com"
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Treatments */}
          <div className="space-y-2">
            <Label className="text-sm">Tratamientos *</Label>
            <div className="flex flex-wrap gap-2">
              {TREATMENTS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTreatmentToggle(t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    formData.treatments.includes(t.id)
                      ? t.color + ' ring-2 ring-offset-1 ring-gray-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {errors.treatments && (
              <p className="text-xs text-red-500">{errors.treatments}</p>
            )}
          </div>

          {/* Responsible */}
          <div className="space-y-2">
            <Label className="text-sm">Responsable *</Label>
            <Select
              value={formData.assigned_to}
              onValueChange={(value) => {
                const user = users.find(u => u.email === value);
                handleChange('assigned_to', value);
                handleChange('assigned_to_name', user?.full_name || '');
              }}
            >
              <SelectTrigger className={errors.assigned_to ? 'border-red-500' : ''}>
                <SelectValue placeholder="Seleccionar responsable" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.email} value={user.email}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assigned_to && (
              <p className="text-xs text-red-500">{errors.assigned_to}</p>
            )}
          </div>

          {/* Source and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Fuente</Label>
              <Select
                value={formData.source || 'none'}
                onValueChange={(value) => handleChange('source', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {SOURCES.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Crear paciente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}