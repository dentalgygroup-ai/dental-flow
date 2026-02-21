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
import { REJECTION_REASONS, STATE_REQUIREMENTS, getStateById, formatCurrency } from './constants';

export default function StatusChangeModal({ 
  isOpen, 
  onClose, 
  patient, 
  targetStatus,
  onConfirm 
}) {
  const [formData, setFormData] = useState({
    budget_amount: patient?.budget_amount || '',
    rejection_reason: patient?.rejection_reason || ''
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        budget_amount: patient.budget_amount || '',
        rejection_reason: patient.rejection_reason || ''
      });
    }
  }, [patient]);

  if (!patient || !targetStatus) return null;

  const requirements = STATE_REQUIREMENTS[targetStatus];
  const targetState = getStateById(targetStatus);

  const needsBudget = requirements?.requiresBudget && (!patient.budget_amount || patient.budget_amount <= 0);
  const needsRejectionReason = requirements?.requiresRejectionReason && !patient.rejection_reason;

  const canProceed = () => {
    if (needsBudget && (!formData.budget_amount || parseFloat(formData.budget_amount) <= 0)) {
      return false;
    }
    if (needsRejectionReason && !formData.rejection_reason) {
      return false;
    }
    return true;
  };

  const handleConfirm = () => {
    const updates = {};
    if (needsBudget) {
      updates.budget_amount = parseFloat(formData.budget_amount);
    }
    if (needsRejectionReason) {
      updates.rejection_reason = formData.rejection_reason;
    }
    onConfirm(updates);
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
            Para mover a "{targetState?.label}" se requiere completar la siguiente información:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {needsBudget && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Importe del presupuesto *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.budget_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget_amount: e.target.value }))}
                  placeholder="0.00"
                  className="flex-1"
                />
                <span className="flex items-center px-3 bg-gray-100 rounded-md text-sm text-gray-600">
                  EUR
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {requirements?.message}
              </p>
            </div>
          )}

          {needsRejectionReason && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Motivo de rechazo *</Label>
              <Select
                value={formData.rejection_reason}
                onValueChange={(value) => setFormData(prev => ({ ...prev, rejection_reason: value }))}
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
              <p className="text-xs text-gray-500">
                {requirements?.message}
              </p>
            </div>
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