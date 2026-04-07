import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';
import { formatCurrency } from './constants';

export default function AcceptBudgetModal({ isOpen, onClose, patient, onConfirm }) {
  const [importe, setImporte] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && patient) {
      setImporte(patient.budget_amount != null ? String(patient.budget_amount) : '');
    }
  }, [isOpen, patient]);

  const handleConfirm = async () => {
    const importeNum = parseFloat(importe);
    if (!importe || isNaN(importeNum)) return;
    setLoading(true);
    await onConfirm({ importe_aceptado: importeNum });
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Aceptar presupuesto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {patient?.budget_amount != null && (
            <p className="text-sm text-gray-500">
              Presupuesto original: <span className="font-semibold text-gray-800">{formatCurrency(patient.budget_amount, patient.budget_currency)}</span>
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">Importe aceptado</Label>
            <Input
              type="number"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>

          <p className="text-xs text-gray-400">
            → El estado se asignará automáticamente según los pagos registrados.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!importe || isNaN(parseFloat(importe)) || loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? 'Guardando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}