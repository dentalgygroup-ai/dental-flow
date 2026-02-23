import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { STATE_REQUIREMENTS, REJECTION_REASONS, getStateById } from './constants';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function StatusChangeModal({
  isOpen,
  onClose,
  patient,
  targetStatus,
  onConfirm
}) {
  const [formData, setFormData] = useState({});

  const { data: systemConfig = [] } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: () => base44.entities.SystemConfig.list()
  });

  const treatmentOptions = systemConfig.filter(c => c.config_type === 'treatment' && c.is_active);
  const rejectionOptions = systemConfig.filter(c => c.config_type === 'rejection_reason' && c.is_active);

  useEffect(() => {
    if (patient && targetStatus) {
      setFormData({});
    }
  }, [patient, targetStatus]);

  if (!patient || !targetStatus) return null;

  const requirements = STATE_REQUIREMENTS[targetStatus];
  const targetState = getStateById(targetStatus);

  // Determine which fields are needed (not already filled, or always collect for this transition)
  const fields = requirements?.fields || [];

  const canProceed = () => {
    return fields.every(field => {
      if (!field.required) return true;
      const val = formData[field.key];
      if (field.type === 'treatments') {
        return val && val.length > 0;
      }
      return val !== undefined && val !== '' && val !== null;
    });
  };

  const handleToggleTreatment = (treatmentValue) => {
    setFormData(prev => {
      const current = prev.treatments || [];
      return {
        ...prev,
        treatments: current.includes(treatmentValue)
          ? current.filter(t => t !== treatmentValue)
          : [...current, treatmentValue]
      };
    });
  };

  const handleConfirm = () => {
    onConfirm(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Información requerida
          </DialogTitle>
          <DialogDescription>
            Para mover a <strong>"{targetState?.label}"</strong> completa la siguiente información:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {fields.map(field => (
            <div key={field.key} className="space-y-2">
              <Label className="text-sm font-medium">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>

              {field.type === 'datetime' && (
                <Input
                  type="datetime-local"
                  value={formData[field.key] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                />
              )}

              {field.type === 'number' && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData[field.key] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) }))}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <span className="flex items-center px-3 bg-gray-100 rounded-md text-sm text-gray-600">EUR</span>
                </div>
              )}

              {field.type === 'treatments' && (
                <div className="flex flex-wrap gap-2">
                  {treatmentOptions.map(t => {
                    const selected = (formData.treatments || []).includes(t.value);
                    return (
                      <Badge
                        key={t.value}
                        onClick={() => handleToggleTreatment(t.value)}
                        className={`cursor-pointer select-none ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {t.label}
                      </Badge>
                    );
                  })}
                  {treatmentOptions.length === 0 && (
                    <p className="text-xs text-gray-400">No hay tratamientos configurados</p>
                  )}
                </div>
              )}

              {field.type === 'rejection_reason' && (
                <Select
                  value={formData[field.key] || ''}
                  onValueChange={value => setFormData(prev => ({ ...prev, [field.key]: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {rejectionOptions.length > 0
                      ? rejectionOptions.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))
                      : REJECTION_REASONS.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}

          {requirements?.message && (
            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">{requirements.message}</p>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canProceed()}
            className="flex-1"
          >
            Confirmar cambio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}