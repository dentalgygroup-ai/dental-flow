import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Check, X, UserRound, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { TREATMENTS } from './constants';

export default function DoctorManager({ clinicId }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', specialties: [] });

  const { data: doctors = [], refetch } = useQuery({
    queryKey: ['doctors', clinicId],
    queryFn: () => clinicId ? base44.entities.Doctor.filter({ clinic_id: clinicId }, 'name') : [],
    enabled: !!clinicId,
  });

  const resetForm = () => {
    setFormData({ name: '', specialties: [] });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSpecialtyToggle = (treatmentId) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(treatmentId)
        ? prev.specialties.filter(s => s !== treatmentId)
        : [...prev.specialties, treatmentId]
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }
    if (editingId) {
      await base44.entities.Doctor.update(editingId, {
        name: formData.name.trim(),
        specialties: formData.specialties
      });
      toast({ title: 'Doctor actualizado', duration: 2000 });
    } else {
      await base44.entities.Doctor.create({
        clinic_id: clinicId,
        name: formData.name.trim(),
        specialties: formData.specialties,
        is_active: true
      });
      toast({ title: 'Doctor creado', duration: 2000 });
    }
    refetch();
    resetForm();
  };

  const handleEdit = (doctor) => {
    setEditingId(doctor.id);
    setFormData({ name: doctor.name, specialties: doctor.specialties || [] });
    setShowForm(true);
  };

  const handleToggleActive = async (doctor) => {
    await base44.entities.Doctor.update(doctor.id, { is_active: !doctor.is_active });
    toast({ title: doctor.is_active ? 'Doctor desactivado' : 'Doctor reactivado', duration: 2000 });
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              Gestión de Doctores
            </CardTitle>
            <CardDescription>Añade y gestiona los doctores de la clínica con sus especialidades</CardDescription>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo doctor
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form */}
        {showForm && (
          <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Nombre del doctor *</Label>
              <Input
                placeholder="Ej: Dr. García López"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Especialidades</Label>
              <div className="flex flex-wrap gap-2">
                {TREATMENTS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSpecialtyToggle(t.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      formData.specialties.includes(t.id)
                        ? t.color + ' ring-2 ring-offset-1 ring-gray-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} className="gap-1">
                <Check className="w-4 h-4" />
                {editingId ? 'Actualizar' : 'Crear'}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                <X className="w-4 h-4" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {doctors.length === 0 && !showForm ? (
          <p className="text-sm text-gray-400 text-center py-6">No hay doctores registrados aún</p>
        ) : (
          <div className="space-y-2">
            {doctors.map(doctor => (
              <div
                key={doctor.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${doctor.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserRound className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doctor.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(doctor.specialties || []).length === 0 ? (
                        <span className="text-xs text-gray-400">Sin especialidad asignada</span>
                      ) : (
                        (doctor.specialties || []).map(sid => {
                          const t = TREATMENTS.find(t => t.id === sid);
                          return t ? (
                            <Badge key={sid} className={`text-xs px-2 py-0 ${t.color}`}>{t.label}</Badge>
                          ) : null;
                        })
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(doctor)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleActive(doctor)}
                    className={doctor.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}
                  >
                    {doctor.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}